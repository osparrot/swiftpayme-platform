import { Request } from 'express';
import { Decimal } from 'decimal.js';
import { Document } from 'mongoose';
import {
  AccountType,
  AccountCategory,
  AccountStatus,
  TransactionType,
  TransactionStatus,
  JournalEntryStatus,
  EntryType,
  DebitCredit,
  CurrencyType,
  ReconciliationStatus,
  AuditEventType,
  AuditSeverity,
  BalanceType,
  PeriodType,
  ReportType,
  ApprovalStatus,
  RiskLevel,
  ComplianceStatus
} from '../enums/ledgerEnums';

// Extend Express Request interface for Ledger Service
export interface LedgerRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    permissions: string[];
  };
  requestId?: string;
}

// Service response interface
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId?: string;
}

// Account Interfaces
export interface IAccount extends Document {
  accountId: string;
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  accountCategory: AccountCategory;
  parentAccountId?: string;
  userId?: string;
  entityId?: string;
  currency: string;
  currencyType: CurrencyType;
  status: AccountStatus;
  isActive: boolean;
  
  // Balance Information
  currentBalance: Decimal;
  availableBalance: Decimal;
  pendingBalance: Decimal;
  reservedBalance: Decimal;
  frozenBalance: Decimal;
  escrowBalance: Decimal;
  
  // Account Configuration
  allowNegativeBalance: boolean;
  creditLimit?: Decimal;
  minimumBalance?: Decimal;
  maximumBalance?: Decimal;
  
  // Metadata
  description?: string;
  tags: string[];
  metadata: Record<string, any>;
  
  // Audit Information
  createdBy: string;
  lastModifiedBy: string;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  
  // Methods
  getBalance(balanceType?: BalanceType): Decimal;
  updateBalance(amount: Decimal, balanceType: BalanceType, operation: 'add' | 'subtract'): Promise<IAccount>;
  freeze(amount?: Decimal): Promise<IAccount>;
  unfreeze(amount?: Decimal): Promise<IAccount>;
  reserve(amount: Decimal): Promise<IAccount>;
  releaseReserve(amount: Decimal): Promise<IAccount>;
  isBalanceSufficient(amount: Decimal, balanceType?: BalanceType): boolean;
}

// Transaction Interfaces
export interface ITransaction extends Document {
  transactionId: string;
  referenceNumber?: string;
  transactionType: TransactionType;
  status: TransactionStatus;
  
  // Transaction Details
  amount: Decimal;
  currency: string;
  currencyType: CurrencyType;
  exchangeRate?: Decimal;
  baseCurrencyAmount?: Decimal;
  
  // Account Information
  fromAccountId?: string;
  toAccountId?: string;
  
  // Business Context
  businessTransactionId?: string;
  userId?: string;
  entityId?: string;
  
  // Transaction Metadata
  description: string;
  notes?: string;
  tags: string[];
  metadata: Record<string, any>;
  
  // Timing Information
  transactionDate: Date;
  valueDate: Date;
  processedAt?: Date;
  settledAt?: Date;
  
  // Reconciliation
  reconciliationStatus: ReconciliationStatus;
  reconciledAt?: Date;
  reconciledBy?: string;
  
  // Audit Information
  createdBy: string;
  lastModifiedBy: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Related Transactions
  parentTransactionId?: string;
  reversalTransactionId?: string;
  
  // Risk and Compliance
  riskLevel: RiskLevel;
  complianceStatus: ComplianceStatus;
  complianceNotes?: string;
}

// Journal Entry Interfaces
export interface IJournalEntry extends Document {
  journalEntryId: string;
  entryNumber: string;
  entryType: EntryType;
  status: JournalEntryStatus;
  
  // Entry Details
  description: string;
  reference?: string;
  notes?: string;
  
  // Timing Information
  entryDate: Date;
  postingDate: Date;
  period: string;
  
  // Business Context
  businessTransactionId?: string;
  userId?: string;
  entityId?: string;
  
  // Journal Lines
  journalLines: IJournalLine[];
  
  // Totals (for validation)
  totalDebits: Decimal;
  totalCredits: Decimal;
  
  // Approval Workflow
  approvalStatus: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: Date;
  
  // Audit Information
  createdBy: string;
  lastModifiedBy: string;
  createdAt: Date;
  updatedAt: Date;
  postedAt?: Date;
  reversedAt?: Date;
  
