import mongoose, { Schema, Document } from 'mongoose';
import { Decimal } from 'decimal.js';
import { 
  CryptoCurrency, 
  WalletType, 
  NetworkType, 
  AddressType,
  TransactionStatus 
} from '../enums/cryptoEnums';

// Decimal.js schema type for precise financial calculations
const DecimalSchema = new Schema({
  value: {
    type: String,
    required: true,
    get: (v: string) => new Decimal(v),
    set: (v: Decimal | string | number) => new Decimal(v).toString()
  }
}, { _id: false });

// Address subdocument schema
const AddressSchema = new Schema({
  address: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: Object.values(AddressType),
    default: AddressType.BECH32
  },
  label: {
    type: String,
    default: ''
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  balance: {
    type: DecimalSchema,
    default: () => new Decimal(0)
  },
  derivationPath: {
    type: String,
    default: ''
  },
  publicKey: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUsedAt: {
    type: Date
  }
}, {
  timestamps: false,
  _id: true
});

// Main wallet schema
const CryptoWalletSchema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  currency: {
    type: String,
    enum: Object.values(CryptoCurrency),
    required: true
  },
  walletName: {
    type: String,
    required: true,
    unique: true
  },
  addresses: [AddressSchema],
  balance: {
    type: DecimalSchema,
    default: () => new Decimal(0)
  },
  confirmedBalance: {
    type: DecimalSchema,
    default: () => new Decimal(0)
  },
  unconfirmedBalance: {
    type: DecimalSchema,
    default: () => new Decimal(0)
  },
  type: {
    type: String,
    enum: Object.values(WalletType),
    default: WalletType.HOT
  },
  network: {
    type: String,
    enum: Object.values(NetworkType),
    default: NetworkType.MAINNET
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEncrypted: {
    type: Boolean,
    default: false
  },
  encryptionVersion: {
    type: String,
    default: 'v1'
  },
  masterPublicKey: {
    type: String,
    default: ''
  },
  derivationPath: {
    type: String,
    default: "m/84'/0'/0'"
  },
  nextAddressIndex: {
    type: Number,
    default: 0
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map()
  },
  settings: {
    autoGenerateAddresses: {
      type: Boolean,
      default: true
    },
    maxUnusedAddresses: {
      type: Number,
      default: 20
    },
    enableNotifications: {
      type: Boolean,
      default: true
    },
    requireConfirmations: {
      type: Number,
      default: 1
    }
  },
  lastSyncedAt: {
    type: Date,
    default: Date.now
  },
  lastTransactionAt: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'crypto_wallets'
});

// Indexes for performance
CryptoWalletSchema.index({ userId: 1, currency: 1 });
CryptoWalletSchema.index({ walletName: 1 }, { unique: true });
CryptoWalletSchema.index({ 'addresses.address': 1 });
CryptoWalletSchema.index({ isActive: 1 });
CryptoWalletSchema.index({ createdAt: -1 });

// Virtual for total address count
CryptoWalletSchema.virtual('addressCount').get(function() {
  return this.addresses.length;
});

// Virtual for used address count
CryptoWalletSchema.virtual('usedAddressCount').get(function() {
  return this.addresses.filter((addr: any) => addr.isUsed).length;
});

// Virtual for unused address count
CryptoWalletSchema.virtual('unusedAddressCount').get(function() {
  return this.addresses.filter((addr: any) => !addr.isUsed).length;
});

// Instance methods
CryptoWalletSchema.methods.addAddress = function(addressData: {
  address: string;
  type?: AddressType;
  label?: string;
  derivationPath?: string;
  publicKey?: string;
}) {
  const newAddress = {
    address: addressData.address,
    type: addressData.type || AddressType.BECH32,
    label: addressData.label || '',
    derivationPath: addressData.derivationPath || '',
    publicKey: addressData.publicKey || '',
    isUsed: false,
    balance: new Decimal(0),
    createdAt: new Date()
  };
  
  this.addresses.push(newAddress);
  this.nextAddressIndex += 1;
  return newAddress;
};

CryptoWalletSchema.methods.markAddressAsUsed = function(address: string) {
  const addr = this.addresses.find((a: any) => a.address === address);
  if (addr) {
    addr.isUsed = true;
    addr.lastUsedAt = new Date();
    this.lastTransactionAt = new Date();
  }
  return addr;
};

CryptoWalletSchema.methods.updateBalance = function(newBalance: Decimal | string | number) {
  this.balance = new Decimal(newBalance);
  this.lastSyncedAt = new Date();
};

CryptoWalletSchema.methods.updateAddressBalance = function(address: string, balance: Decimal | string | number) {
  const addr = this.addresses.find((a: any) => a.address === address);
  if (addr) {
    addr.balance = new Decimal(balance);
  }
  return addr;
};

CryptoWalletSchema.methods.getUnusedAddress = function() {
  return this.addresses.find((addr: any) => !addr.isUsed);
};

