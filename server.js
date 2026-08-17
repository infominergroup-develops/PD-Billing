import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = 3001;

// MongoDB URIs
const BASE_URI = process.env.MONGODB_URI || 'mongodb+srv://infominergroupdev_db_user:ah9lwaTpGOM3mKja@cluster0.ea2qhi2.mongodb.net';

// Connections - explicitly await to prevent Vercel background connection drops
const mongooseOpts = { serverSelectionTimeoutMS: 5000 };
const usersConnection = mongoose.createConnection(BASE_URI, { ...mongooseOpts, dbName: 'InfominerGroup_db' });
const billingConnection = mongoose.createConnection(BASE_URI, { ...mongooseOpts, dbName: 'Billing' });

// In serverless environments, background connections can be paused. We explicitly await them.
try {
  await Promise.all([usersConnection.asPromise(), billingConnection.asPromise()]);
  console.log('Successfully connected to MongoDB databases.');
} catch (err) {
  console.error('CRITICAL: Failed to connect to MongoDB. Check IP Whitelist (0.0.0.0/0) or URI credentials.', err);
}

// Schemas
// Note: Schemas are generic/loose because we are interacting with an existing db for users
const userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
  name: { type: String }
}, { strict: false }); // strict: false allows querying existing documents easily

const User = usersConnection.model('User', userSchema, 'users'); // Assuming collection name is 'users'

const billingDataSchema = new mongoose.Schema({
  createdAt: { type: Date, default: Date.now }
}, { strict: false }); // Allow any client data structure

const BillingData = billingConnection.model('BillingData', billingDataSchema, 'client_data');

// Endpoints
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check plain text password
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const userRole = (user.role || '').toLowerCase();

    // Enforce ADMIN and MANAGER ONLY login
    if (userRole !== 'admin' && userRole !== 'manager') {
      return res.status(403).json({ error: 'Access denied. Only administrators and managers are allowed.' });
    }

    // Successful login
    res.json({
      id: user._id,
      email: user.email,
      name: user.name || user.email.split('@')[0],
      role: userRole
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/billing', async (req, res) => {
  try {
    // Save all client data sent in the request body to the BILLING database
    const newData = new BillingData(req.body);
    await newData.save();
    res.status(201).json({ message: 'Billing data saved successfully', data: newData });
  } catch (error) {
    console.error('Billing save error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const auditLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now }
}, { strict: false });
const AuditLog = billingConnection.model('AuditLog', auditLogSchema, 'audit_logs');

app.post('/api/logs', async (req, res) => {
  try {
    const newLog = new AuditLog(req.body);
    await newLog.save();
    res.status(201).json({ message: 'Log saved successfully', data: newLog });
  } catch (error) {
    console.error('Log save error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve frontend build in production (Not needed on Vercel, but kept for local prod testing)
app.use(express.static(path.join(__dirname, 'dist')));
// We only serve index.html for non-api routes if not running on Vercel
// On Vercel, vercel.json rewrites handle this.
if (!process.env.VERCEL) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

export default app;
