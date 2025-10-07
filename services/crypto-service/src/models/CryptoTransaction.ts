import mongoose, { Document, Schema } from 'mongoose';
import { Decimal } from 'decimal.js';
import { 
  CryptoCurrency, 
  TransactionType, 
  TransactionStatus,
  NetworkType 
} from '../enums/cryptoEnums';

export interface ICryptoTransaction extends Document {
  userId: string;
  walletId: mongoose.Types.ObjectId;
  currency: CryptoCurrency;
  type: TransactionType;
  amount: Decimal;
  fee: Decimal;
  fromAddress?: string;
  toAddress?: string;
  txHash?: string;
  blockHeight?: number;
  confirmations: number;
  status: TransactionStatus;
  memo?: string;
  network: NetworkType;
  gasPrice?: Decimal;
  gasUsed?: number;
  nonce?: number;
  metadata: {
    exchangeRate?: Decimal;
    fiatAmount?: Decimal;
    fiatCurrency?: string;
    tags?: string[];
    category?: string;
    reference?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  failedAt?: Date;
  
  // Methods
  updateStatus(status: TransactionStatus): void;
  addConfirmation(): void;
  calculateFiatValue(exchangeRate: number, fiatCurrency: string): void;
  isConfirmed(): boolean;
  isPending(): boolean;
  isFailed(): boolean;
}

const CryptoTransactionSchema = new Schema<ICryptoTransaction>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  walletId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'CryptoWallet',
    index: true
  },
  currency: {
    type: String,
    enum: Object.values(CryptoCurrency),
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: Object.values(TransactionType),
    required: true,
    index: true
  },
  amount: {
    type: String,
    required: true,
    get: (value: string) => new Decimal(value),
    set: (value: Decimal | string | number) => new Decimal(value).toString()
  },
  fee: {
    type: String,
    required: true,
    default: '0',
    get: (value: string) => new Decimal(value),
    set: (value: Decimal | string | number) => new Decimal(value).toString()
  },
  fromAddress: {
    type: String,
    index: true,
    sparse: true
  },
  toAddress: {
    type: String,
    index: true,
    sparse: true
  },
  txHash: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  blockHeight: {
    type: Number,
    index: true
  },
  confirmations: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: Object.values(TransactionStatus),
    default: TransactionStatus.PENDING,
    index: true
  },
  memo: {
    type: String,
    maxlength: 500
  },
  network: {
    type: String,
    enum: Object.values(NetworkType),
    default: NetworkType.MAINNET,
    index: true
  },
  gasPrice: {
    type: String,
    get: (value: string) => value ? new Decimal(value) : undefined,
    set: (value: Decimal | string | number | undefined) => 
      value ? new Decimal(value).toString() : undefined
  },
  gasUsed: {
    type: Number,
    min: 0
  },
  nonce: {
    type: Number,
    min: 0
  },
  metadata: {
    exchangeRate: {
      type: String,
      get: (value: string) => value ? new Decimal(value) : undefined,
      set: (value: Decimal | string | number | undefined) => 
        value ? new Decimal(value).toString() : undefined
    },
    fiatAmount: {
      type: String,
      get: (value: string) => value ? new Decimal(value) : undefined,
      set: (value: Decimal | string | number | undefined) => 
        value ? new Decimal(value).toString() : undefined
    },
    fiatCurrency: {
      type: String,
      uppercase: true,
      maxlength: 3
    },
    tags: [{
      type: String,
      maxlength: 50
    }],
    category: {
      type: String,
      maxlength: 100
    },
    reference: {
      type: String,
      maxlength: 100
    }
  },
  confirmedAt: {
    type: Date,
    index: true
  },
  failedAt: {
    type: Date,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { 
    getters: true,
    transform: function(doc, ret) {
      // Convert Decimal objects to strings for JSON serialization
      if (ret.amount) ret.amount = ret.amount.toString();
      if (ret.fee) ret.fee = ret.fee.toString();
      if (ret.gasPrice) ret.gasPrice = ret.gasPrice.toString();
      if (ret.metadata?.exchangeRate) ret.metadata.exchangeRate = ret.metadata.exchangeRate.toString();
      if (ret.metadata?.fiatAmount) ret.metadata.fiatAmount = ret.metadata.fiatAmount.toString();
      return ret;
    }
  },
  toObject: { getters: true }
});