CryptoWalletSchema.methods.getAddressByType = function(type: AddressType) {
  return this.addresses.filter((addr: any) => addr.type === type);
};

CryptoWalletSchema.methods.getTotalBalance = function() {
  return this.addresses.reduce((total: Decimal, addr: any) => {
    return total.plus(addr.balance.value || 0);
  }, new Decimal(0));
};

// Static methods
CryptoWalletSchema.statics.findByUserId = function(userId: string, currency?: CryptoCurrency) {
  const query: any = { userId, isActive: true };
  if (currency) {
    query.currency = currency;
  }
  return this.find(query);
};

CryptoWalletSchema.statics.findByAddress = function(address: string) {
  return this.findOne({ 'addresses.address': address, isActive: true });
};

CryptoWalletSchema.statics.findByWalletName = function(walletName: string) {
  return this.findOne({ walletName, isActive: true });
};

CryptoWalletSchema.statics.getWalletStats = async function(userId: string) {
  const stats = await this.aggregate([
    { $match: { userId, isActive: true } },
    {
      $group: {
        _id: '$currency',
        count: { $sum: 1 },
        totalBalance: { $sum: { $toDouble: '$balance.value' } },
        totalAddresses: { $sum: { $size: '$addresses' } }
      }
    }
  ]);
  return stats;
};

// Pre-save middleware
CryptoWalletSchema.pre('save', function(next) {
  // Update balance from addresses if needed
  if (this.isModified('addresses')) {
    const totalBalance = this.getTotalBalance();
    this.balance = totalBalance;
  }
  
  // Ensure wallet name is unique per user
  if (this.isNew && !this.walletName) {
    this.walletName = `${this.userId}_${this.currency}_${Date.now()}`;
  }
  
  next();
});

// Post-save middleware
CryptoWalletSchema.post('save', function(doc) {
  // Emit wallet updated event
  if (doc.isModified('balance')) {
    // Could emit to event bus here
    console.log(`Wallet balance updated: ${doc.walletName} - ${doc.balance}`);
  }
});

// Transform output
CryptoWalletSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    
    // Convert Decimal values to strings for JSON
    if (ret.balance && ret.balance.value) {
      ret.balance = ret.balance.value;
    }
    if (ret.confirmedBalance && ret.confirmedBalance.value) {
      ret.confirmedBalance = ret.confirmedBalance.value;
    }
    if (ret.unconfirmedBalance && ret.unconfirmedBalance.value) {
      ret.unconfirmedBalance = ret.unconfirmedBalance.value;
    }
    
    // Transform addresses
    if (ret.addresses) {
      ret.addresses = ret.addresses.map((addr: any) => ({
        ...addr,
        balance: addr.balance?.value || '0'
      }));
    }
    
    return ret;
  }
});

// Interface for TypeScript
export interface ICryptoWallet extends Document {
  userId: string;
  currency: CryptoCurrency;
  walletName: string;
  addresses: Array<{
    _id: string;
    address: string;
    type: AddressType;
    label: string;
    isUsed: boolean;
    balance: Decimal;
    derivationPath: string;
    publicKey: string;
    createdAt: Date;
    lastUsedAt?: Date;
  }>;
  balance: Decimal;
  confirmedBalance: Decimal;
  unconfirmedBalance: Decimal;
  type: WalletType;
  network: NetworkType;
  isActive: boolean;
  isEncrypted: boolean;
  encryptionVersion: string;
  masterPublicKey: string;
  derivationPath: string;
  nextAddressIndex: number;
  metadata: Map<string, any>;
  settings: {
    autoGenerateAddresses: boolean;
    maxUnusedAddresses: number;
    enableNotifications: boolean;
    requireConfirmations: number;
  };
  lastSyncedAt: Date;
  lastTransactionAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual properties
  addressCount: number;
  usedAddressCount: number;
  unusedAddressCount: number;
  
  // Instance methods
  addAddress(addressData: any): any;
  markAddressAsUsed(address: string): any;
  updateBalance(newBalance: Decimal | string | number): void;
  updateAddressBalance(address: string, balance: Decimal | string | number): any;
  getUnusedAddress(): any;
  getAddressByType(type: AddressType): any[];
  getTotalBalance(): Decimal;
}

// Static methods interface
export interface ICryptoWalletModel extends mongoose.Model<ICryptoWallet> {
  findByUserId(userId: string, currency?: CryptoCurrency): Promise<ICryptoWallet[]>;
  findByAddress(address: string): Promise<ICryptoWallet | null>;
  findByWalletName(walletName: string): Promise<ICryptoWallet | null>;
  getWalletStats(userId: string): Promise<any[]>;
}

export const CryptoWallet = mongoose.model<ICryptoWallet, ICryptoWalletModel>('CryptoWallet', CryptoWalletSchema);
export default CryptoWallet;

