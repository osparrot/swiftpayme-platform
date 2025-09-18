# SwiftPayMe Ledger Service

A comprehensive double-entry bookkeeping system for the SwiftPayMe payment platform, providing financial accuracy, compliance, and audit trail maintenance with immutable transaction records.

## 🏗️ Architecture Overview

The Ledger Service is the financial backbone of SwiftPayMe, implementing industry-standard double-entry bookkeeping principles with modern microservice architecture. It maintains financial integrity across all platform operations including asset deposits, tokenization, cryptocurrency transactions, and fiat operations.

## ✨ Key Features

### 📊 **Double-Entry Bookkeeping**
- **GAAP/IFRS Compliant** - Follows international accounting standards
- **Automatic Balance Validation** - Ensures debits always equal credits
- **Multi-Currency Support** - Handles fiat, crypto, and tokenized assets
- **Real-Time Balance Calculations** - Instant balance updates across all account types

### 🏦 **Account Management**
- **Hierarchical Account Structure** - Support for parent-child account relationships
- **Multiple Balance Types** - Current, available, pending, reserved, frozen, escrow
- **Account Categories** - Cash, assets, liabilities, equity, revenue, expenses
- **User & Entity Accounts** - Individual and business account management

### 💰 **Transaction Processing**
- **Atomic Transactions** - All-or-nothing transaction processing with rollback
- **Transaction Types** - Deposits, withdrawals, transfers, payments, reversals
- **Multi-Currency Transactions** - Cross-currency operations with exchange rates
- **Risk Assessment** - Built-in risk scoring and compliance checking

### 📋 **Journal Entry Management**
- **Manual & Automated Entries** - Support for both manual and system-generated entries
- **Approval Workflows** - Multi-level approval for high-value transactions
- **Reversal Capabilities** - Complete reversal functionality with audit trails
- **Batch Processing** - Efficient processing of multiple entries

### 🔗 **SwiftPayMe Integration**
- **Asset Service Integration** - Physical asset deposit and withdrawal processing
- **Tokenization Service Integration** - Token minting and burning operations
- **Crypto Service Integration** - Bitcoin and cryptocurrency transaction recording
- **Payment Service Integration** - Payment workflow orchestration
- **User Service Integration** - User account and KYC integration

### 📈 **Financial Reporting**
- **Trial Balance** - Real-time trial balance generation
- **Account Statements** - Detailed account activity reports
- **Transaction Reports** - Comprehensive transaction analysis
- **Audit Reports** - Compliance and audit trail reports

### 🔒 **Security & Compliance**
- **Immutable Audit Trails** - Complete transaction history with hash verification
- **Role-Based Access Control** - Granular permission management
- **Data Encryption** - AES-256 encryption for sensitive financial data
- **Regulatory Compliance** - SOX, GDPR, PCI-DSS compliance features

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 5.0+
- Redis 6.0+
- Docker & Docker Compose

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/osparrot/swiftpayment.git
   cd swiftpayment/services/ledger-service
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Build the application**
   ```bash
   npm run build
   ```

5. **Start the service**
   ```bash
   npm start
   ```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d ledger-service
```

## 📚 API Documentation

### Account Management

#### Create Account
```http
POST /api/accounts
Content-Type: application/json

{
  "accountName": "User USD Wallet",
  "accountType": "USER_WALLET",
  "accountCategory": "CASH_AND_EQUIVALENTS",
  "currency": "USD",
  "userId": "user-123",
  "description": "User's primary USD wallet"
}
```

#### Get Account Balance
```http
GET /api/accounts/{accountId}/balance
```

#### Get User Accounts
```http
GET /api/accounts/user/{userId}?accountType=USER_WALLET&currency=USD
```

### Transaction Processing

#### Process Transaction
```http
POST /api/transactions
Content-Type: application/json

{
  "transactionType": "TRANSFER",
  "amount": "100.00",
  "currency": "USD",
  "fromAccountId": "acc-123",
  "toAccountId": "acc-456",
  "description": "Payment for services",
  "userId": "user-123"
}
```

#### Get Transaction History
```http
GET /api/transactions/user/{userId}?limit=50&offset=0
```

### Journal Entry Management

#### Create Journal Entry
```http
POST /api/journal-entries
Content-Type: application/json