  // Metadata
  tags: string[];
  metadata: Record<string, any>;
  
  // Methods
  isBalanced(): boolean;
  post(): Promise<IJournalEntry>;
  reverse(reason: string): Promise<IJournalEntry>;
  addLine(line: Partial<IJournalLine>): void;
  removeLine(lineId: string): void;
}

// Journal Line Interface
export interface IJournalLine {
  lineId: string;
  accountId: string;
  debitCredit: DebitCredit;
  amount: Decimal;
  currency: string;
  description?: string;
  reference?: string;
  
  // Dimensions for reporting
  costCenter?: string;
  department?: string;
  project?: string;
  
  // Metadata
  metadata: Record<string, any>;
}

// Balance Snapshot Interface
export interface IBalanceSnapshot extends Document {
  snapshotId: string;
  accountId: string;
  snapshotDate: Date;
  period: string;
  
  // Balance Information
  openingBalance: Decimal;
  closingBalance: Decimal;
  totalDebits: Decimal;
  totalCredits: Decimal;
  netMovement: Decimal;
  
  // Balance Types
  currentBalance: Decimal;
  availableBalance: Decimal;
  pendingBalance: Decimal;
  reservedBalance: Decimal;
  frozenBalance: Decimal;
  
  // Metadata
  currency: string;
  createdAt: Date;
  createdBy: string;
}

// Audit Log Interface
export interface IAuditLog extends Document {
  auditId: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  
  // Event Details
  description: string;
  entityType: string;
  entityId: string;
  
  // Changes
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changedFields?: string[];
  
  // Context
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  
  // Timing
  timestamp: Date;
  
  // Additional Information
  metadata: Record<string, any>;
  tags: string[];
}

// Reconciliation Interface
export interface IReconciliation extends Document {
  reconciliationId: string;
  accountId: string;
  reconciliationType: string;
  
  // Reconciliation Period
  periodStart: Date;
  periodEnd: Date;
  
  // Balances
  bookBalance: Decimal;
  statementBalance: Decimal;
  difference: Decimal;
  
  // Status
  status: ReconciliationStatus;
  
  // Reconciliation Items
  reconciledItems: IReconciliationItem[];
  unreconciledItems: IReconciliationItem[];
  
  // Audit Information
  performedBy: string;
  performedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  
  // Metadata
  notes?: string;
  metadata: Record<string, any>;
}

// Reconciliation Item Interface
export interface IReconciliationItem {
  itemId: string;
  transactionId?: string;
  description: string;
  amount: Decimal;
  date: Date;
  status: ReconciliationStatus;
  matchedTransactionId?: string;
  notes?: string;
}

// Chart of Accounts Interface
export interface IChartOfAccounts extends Document {
  chartId: string;
  name: string;
  description?: string;
  version: string;
  isActive: boolean;
  
  // Account Structure
  accounts: IAccountStructure[];
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Account Structure for Chart of Accounts
export interface IAccountStructure {
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  accountCategory: AccountCategory;
  parentAccountCode?: string;
  level: number;
  isActive: boolean;
  allowTransactions: boolean;
}

// Financial Report Interface
export interface IFinancialReport extends Document {
  reportId: string;
  reportType: ReportType;
  reportName: string;
  
  // Report Parameters
  periodType: PeriodType;
  periodStart: Date;
  periodEnd: Date;
  currency?: string;
  
  // Report Data
  reportData: any;
  
  // Generation Information
  generatedBy: string;
  generatedAt: Date;
  
