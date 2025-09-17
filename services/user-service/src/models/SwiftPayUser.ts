import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { 
  UserStatus, 
  UserRole, 
  AccountType, 
  VerificationStatus,
  NotificationPreference,
  TwoFactorMethod,
  SecurityQuestionType,
  AddressType,
  PhoneType,
  DocumentType,
  DocumentStatus,
  LoginMethod,
  SessionStatus,
  DeviceType,
  ActivityType,
  NotificationEventType,
  Gender,
  MaritalStatus,
  EmploymentStatus,
  IncomeRange
} from '../enums/userEnums';
import { 
  ISwiftPayUser,
  IAddress,
  IPhone,
  IEmergencyContact,
  ISocialLinks,
  ISecurityQuestion,
  ISocialLogin,
  IUserPreferences,
  IUserDocument,
  IUserSession,
  IUserActivity,
  IUserNotification,
  IApiKey,
  IAssetDeposit,
  IFiatAccount,
  IBitcoinWallet,
  ITransactionHistory,
  IKYCVerification
} from '../types';

// Asset Deposit Schema - for tracking physical assets deposited
const AssetDepositSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  assetType: {
    type: String,
    enum: ['gold', 'silver', 'diamond'],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true // grams, ounces, carats, etc.
  },
  purity: {
    type: Number,
    min: 0,
    max: 100 // percentage
  },
  estimatedValue: {
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'USD' }
  },
  actualValue: {
    amount: { type: Number },
    currency: { type: String, default: 'USD' }
  },
  status: {
    type: String,
    enum: ['pending_verification', 'verified', 'rejected', 'credited'],
    default: 'pending_verification'
  },
  depositDate: {
    type: Date,
    default: Date.now
  },
  verificationDate: {
    type: Date
  },
  creditedDate: {
    type: Date
  },
  verifiedBy: {
    type: String // admin user ID
  },
  rejectionReason: {
    type: String
  },
  images: [{
    url: String,
    description: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  certificates: [{
    type: String,
    issuer: String,
    certificateNumber: String,
    url: String
  }],
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map()
  }
}, {
  timestamps: true,
  _id: false
});

// Fiat Account Schema - for tracking credited fiat amounts
const FiatAccountSchema = new Schema({
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  availableBalance: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  pendingBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  totalDeposited: {
    type: Number,
    default: 0,
    min: 0
  },
  totalWithdrawn: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  lastTransactionAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map()
  }
}, { _id: false });

// Bitcoin Wallet Schema - for internal and external wallet management
const BitcoinWalletSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['internal', 'external'],
    required: true
  },
  label: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  publicKey: {
    type: String,
    trim: true
  },
  encryptedPrivateKey: {
    type: String // Only for internal wallets, encrypted
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  unconfirmedBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  totalReceived: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSent: {
    type: Number,
    default: 0,
    min: 0
  },
  transactionCount: {
    type: Number,
    default: 0,
    min: 0
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: {
    type: Date
  },
  lastSyncAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map()
  }
}, { _id: false });

// Transaction History Schema - for tracking all transactions
const TransactionHistorySchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['asset_deposit', 'asset_credit', 'fiat_transfer', 'bitcoin_purchase', 'bitcoin_transfer', 'bitcoin_receive'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  amount: {
    value: { type: Number, required: true },
    currency: { type: String, required: true }
  },
  fee: {
    value: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' }
  },
  fromAccount: {
    type: String // account ID or wallet address
  },
  toAccount: {
    type: String // account ID or wallet address
  },
  reference: {
    type: String // reference to asset deposit, bitcoin transaction, etc.
  },
  description: {
    type: String,
    trim: true
  },
  transactionHash: {
    type: String // for blockchain transactions
  },
  confirmations: {
    type: Number,
    default: 0
  },
  requiredConfirmations: {
    type: Number,
    default: 3
  },
  processedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  failedAt: {
    type: Date
  },
  failureReason: {
    type: String
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map()
  }
}, {
  timestamps: true,
  _id: false
});