{
  "entryType": "STANDARD",
  "description": "Asset deposit journal entry",
  "journalLines": [
    {
      "accountId": "acc-asset-123",
      "debitCredit": "DEBIT",
      "amount": "1000.00",
      "currency": "USD",
      "description": "Gold asset deposit"
    },
    {
      "accountId": "acc-wallet-456",
      "debitCredit": "CREDIT",
      "amount": "1000.00",
      "currency": "USD",
      "description": "Fiat credit for gold deposit"
    }
  ]
}
```

### SwiftPayMe Integrations

#### Process Asset Deposit
```http
POST /api/integrations/asset-deposit
Content-Type: application/json

{
  "userId": "user-123",
  "assetDepositId": "deposit-456",
  "assetType": "gold",
  "amount": "1000.00",
  "currency": "USD"
}
```

#### Process Bitcoin Purchase
```http
POST /api/integrations/bitcoin-purchase
Content-Type: application/json

{
  "userId": "user-123",
  "amount": "1000.00",
  "bitcoinAmount": "0.025",
  "exchangeRate": "40000.00"
}
```

### Financial Reporting

#### Get Trial Balance
```http
GET /api/reports/trial-balance?currency=USD&asOfDate=2024-01-31
```

## 🏗️ Database Schema

### Account Model
```typescript
interface IAccount {
  accountId: string;           // Unique account identifier
  accountNumber: string;       // Human-readable account number
  accountName: string;         // Account display name
  accountType: AccountType;    // ASSET, LIABILITY, EQUITY, etc.
  accountCategory: AccountCategory; // Specific category
  currency: string;            // Currency code (USD, BTC, XAU, etc.)
  currentBalance: Decimal;     // Current account balance
  availableBalance: Decimal;   // Available for use
  pendingBalance: Decimal;     // Pending transactions
  // ... additional balance types and metadata
}
```

### Transaction Model
```typescript
interface ITransaction {
  transactionId: string;       // Unique transaction identifier
  transactionType: TransactionType; // DEPOSIT, WITHDRAWAL, TRANSFER, etc.
  amount: Decimal;             // Transaction amount
  currency: string;            // Currency code
  fromAccountId?: string;      // Source account (for transfers)
  toAccountId?: string;        // Destination account (for transfers)
  status: TransactionStatus;   // PENDING, COMPLETED, FAILED, etc.
  // ... additional transaction details
}
```

### Journal Entry Model
```typescript
interface IJournalEntry {
  journalEntryId: string;      // Unique journal entry identifier
  entryType: EntryType;        // STANDARD, ADJUSTING, CLOSING, etc.
  description: string;         // Entry description
  journalLines: IJournalLine[]; // Array of journal lines
  totalDebits: Decimal;        // Total debit amount
  totalCredits: Decimal;       // Total credit amount
  status: JournalEntryStatus;  // DRAFT, POSTED, REVERSED
  // ... additional entry details
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3010
NODE_ENV=production

# Database Configuration
MONGODB_URI=mongodb://mongodb:27017/swiftpayme_ledger
REDIS_URL=redis://redis:6379

# Security Configuration
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key

# Integration Configuration
USER_SERVICE_URL=http://user-service:3002
ASSET_SERVICE_URL=http://asset-service:3003
CURRENCY_SERVICE_URL=http://currency-conversion-service:3004
CRYPTO_SERVICE_URL=http://crypto-service:3005
PAYMENT_SERVICE_URL=http://payment-service:3006

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage
```

### Test Data
```bash
# Seed test data
npm run seed:test

# Reset test database
npm run db:reset:test
```

## 📊 Monitoring & Observability

### Health Checks
- **Endpoint**: `GET /health`
- **Database Connectivity**: MongoDB connection status
- **Service Dependencies**: Integration service health
- **Performance Metrics**: Response times, memory usage

### Logging
- **Structured Logging**: JSON format with correlation IDs
- **Audit Trails**: Complete transaction and account change logs
- **Error Tracking**: Comprehensive error logging with stack traces
- **Performance Monitoring**: Request/response timing and metrics

### Metrics
- **Transaction Volume**: Real-time transaction processing metrics
- **Account Balances**: Aggregate balance monitoring
- **Error Rates**: Service error rate tracking
- **Response Times**: API endpoint performance metrics

## 🔐 Security

### Authentication & Authorization
- **JWT Token Validation**: Secure token-based authentication
- **Role-Based Access Control**: Granular permission management
- **API Key Authentication**: Service-to-service authentication

### Data Protection
- **Encryption at Rest**: AES-256 encryption for sensitive data
- **Encryption in Transit**: TLS 1.3 for all communications
- **Data Masking**: PII protection in logs and responses
- **Audit Logging**: Immutable audit trails with hash verification

### Compliance
- **SOX Compliance**: Financial reporting and internal controls
- **GDPR Compliance**: Data privacy and protection
- **PCI DSS**: Payment card industry security standards
- **AML/KYC Integration**: Anti-money laundering compliance

## 🚀 Deployment

### Production Deployment
```bash
# Build production image
docker build -t swiftpayme/ledger-service:latest .

# Deploy with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ledger-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ledger-service
  template:
    metadata:
      labels:
        app: ledger-service
    spec:
      containers:
      - name: ledger-service
        image: swiftpayme/ledger-service:latest
        ports:
        - containerPort: 3010
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: ledger-secrets
              key: mongodb-uri
```

## 🤝 Integration Examples

### Asset Service Integration
```typescript
// Process asset deposit
const result = await ledgerService.processAssetDeposit(
  'user-123',
  'deposit-456', 
  'gold',
  '1000.00',
  'USD',
  'system'
);
```

### Crypto Service Integration
```typescript
// Process Bitcoin purchase
const result = await ledgerService.processBitcoinPurchase(
  'user-123',
  '1000.00',
  '0.025',
  '40000.00',
  'system'
);
```

## 📋 Business Rules

### Account Management
- **Account Numbers**: Auto-generated based on account type and currency
- **Balance Validation**: Negative balances only allowed for specific account types
- **Currency Restrictions**: Each account supports only one currency
- **Hierarchy Limits**: Maximum 5 levels of account hierarchy

### Transaction Processing
- **Minimum Amounts**: $0.01 minimum for fiat, 0.00000001 for crypto
- **Daily Limits**: Configurable per user and account type
- **Approval Thresholds**: Transactions above $10,000 require approval
- **Reversal Window**: 24-hour window for transaction reversals

### Journal Entries
- **Balance Requirement**: Debits must equal credits
- **Approval Workflow**: High-value entries require multi-level approval
- **Posting Restrictions**: Only balanced entries can be posted
- **Reversal Rules**: Only posted entries can be reversed

## 🔄 Event Integration

### Published Events
```typescript
// Account events
'account.created'
'account.updated'
'account.balance.changed'

// Transaction events
'transaction.processed'
'transaction.completed'
'transaction.failed'
'transaction.reversed'

// Journal entry events
'journal_entry.created'
'journal_entry.posted'
'journal_entry.reversed'
```

### Consumed Events
```typescript
// From Asset Service
'asset.deposit.verified'
'asset.withdrawal.requested'

// From Crypto Service
'bitcoin.transaction.confirmed'
'wallet.balance.updated'

// From Payment Service
'payment.workflow.completed'
'payment.step.processed'
```

## 📞 Support

### Documentation
- **API Documentation**: Available at `/api/docs`
- **Technical Specifications**: See `/docs` directory
- **Integration Guides**: Service-specific integration examples

### Troubleshooting
- **Common Issues**: See troubleshooting guide
- **Error Codes**: Complete error code reference
- **Performance Tuning**: Optimization recommendations

### Contact
- **Technical Support**: [support@swiftpayme.com](mailto:support@swiftpayme.com)
- **Documentation**: [docs.swiftpayme.com](https://docs.swiftpayme.com)
- **GitHub Issues**: [GitHub Repository](https://github.com/osparrot/swiftpayment)

---

**SwiftPayMe Ledger Service** - Powering financial accuracy and compliance for the next generation of payment platforms. 🚀