  // Metadata
  parameters: Record<string, any>;
  metadata: Record<string, any>;
}

// API Request/Response Types
export interface CreateAccountRequest {
  accountName: string;
  accountType: AccountType;
  accountCategory: AccountCategory;
  parentAccountId?: string;
  currency: string;
  userId?: string;
  entityId?: string;
  description?: string;
  allowNegativeBalance?: boolean;
  creditLimit?: string;
  minimumBalance?: string;
  maximumBalance?: string;
  metadata?: Record<string, any>;
}

export interface UpdateAccountRequest {
  accountName?: string;
  status?: AccountStatus;
  description?: string;
  allowNegativeBalance?: boolean;
  creditLimit?: string;
  minimumBalance?: string;
  maximumBalance?: string;
  metadata?: Record<string, any>;
}

export interface CreateTransactionRequest {
  transactionType: TransactionType;
  amount: string;
  currency: string;
  fromAccountId?: string;
  toAccountId?: string;
  description: string;
  businessTransactionId?: string;
  userId?: string;
  entityId?: string;
  transactionDate?: Date;
  valueDate?: Date;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface CreateJournalEntryRequest {
  entryType: EntryType;
  description: string;
  reference?: string;
  entryDate?: Date;
  businessTransactionId?: string;
  userId?: string;
  entityId?: string;
  journalLines: CreateJournalLineRequest[];
  notes?: string;
  metadata?: Record<string, any>;
}

export interface CreateJournalLineRequest {
  accountId: string;
  debitCredit: DebitCredit;
  amount: string;
  currency: string;
  description?: string;
  reference?: string;
  costCenter?: string;
  department?: string;
  project?: string;
  metadata?: Record<string, any>;
}

export interface BalanceInquiryRequest {
  accountId: string;
  balanceType?: BalanceType;
  asOfDate?: Date;
}

export interface BalanceInquiryResponse {
  accountId: string;
  accountName: string;
  currency: string;
  balances: {
    current: string;
    available: string;
    pending: string;
    reserved: string;
    frozen: string;
    escrow: string;
  };
  asOfDate: Date;
}

export interface TransactionHistoryRequest {
  accountId?: string;
  userId?: string;
  transactionType?: TransactionType;
  status?: TransactionStatus;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ReconciliationRequest {
  accountId: string;
  periodStart: Date;
  periodEnd: Date;
  statementBalance: string;
  reconciliationType: string;
  items?: IReconciliationItem[];
}

// Pagination Interface
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Filter Interfaces
export interface AccountFilter {
  accountType?: AccountType;
  accountCategory?: AccountCategory;
  status?: AccountStatus;
  currency?: string;
  userId?: string;
  entityId?: string;
  parentAccountId?: string;
}

export interface TransactionFilter {
  transactionType?: TransactionType;
  status?: TransactionStatus;
  currency?: string;
  userId?: string;
  entityId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  amountFrom?: string;
  amountTo?: string;
}

// Event Interfaces for Inter-service Communication
export interface AccountCreatedEvent {
  accountId: string;
  accountNumber: string;
  accountType: AccountType;
  currency: string;
  userId?: string;
  entityId?: string;
  timestamp: string;
}

export interface TransactionProcessedEvent {
  transactionId: string;
  transactionType: TransactionType;
  amount: string;
  currency: string;
  fromAccountId?: string;
  toAccountId?: string;
  status: TransactionStatus;
  userId?: string;
  timestamp: string;
}

export interface BalanceUpdatedEvent {
  accountId: string;
  previousBalance: string;
  newBalance: string;
  currency: string;
  balanceType: BalanceType;
  transactionId?: string;
  timestamp: string;
}

export interface JournalEntryPostedEvent {
  journalEntryId: string;
  entryType: EntryType;
  totalAmount: string;
  currency: string;
  accountsAffected: string[];
  userId?: string;
  timestamp: string;
}

// Validation Interfaces
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Configuration Interfaces
export interface LedgerConfig {
  baseCurrency: string;
  decimalPlaces: number;
  allowNegativeBalances: boolean;
  requireApprovalForJournalEntries: boolean;
  autoReconciliation: boolean;
  auditRetentionDays: number;
  backupFrequency: string;
}

export default {
  LedgerRequest,
  ServiceResponse,
  IAccount,
  ITransaction,
  IJournalEntry,
  IJournalLine,
  IBalanceSnapshot,
  IAuditLog,
  IReconciliation,
  IReconciliationItem,
  IChartOfAccounts,
  IAccountStructure,
  IFinancialReport,
  CreateAccountRequest,
  UpdateAccountRequest,
  CreateTransactionRequest,
  CreateJournalEntryRequest,
  CreateJournalLineRequest,
  BalanceInquiryRequest,
  BalanceInquiryResponse,
  TransactionHistoryRequest,
  ReconciliationRequest,
  PaginationQuery,
  PaginatedResponse,
  AccountFilter,
  TransactionFilter,
  AccountCreatedEvent,
  TransactionProcessedEvent,
  BalanceUpdatedEvent,
  JournalEntryPostedEvent,
  ValidationResult,
  ValidationError,
  LedgerConfig
};