// Enhanced KYC Verification Schema
const KYCVerificationSchema = new Schema({
  level: {
    type: String,
    enum: ['basic', 'intermediate', 'advanced'],
    default: 'basic'
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'pending_review', 'approved', 'rejected', 'expired'],
    default: 'not_started'
  },
  submittedAt: {
    type: Date
  },
  reviewedAt: {
    type: Date
  },
  approvedAt: {
    type: Date
  },
  rejectedAt: {
    type: Date
  },
  expiresAt: {
    type: Date
  },
  reviewedBy: {
    type: String // admin user ID
  },
  rejectionReason: {
    type: String
  },
  documents: [{
    type: {
      type: String,
      enum: ['passport', 'drivers_license', 'national_id', 'utility_bill', 'bank_statement', 'proof_of_income'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    url: String,
    extractedData: {
      type: Map,
      of: Schema.Types.Mixed
    },
    verifiedAt: Date,
    rejectedAt: Date,
    rejectionReason: String
  }],
  riskScore: {
    type: Number,
    min: 0,
    max: 100
  },
  riskFactors: [{
    factor: String,
    score: Number,
    description: String
  }],
  complianceChecks: {
    aml: {
      status: { type: String, enum: ['pending', 'passed', 'failed'], default: 'pending' },
      checkedAt: Date,
      provider: String,
      reference: String
    },
    sanctions: {
      status: { type: String, enum: ['pending', 'passed', 'failed'], default: 'pending' },
      checkedAt: Date,
      provider: String,
      reference: String
    },
    pep: {
      status: { type: String, enum: ['pending', 'passed', 'failed'], default: 'pending' },
      checkedAt: Date,
      provider: String,
      reference: String
    }
  },
  limits: {
    dailyAssetDeposit: { type: Number, default: 10000 },
    monthlyAssetDeposit: { type: Number, default: 50000 },
    dailyBitcoinPurchase: { type: Number, default: 5000 },
    monthlyBitcoinPurchase: { type: Number, default: 25000 }
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map()
  }
}, { _id: false });

// Import existing schemas from User.ts (simplified for brevity)
const SocialLinksSchema = new Schema({
  facebook: { type: String, trim: true },
  twitter: { type: String, trim: true },
  linkedin: { type: String, trim: true },
  instagram: { type: String, trim: true },
  github: { type: String, trim: true }
}, { _id: false });

const AddressSchema = new Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, enum: Object.values(AddressType), required: true },
  street: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, trim: true },
  postalCode: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true },
  isDefault: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false }
}, { timestamps: true, _id: false });

const PhoneSchema = new Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, enum: Object.values(PhoneType), required: true },
  number: { type: String, required: true, trim: true },
  countryCode: { type: String, required: true, trim: true },
  isDefault: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false }
}, { timestamps: true, _id: false });

// Main SwiftPay User Schema
const SwiftPayUserSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  phone: {
    type: String,
    trim: true,
    sparse: true,
    index: true
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  dateOfBirth: {
    type: Date
  },
  nationality: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    trim: true
  },
  addresses: [AddressSchema],
  phones: [PhoneSchema],
  socialLinks: SocialLinksSchema,
  status: {
    type: String,
    enum: Object.values(UserStatus),
    default: UserStatus.PENDING_VERIFICATION,
    index: true
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.USER,
    index: true
  },
  accountType: {
    type: String,
    enum: Object.values(AccountType),
    default: AccountType.PERSONAL,
    index: true
  },
  verificationStatus: {
    type: String,
    enum: Object.values(VerificationStatus),
    default: VerificationStatus.UNVERIFIED,
    index: true
  },
  
  // SwiftPayMe specific fields
  kycVerification: {
    type: KYCVerificationSchema,
    default: () => ({})
  },
  assetDeposits: [AssetDepositSchema],
  fiatAccounts: {
    type: Map,
    of: FiatAccountSchema,
    default: () => new Map([['USD', { currency: 'USD', balance: 0, availableBalance: 0 }]])
  },
  bitcoinWallets: [BitcoinWalletSchema],
  transactionHistory: [TransactionHistorySchema],
  
  // Trading and limits
  tradingLimits: {
    dailyAssetDeposit: { type: Number, default: 1000 },
    monthlyAssetDeposit: { type: Number, default: 10000 },
    dailyBitcoinPurchase: { type: Number, default: 500 },
    monthlyBitcoinPurchase: { type: Number, default: 5000 },
    dailyTransfer: { type: Number, default: 1000 },
    monthlyTransfer: { type: Number, default: 10000 }
  },
  
  // Preferences for SwiftPayMe
  paymentPreferences: {
    defaultCurrency: { type: String, default: 'USD' },
    autoConvertAssets: { type: Boolean, default: true },
    bitcoinNetwork: { type: String, enum: ['mainnet', 'testnet'], default: 'testnet' },
    notifyOnDeposits: { type: Boolean, default: true },
    notifyOnCredits: { type: Boolean, default: true },
    notifyOnBitcoinTransactions: { type: Boolean, default: true },
    requireTwoFactorForTransactions: { type: Boolean, default: false },
    autoGenerateBitcoinAddress: { type: Boolean, default: true }
  },
  
  // Security
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorMethod: {
    type: String,
    enum: Object.values(TwoFactorMethod),
    default: TwoFactorMethod.NONE
  },
  
  // Timestamps
  lastLoginAt: {
    type: Date
  },
  lastActiveAt: {
    type: Date
  },
  termsAcceptedAt: {
    type: Date
  },
  privacyPolicyAcceptedAt: {
    type: Date
  },
  
  // Referral system
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  referredBy: {
    type: String,
    trim: true
  },
  
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map()
  }
}, {
  timestamps: true,
  collection: 'swiftpay_users'
});

