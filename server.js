import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  signSession,
  verifySession,
  verifyPassword,
  hashPassword,
  stripDangerousKeys,
  buildAuditLog,
  parseOrigins,
} from './server/security.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IS_PROD = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
const PORT = process.env.PORT || 3001;

// ── Secrets: only ever from the environment ─────────────────────
const BASE_URI = process.env.MONGODB_URI;
if (!BASE_URI) console.error('CRITICAL: MONGODB_URI is not set. Database endpoints will return 503.');

let SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  if (IS_PROD) throw new Error('SESSION_SECRET (≥32 chars) must be set in production.');
  SESSION_SECRET = crypto.randomBytes(48).toString('hex');
  console.warn('WARNING: SESSION_SECRET not set — using a random dev secret (sessions reset on restart).');
}

// ── Database ────────────────────────────────────────────────────
// Treat any {$…} object inside a query filter as a literal value, never an operator.
mongoose.set('sanitizeFilter', true);

const mongooseOpts = { serverSelectionTimeoutMS: 5000 };
let usersConnection = null;
let billingConnection = null;
if (BASE_URI) {
  usersConnection = mongoose.createConnection(BASE_URI, { ...mongooseOpts, dbName: 'InfominerGroup_db' });
  billingConnection = mongoose.createConnection(BASE_URI, { ...mongooseOpts, dbName: 'Billing' });
  // Serverless platforms can pause background connections; await them explicitly.
  try {
    await Promise.all([usersConnection.asPromise(), billingConnection.asPromise()]);
    console.log('Connected to MongoDB.');
  } catch (err) {
    console.error('CRITICAL: Failed to connect to MongoDB. Check IP allow-list or credentials.', err.message);
  }
}

// Loose schemas: the users collection is shared with other Infominer systems.
const User = usersConnection?.model(
  'User',
  new mongoose.Schema({ email: String, password: String, role: String, name: String }, { strict: false }),
  'users'
);
const BillingData = billingConnection?.model(
  'BillingData',
  new mongoose.Schema({ createdAt: { type: Date, default: Date.now } }, { strict: false }),
  'client_data'
);
const AuditLog = billingConnection?.model(
  'AuditLog',
  new mongoose.Schema({ timestamp: { type: Date, default: Date.now } }, { strict: false }),
  'audit_logs'
);

// ── App & middleware ────────────────────────────────────────────
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // behind Vercel / DigitalOcean load balancer: real client IP for rate limits

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        workerSrc: ["'self'", 'blob:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS is off unless other origins are explicitly allowed (the app itself is same-origin).
const allowedOrigins = parseOrigins(process.env.ALLOWED_ORIGINS);
if (allowedOrigins.size) {
  app.use(cors({ origin: (o, cb) => cb(null, !o || allowedOrigins.has(o)), credentials: true }));
}

app.use(cookieParser());
// The full billing state (thousands of rows with long remarks) is large; everything else is small.
app.use('/api/billing', express.json({ limit: '25mb' }));
app.use(express.json({ limit: '100kb' }));

app.use('/api', rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));
const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

// CSRF: the session cookie is SameSite=Strict, and state-changing calls must be JSON
// (a cross-site HTML form cannot send application/json without a CORS preflight).
app.use('/api', (req, res, next) => {
  if (req.method === 'POST' && !req.is('application/json')) {
    return res.status(415).json({ error: 'Content-Type must be application/json' });
  }
  next();
});

const requireDb = (req, res, next) =>
  usersConnection?.readyState === 1 && billingConnection?.readyState === 1
    ? next()
    : res.status(503).json({ error: 'Database unavailable' });

function requireAuth(req, res, next) {
  const session = verifySession(req.cookies?.[SESSION_COOKIE], SESSION_SECRET);
  if (!session) return res.status(401).json({ error: 'Not signed in or session expired' });
  req.user = session;
  next();
}

const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Not permitted for your role' });

const cookieOpts = { httpOnly: true, secure: IS_PROD, sameSite: 'strict', path: '/' };
const publicUser = (s) => ({ id: s.id, email: s.email, name: s.name, role: s.role });

// ── Routes ──────────────────────────────────────────────────────
app.post('/api/login', loginLimiter, requireDb, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || password.length > 256) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.trim() });
    const { ok, needsRehash } = await verifyPassword(password, user?.password);
    if (!user || !ok) return res.status(401).json({ error: 'Invalid credentials' });

    const role = String(user.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'manager') {
      return res.status(403).json({ error: 'Access denied. Only administrators and managers are allowed.' });
    }

    // Opt-in: other systems may still read plain-text passwords from this shared collection.
    if (needsRehash && process.env.MIGRATE_PASSWORD_HASHES === 'true') {
      await User.updateOne({ _id: user._id }, { $set: { password: await hashPassword(password) } });
    }

    const session = {
      id: String(user._id),
      email: user.email,
      name: user.name || user.email.split('@')[0],
      role,
    };
    res.cookie(SESSION_COOKIE, signSession(session, SESSION_SECRET), { ...cookieOpts, maxAge: SESSION_TTL_MS });
    res.json(publicUser(session));
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE, cookieOpts);
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => res.json(publicUser(req.user)));

app.post('/api/billing', requireAuth, requireRole('admin', 'manager'), requireDb, async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Expected a JSON object' });
    }
    const clean = stripDangerousKeys(req.body);
    // Single upserted document; $set with sanitized fields so the body can never inject operators.
    await BillingData.updateOne(
      { type: 'global_app_state' },
      { $set: { ...clean, type: 'global_app_state', updatedAt: new Date(), updatedBy: req.user.email } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('Billing save error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/logs', requireAuth, requireDb, async (req, res) => {
  try {
    const entry = buildAuditLog(req.body, req.user, req.ip);
    if (!entry) return res.status(400).json({ error: 'Invalid audit entry' });
    await AuditLog.create(entry);
    res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Log save error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// JSON parse / payload-size errors → clean 4xx instead of an HTML stack trace.
app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Payload too large' });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON' });
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Frontend (local prod / DigitalOcean; Vercel serves dist itself) ──
app.use(express.static(path.join(__dirname, 'dist')));
if (!process.env.VERCEL) {
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
  app.listen(PORT, () => console.log(`Backend server running on http://localhost:${PORT}`));
}

export default app;