// Compound indexes for efficient queries
CryptoTransactionSchema.index({ userId: 1, currency: 1, createdAt: -1 });
CryptoTransactionSchema.index({ userId: 1, status: 1, createdAt: -1 });
CryptoTransactionSchema.index({ walletId: 1, createdAt: -1 });
CryptoTransactionSchema.index({ txHash: 1, currency: 1 });
CryptoTransactionSchema.index({ status: 1, createdAt: 1 }); // For cleanup jobs
CryptoTransactionSchema.index({ blockHeight: 1, currency: 1 });

// Methods
CryptoTransactionSchema.methods.updateStatus = function(status: TransactionStatus): void {
  this.status = status;
  
  if (status === TransactionStatus.CONFIRMED && !this.confirmedAt) {
    this.confirmedAt = new Date();
  } else if (status === TransactionStatus.FAILED && !this.failedAt) {
    this.failedAt = new Date();
  }
};

CryptoTransactionSchema.methods.addConfirmation = function(): void {
  this.confirmations += 1;
  
  // Auto-confirm based on currency-specific confirmation requirements
  const requiredConfirmations = this.getRequiredConfirmations();
  if (this.confirmations >= requiredConfirmations && this.status === TransactionStatus.PENDING) {
    this.updateStatus(TransactionStatus.CONFIRMED);
  }
};

CryptoTransactionSchema.methods.calculateFiatValue = function(
  exchangeRate: number, 
  fiatCurrency: string
): void {
  const rate = new Decimal(exchangeRate);
  const fiatAmount = this.amount.mul(rate);
  
  this.metadata.exchangeRate = rate;
  this.metadata.fiatAmount = fiatAmount;
  this.metadata.fiatCurrency = fiatCurrency.toUpperCase();
};

CryptoTransactionSchema.methods.isConfirmed = function(): boolean {
  return this.status === TransactionStatus.CONFIRMED;
};

CryptoTransactionSchema.methods.isPending = function(): boolean {
  return this.status === TransactionStatus.PENDING;
};

CryptoTransactionSchema.methods.isFailed = function(): boolean {
  return this.status === TransactionStatus.FAILED;
};

CryptoTransactionSchema.methods.getRequiredConfirmations = function(): number {
  switch (this.currency) {
    case CryptoCurrency.BTC:
      return 6;
    case CryptoCurrency.ETH:
      return 12;
    case CryptoCurrency.LTC:
      return 6;
    default:
      return 6;
  }
};

// Static methods
CryptoTransactionSchema.statics.findByUser = function(userId: string, options: any = {}) {
  const query = { userId };
  
  if (options.currency) {
    query.currency = options.currency;
  }
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.type) {
    query.type = options.type;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

CryptoTransactionSchema.statics.findByWallet = function(walletId: string, options: any = {}) {
  return this.find({ walletId })
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

CryptoTransactionSchema.statics.findPending = function(currency?: CryptoCurrency) {
  const query: any = { status: TransactionStatus.PENDING };
  
  if (currency) {
    query.currency = currency;
  }
  
  return this.find(query).sort({ createdAt: 1 });
};

CryptoTransactionSchema.statics.getTransactionStats = function(userId: string, currency?: CryptoCurrency) {
  const matchStage: any = { userId };
  
  if (currency) {
    matchStage.currency = currency;
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: { $toDouble: '$amount' } },
        totalFee: { $sum: { $toDouble: '$fee' } }
      }
    }
  ]);
};

// Pre-save middleware
CryptoTransactionSchema.pre('save', function(next) {
  // Validate amount is positive
  if (this.amount.lte(0)) {
    return next(new Error('Transaction amount must be positive'));
  }
  
  // Validate fee is non-negative
  if (this.fee.lt(0)) {
    return next(new Error('Transaction fee cannot be negative'));
  }
  
  // Set network based on environment if not specified
  if (!this.network) {
    this.network = process.env.BITCOIN_NETWORK === 'mainnet' 
      ? NetworkType.MAINNET 
      : NetworkType.TESTNET;
  }
  
  next();
});

// Post-save middleware for event emission
CryptoTransactionSchema.post('save', function(doc) {
  // This would emit events to the EventBus
  // EventBus.getInstance().publish('transaction.created', { transactionId: doc._id });
});

export const CryptoTransaction = mongoose.model<ICryptoTransaction>('CryptoTransaction', CryptoTransactionSchema);
export default CryptoTransaction;