// Indexes for performance
SwiftPayUserSchema.index({ email: 1, status: 1 });
SwiftPayUserSchema.index({ phone: 1, phoneVerified: 1 });
SwiftPayUserSchema.index({ status: 1, role: 1 });
SwiftPayUserSchema.index({ verificationStatus: 1, accountType: 1 });
SwiftPayUserSchema.index({ 'kycVerification.status': 1 });
SwiftPayUserSchema.index({ 'assetDeposits.status': 1 });
SwiftPayUserSchema.index({ 'bitcoinWallets.address': 1 });
SwiftPayUserSchema.index({ 'transactionHistory.type': 1, 'transactionHistory.createdAt': -1 });
SwiftPayUserSchema.index({ referralCode: 1 });

// Virtual properties
SwiftPayUserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

SwiftPayUserSchema.virtual('totalAssetValue').get(function() {
  return this.assetDeposits
    .filter(deposit => deposit.status === 'credited')
    .reduce((total, deposit) => total + (deposit.actualValue?.amount || deposit.estimatedValue.amount), 0);
});

SwiftPayUserSchema.virtual('totalFiatBalance').get(function() {
  let total = 0;
  for (const [currency, account] of this.fiatAccounts) {
    total += account.balance; // Convert to USD if needed
  }
  return total;
});

SwiftPayUserSchema.virtual('totalBitcoinBalance').get(function() {
  return this.bitcoinWallets
    .filter(wallet => wallet.isActive)
    .reduce((total, wallet) => total + wallet.balance, 0);
});

SwiftPayUserSchema.virtual('isKYCVerified').get(function() {
  return this.kycVerification.status === 'approved';
});

SwiftPayUserSchema.virtual('canDepositAssets').get(function() {
  return this.status === UserStatus.ACTIVE && 
         this.verificationStatus === VerificationStatus.VERIFIED &&
         this.kycVerification.status === 'approved';
});

// Instance methods
SwiftPayUserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

SwiftPayUserSchema.methods.hashPassword = async function(password: string): Promise<string> {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  return bcrypt.hash(password, saltRounds);
};

SwiftPayUserSchema.methods.addAssetDeposit = function(deposit: Partial<IAssetDeposit>): string {
  const depositId = `deposit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  this.assetDeposits.push({
    id: depositId,
    ...deposit
  } as IAssetDeposit);
  return depositId;
};

SwiftPayUserSchema.methods.creditFiatFromAsset = function(assetDepositId: string, amount: number, currency: string = 'USD'): boolean {
  const deposit = this.assetDeposits.find(d => d.id === assetDepositId);
  if (!deposit || deposit.status !== 'verified') return false;
  
  // Update deposit status
  deposit.status = 'credited';
  deposit.creditedDate = new Date();
  deposit.actualValue = { amount, currency };
  
  // Credit fiat account
  const account = this.fiatAccounts.get(currency) || { 
    currency, 
    balance: 0, 
    availableBalance: 0, 
    pendingBalance: 0,
    totalDeposited: 0,
    totalWithdrawn: 0,
    totalSpent: 0,
    isActive: true,
    metadata: new Map()
  };
  
  account.balance += amount;
  account.availableBalance += amount;
  account.totalDeposited += amount;
  account.lastTransactionAt = new Date();
  this.fiatAccounts.set(currency, account);
  
  // Add transaction history
  this.addTransaction({
    type: 'asset_credit',
    status: 'completed',
    amount: { value: amount, currency },
    reference: assetDepositId,
    description: `Credit from ${deposit.assetType} deposit`,
    completedAt: new Date()
  });
  
  return true;
};

SwiftPayUserSchema.methods.addBitcoinWallet = function(wallet: Partial<IBitcoinWallet>): string {
  const walletId = `wallet_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  // If this is the first wallet, make it default
  if (this.bitcoinWallets.length === 0) {
    wallet.isDefault = true;
  }
  
  this.bitcoinWallets.push({
    id: walletId,
    ...wallet
  } as IBitcoinWallet);
  
  return walletId;
};

SwiftPayUserSchema.methods.addTransaction = function(transaction: Partial<ITransactionHistory>): string {
  const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  this.transactionHistory.push({
    id: transactionId,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...transaction
  } as ITransactionHistory);
  return transactionId;
};

