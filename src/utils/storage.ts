import { RateRule, AuditLog, Invoice, CompanyProfile, ColumnMappingConfig, ClientReconciliationRecord } from '../types';
import { DEFAULT_RATES, DEFAULT_MAP, DEFAULT_COMPANY_PROFILE } from '../constants/defaultData';

const DB_NAME = 'Infominer_PDBilling_Enterprise_DB';
const DB_VERSION = 1;

interface PersistentStore {
  rawCases: Record<string, any>[];
  colConfig: ColumnMappingConfig;
  fileName: string;
  rates: RateRule[];
  clientMap: Record<string, string>;
  overrides: Record<string, { rate: number; reason: string }>;
  auditLogs: AuditLog[];
  invoices: Invoice[];
  reconciliations: ClientReconciliationRecord[];
  companyProfile: CompanyProfile;
  emailContacts: any[]; // Changed to any[] to avoid missing type import issues here if not imported, or actually use ClientEmailContact
  lastUpdated: string;
}

let _db: IDBDatabase | null = null;

export function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (_db) return resolve(_db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e: any) => {
      const db = e.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains('appStore')) {
        db.createObjectStore('appStore');
      }
    };
    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveToPersistentDB(data: Partial<PersistentStore>): Promise<boolean> {
  try {
    const db = await openIndexedDB();
    const existing = await loadFromPersistentDB();
    const merged: PersistentStore = {
      rawCases: data.rawCases ?? existing?.rawCases ?? [],
      colConfig: data.colConfig ?? existing?.colConfig ?? {
        colClientApplicationNumber: 'client_application_number',
        colClient: 'client_name',
        colKM: 'KM_Running_One_Side',
        colKMFed: 'KM feeded by MIS',
        colKMUsed: 'km_used_for_billing',
        colStatus: 'case_status',
        colCity: 'city_name',
        colState: 'state',
        colProduct: 'product_name',
        colActivity: 'activity_types',
        colApplicant: 'applicant_name',
        colAppNo: 'client_application_number',
        colVerifier: 'verifier_name',
        colRecDate: 'case_received_date',
        colApptDate: 'appointment_date',
        colCloseDate: 'case_closed_date',
        colTAT: 'tat_received_days',
        colFinalSt: 'final_status',
        colLoanAmt: 'Applied_Loan_Amt',
        colBranch: 'branch_name',
        colActivityNm: 'activity_name',
        colDeletionDate: 'deletion_date',
      },
      fileName: data.fileName ?? existing?.fileName ?? 'MC_Report.xlsx',
      rates: data.rates ?? existing?.rates ?? DEFAULT_RATES,
      clientMap: data.clientMap ?? existing?.clientMap ?? DEFAULT_MAP,
      overrides: data.overrides ?? existing?.overrides ?? {},
      auditLogs: data.auditLogs ?? existing?.auditLogs ?? [],
      invoices: data.invoices ?? existing?.invoices ?? [],
      reconciliations: data.reconciliations ?? existing?.reconciliations ?? [],
      companyProfile: data.companyProfile ?? existing?.companyProfile ?? DEFAULT_COMPANY_PROFILE,
      emailContacts: data.emailContacts ?? existing?.emailContacts ?? [],
      lastUpdated: new Date().toISOString(),
    };

    // Sync all client data to MongoDB (BILLING db)
    try {
      fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      }).catch(err => console.error('MongoDB sync error:', err));
    } catch (e) {
      console.error('MongoDB sync trigger failed:', e);
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction('appStore', 'readwrite');
      tx.objectStore('appStore').put(merged, 'root_state');
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to save to IndexedDB, fallback to localStorage', err);
    try {
      localStorage.setItem('infominer_rates', JSON.stringify(data.rates || DEFAULT_RATES));
      localStorage.setItem('infominer_map', JSON.stringify(data.clientMap || DEFAULT_MAP));
      return true;
    } catch {
      return false;
    }
  }
}

export async function loadFromPersistentDB(): Promise<PersistentStore | null> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('appStore', 'readonly');
      const req = tx.objectStore('appStore').get('root_state');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to load from IndexedDB', err);
    return null;
  }
}

export function createAuditEntry(
  action: AuditLog['action'],
  description: string,
  user: { name: string; role: string },
  details?: {
    targetId?: string;
    oldValue?: string;
    newValue?: string;
  }
): AuditLog {
  const logEntry: AuditLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    user: user.name || 'Admin',
    userRole: user.role || 'admin',
    action,
    description,
    targetId: details?.targetId,
    oldValue: details?.oldValue,
    newValue: details?.newValue,
    ipAddress: '127.0.0.1 (Local Session)',
  };

  // Sync to MongoDB asynchronously
  try {
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logEntry)
    }).catch(err => console.error('Error syncing log to DB:', err));
  } catch (e) {
    // ignore fetch init errors
  }

  return logEntry;
}

export async function clearAllPersistentData(): Promise<boolean> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('appStore', 'readwrite');
      tx.objectStore('appStore').clear();
      tx.oncomplete = () => {
        localStorage.clear();
        resolve(true);
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Clear data error:', err);
    return false;
  }
}
