export interface RateRule {
  id: number;
  client: string;
  state: string;
  flat: number | null;
  s1k: number | null;
  s1r: number | null;
  s2k: number | null;
  s2r: number | null;
  s3r: number | null;
  other: number | null;
}

export interface CaseRecord {
  id: string;
  clientApplicationNumber: string;
  clientAppNo: string;
  applicantName: string;
  clientDb: string;
  rateSheetClient: string;
  branch: string;
  city: string;
  state: string;
  product: string;
  activityType: string;
  activityName?: string;
  caseReceivedDate?: string;
  appointmentDate?: string;
  caseClosedDate?: string;
  tatReceivedDays?: string | number;
  finalStatus?: string;
  caseStatus: string;
  verifierName?: string;
  kmFeededByMis?: number | null;
  kmOneSide?: number | null;
  kmUsedForBilling?: number | null;
  appliedLoanAmt?: number | null;
  billingRate: number;
  billingAmt: number;
  slabApplied: string;
  remarks: string;
  isManualOverride?: boolean;
  overrideReason?: string;
  isBillable: boolean;
  isException: boolean;
  isCancelled: boolean;
  deletionDate?: string;
  updatedAt?: string;
  updatedBy?: string;
  _rawRow?: Record<string, any>;
}

export interface ColumnMappingConfig {
  colClientApplicationNumber: string | null;
  colClient: string | null;
  colKM: string | null;
  colKMFed: string | null;
  colKMUsed: string | null;
  colStatus: string | null;
  colCity: string | null;
  colState: string | null;
  colProduct: string | null;
  colActivity: string | null;
  colApplicant: string | null;
  colAppNo: string | null;
  colVerifier: string | null;
  colRecDate: string | null;
  colApptDate: string | null;
  colCloseDate: string | null;
  colTAT: string | null;
  colFinalSt: string | null;
  colLoanAmt: string | null;
  colBranch: string | null;
  colActivityNm: string | null;
  colDeletionDate: string | null;
}

export type UserRole = 'admin' | 'manager' | 'auditor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  lastLogin?: string;
}

export type AuditActionType =
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'UPLOAD_DATA'
  | 'CLEAR_DATA'
  | 'EDIT_CASE'
  | 'ADD_CASE'
  | 'DELETE_CASE'
  | 'OVERRIDE_RATE'
  | 'UPDATE_RATE_SHEET'
  | 'IMPORT_RATE_SHEET'
  | 'UPDATE_MAPPING'
  | 'GENERATE_INVOICE'
  | 'EXPORT_EXCEL'
  | 'UPDATE_COMPANY_PROFILE';

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  userRole: string;
  action: AuditActionType;
  description: string;
  targetId?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
}

export interface InvoiceItem {
  clientApplicationNumber: string;
  applicantName: string;
  branch: string;
  city: string;
  activityType: string;
  km: number | null;
  slab: string;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  clientName: string;
  clientBillingName: string;
  clientGstin?: string;
  clientAddress?: string;
  clientState?: string;
  poNumber?: string;
  periodStart?: string;
  periodEnd?: string;
  items: InvoiceItem[];
  subTotal: number;
  taxType: 'IGST' | 'CGST_SGST';
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  grandTotal: number;
  status: 'Draft' | 'Generated' | 'Sent' | 'Paid';
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface CompanyProfile {
  name: string;
  tagline: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  pan: string;
  phone: string;
  email: string;
  website: string;
  bankName: string;
  bankAccountNo: string;
  bankIfsc: string;
  bankBranch: string;
  invoicePrefix: string;
  defaultTaxRate: number;
}

export interface DashboardStats {
  totalCases: number;
  billableCases: number;
  totalBillingAmt: number;
  exceptionCases: number;
  cancelledCases: number;
  uniqueClients: number;
  avgBillingPerCase: number;
  topClients: { name: string; cases: number; amount: number }[];
  stateBreakdown: { state: string; count: number; amount: number }[];
  productBreakdown: { product: string; count: number; amount: number }[];
  statusBreakdown: { status: string; count: number }[];
  slabBreakdown: { slab: string; count: number; amount: number }[];
}