SwiftPayUserSchema.methods.purchaseBitcoin = function(fiatAmount: number, fiatCurrency: string, bitcoinAmount: number, exchangeRate: number): boolean {
  const account = this.fiatAccounts.get(fiatCurrency);
  if (!account || account.availableBalance < fiatAmount) return false;
  
  // Deduct from fiat account
  account.balance -= fiatAmount;
  account.availableBalance -= fiatAmount;
  account.totalSpent += fiatAmount;
  account.lastTransactionAt = new Date();
  this.fiatAccounts.set(fiatCurrency, account);
  
  // Add to default Bitcoin wallet
  const defaultWallet = this.bitcoinWallets.find(w => w.isDefault && w.isActive);
  if (defaultWallet) {
    defaultWallet.balance += bitcoinAmount;
    defaultWallet.totalReceived += bitcoinAmount;
  }
  
  // Add transaction history
  this.addTransaction({
    type: 'bitcoin_purchase',
    status: 'completed',
    amount: { value: bitcoinAmount, currency: 'BTC' },
    fee: { value: fiatAmount * 0.01, currency: fiatCurrency }, // 1% fee
    description: `Bitcoin purchase: ${bitcoinAmount} BTC for ${fiatAmount} ${fiatCurrency}`,
    metadata: new Map([['exchangeRate', exchangeRate]]),
    completedAt: new Date()
  });
  
  return true;
};

SwiftPayUserSchema.methods.updateKYCStatus = function(status: string, reviewedBy?: string, rejectionReason?: string): void {
  this.kycVerification.status = status;
  this.kycVerification.reviewedAt = new Date();
  this.kycVerification.reviewedBy = reviewedBy;
  
  if (status === 'approved') {
    this.kycVerification.approvedAt = new Date();
    this.kycVerification.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
    
    // Update trading limits based on KYC level
    if (this.kycVerification.level === 'advanced') {
      this.tradingLimits.dailyAssetDeposit = 50000;
      this.tradingLimits.monthlyAssetDeposit = 500000;
      this.tradingLimits.dailyBitcoinPurchase = 25000;
      this.tradingLimits.monthlyBitcoinPurchase = 250000;
    }
  } else if (status === 'rejected') {
    this.kycVerification.rejectedAt = new Date();
    this.kycVerification.rejectionReason = rejectionReason;
  }
};

SwiftPayUserSchema.methods.toSafeObject = function(): any {
  const obj = this.toObject();
  delete obj.password;
  delete obj.twoFactorSecret;
  
  // Remove sensitive wallet information
  if (obj.bitcoinWallets) {
    obj.bitcoinWallets.forEach((wallet: any) => {
      delete wallet.encryptedPrivateKey;
    });
  }
  
  delete obj.__v;
  return obj;
};

// Static methods
SwiftPayUserSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

SwiftPayUserSchema.statics.findByBitcoinAddress = function(address: string) {
  return this.findOne({ 'bitcoinWallets.address': address });
};

SwiftPayUserSchema.statics.findUsersWithPendingDeposits = function() {
  return this.find({ 'assetDeposits.status': 'pending_verification' });
};

SwiftPayUserSchema.statics.findKYCPendingUsers = function() {
  return this.find({ 'kycVerification.status': 'pending_review' });
};

// Pre-save middleware
SwiftPayUserSchema.pre('save', async function(next) {
  if (!this.id) {
    this.id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  
  if (this.isModified('password') && !this.password.startsWith('$2')) {
    this.password = await this.hashPassword(this.password);
  }
  
  if (!this.referralCode && this.firstName) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.referralCode = `${this.firstName.substring(0, 2).toUpperCase()}${code}`;
  }
  
  next();
});

// Transform output
SwiftPayUserSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    
    // Remove sensitive wallet data
    if (ret.bitcoinWallets) {
      ret.bitcoinWallets.forEach((wallet: any) => {
        delete wallet.encryptedPrivateKey;
      });
    }
    
    return ret;
  }
});

export interface ISwiftPayUserModel extends mongoose.Model<ISwiftPayUser> {
  findByEmail(email: string): Promise<ISwiftPayUser | null>;
  findByBitcoinAddress(address: string): Promise<ISwiftPayUser | null>;
  findUsersWithPendingDeposits(): Promise<ISwiftPayUser[]>;
  findKYCPendingUsers(): Promise<ISwiftPayUser[]>;
}

export const SwiftPayUser = mongoose.model<ISwiftPayUser, ISwiftPayUserModel>('SwiftPayUser', SwiftPayUserSchema);
export default SwiftPayUser;

