# SwiftPayMe Payment Processing Service

The Payment Processing Service is the core orchestration engine for the SwiftPayMe payment system. It coordinates complex workflows between all microservices to enable seamless asset-to-fiat-to-crypto transactions, providing a unified payment experience for users depositing physical assets and purchasing Bitcoin.

## Features

### Workflow Orchestration
- **Asset Deposit Workflow**: Complete lifecycle from physical asset submission to fiat account crediting
- **Bitcoin Purchase Workflow**: Seamless conversion from fiat balance to Bitcoin holdings
- **Fiat Transfer Workflow**: Internal transfers between user accounts
- **Crypto Transfer Workflow**: Bitcoin transfers to external wallets
- **Composite Workflows**: End-to-end asset-to-Bitcoin conversion

### Transaction Processing
- **Multi-Step Transactions**: Complex transactions broken into manageable steps
- **State Management**: Persistent workflow state with recovery capabilities
- **Error Handling**: Comprehensive error handling with retry mechanisms
- **Rollback Support**: Transaction rollback for failed workflows
- **Idempotency**: Safe retry of operations without side effects

### Service Integration
- **User Service**: Account management and balance operations
- **Asset Service**: Physical asset verification and valuation
- **Currency Service**: Real-time exchange rates and conversions
- **Crypto Service**: Bitcoin wallet and transaction management
- **Notification Service**: Real-time user notifications

### Queue Management
- **Asynchronous Processing**: Background processing of long-running operations
- **Priority Queues**: Priority-based job processing
- **Dead Letter Queues**: Failed job handling and analysis
- **Job Scheduling**: Delayed and recurring job execution
- **Load Balancing**: Distributed processing across multiple workers

### Analytics & Monitoring
- **Real-Time Metrics**: Live workflow and transaction metrics
- **Performance Analytics**: Processing time and success rate analysis
- **Business Intelligence**: Revenue and volume analytics
- **Compliance Reporting**: Regulatory compliance and audit trails
- **Health Monitoring**: Service health and dependency monitoring

## API Endpoints

### Workflow Management
- `POST /api/payments/asset-deposit` - Initiate asset deposit workflow
- `POST /api/payments/bitcoin-purchase` - Initiate Bitcoin purchase workflow
- `POST /api/payments/fiat-transfer` - Initiate fiat transfer workflow
- `POST /api/payments/crypto-transfer` - Initiate crypto transfer workflow
- `GET /api/payments/workflows/:id` - Get workflow status and details
- `PUT /api/payments/workflows/:id/cancel` - Cancel active workflow
- `GET /api/payments/workflows` - List user workflows with filters

### Transaction Management
- `GET /api/transactions` - List transactions with filters
- `GET /api/transactions/:id` - Get transaction details
- `POST /api/transactions/:id/retry` - Retry failed transaction
- `GET /api/transactions/history` - Get transaction history
- `GET /api/transactions/pending` - Get pending transactions

### Asset Processing
- `GET /api/assets/deposits` - List asset deposits
- `GET /api/assets/deposits/:id` - Get asset deposit details
- `PUT /api/assets/deposits/:id/verify` - Update asset verification
- `PUT /api/assets/deposits/:id/value` - Update asset valuation
- `POST /api/assets/deposits/:id/credit` - Credit fiat account

### Crypto Operations
- `GET /api/crypto/purchases` - List crypto purchases
- `GET /api/crypto/purchases/:id` - Get purchase details
- `POST /api/crypto/purchases/:id/execute` - Execute crypto purchase
- `GET /api/crypto/wallets` - List user wallets
- `POST /api/crypto/transfers` - Create crypto transfer

### Analytics & Reporting
- `GET /api/payments/metrics` - Get payment metrics
- `GET /api/payments/analytics` - Get payment analytics
- `GET /api/payments/reports/daily` - Get daily payment report
- `GET /api/payments/reports/monthly` - Get monthly payment report
- `GET /api/payments/compliance` - Get compliance report

### Admin Operations
- `GET /api/admin/workflows` - List all workflows (admin)
- `GET /api/admin/transactions` - List all transactions (admin)
- `POST /api/admin/workflows/:id/override` - Override workflow step (admin)
- `GET /api/admin/queues` - Get queue status (admin)
- `POST /api/admin/queues/:name/pause` - Pause queue processing (admin)
- `POST /api/admin/queues/:name/resume` - Resume queue processing (admin)

## Environment Variables

```env
# Server Configuration
PORT=3004
NODE_ENV=production
HOST=0.0.0.0
SERVICE_VERSION=1.0.0

# Database
MONGODB_URI=mongodb://admin:password@mongodb:27017/swiftpay_payments?authSource=admin
DB_POOL_SIZE=10
DB_TIMEOUT=5000
DB_SOCKET_TIMEOUT=45000

# Redis Cache & Queues
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=your-redis-password

# External Services
USER_SERVICE_URL=http://user-service:3002
ASSET_SERVICE_URL=http://asset-service:3005
CURRENCY_SERVICE_URL=http://currency-conversion-service:3006
CRYPTO_SERVICE_URL=http://crypto-service:3007
NOTIFICATION_SERVICE_URL=http://notification-service:3009

# Security
JWT_SECRET=your-super-secret-jwt-key
API_KEY_SECRET=your-api-key-secret
ENCRYPTION_KEY=your-32-byte-encryption-key

# Workflow Configuration
WORKFLOW_TIMEOUT_HOURS=24
ASSET_DEPOSIT_TIMEOUT_DAYS=7
BITCOIN_PURCHASE_TIMEOUT_HOURS=1
FIAT_TRANSFER_TIMEOUT_HOURS=24

# Queue Configuration
QUEUE_CONCURRENCY=5
QUEUE_MAX_RETRIES=3
QUEUE_RETRY_DELAY=5000
QUEUE_FAILED_RETENTION_DAYS=7

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false

# Processing Limits
MAX_ASSET_DEPOSIT_VALUE=100000
MAX_BITCOIN_PURCHASE_AMOUNT=50000
MAX_FIAT_TRANSFER_AMOUNT=25000
MIN_TRANSACTION_AMOUNT=1

# Fees Configuration
ASSET_DEPOSIT_FEE_PERCENTAGE=2.5
BITCOIN_PURCHASE_FEE_PERCENTAGE=1.5
FIAT_TRANSFER_FEE_FIXED=5.00
CRYPTO_TRANSFER_FEE_PERCENTAGE=0.5

# Compliance
ENABLE_AML_CHECKS=true
ENABLE_KYC_VERIFICATION=true
ENABLE_SANCTIONS_SCREENING=true
AUTO_APPROVAL_THRESHOLD=1000
MANUAL_REVIEW_THRESHOLD=10000

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
HEALTH_CHECK_INTERVAL=30000
ANALYTICS_UPDATE_INTERVAL=300000

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3011,http://localhost:8080

# Timeouts
SERVER_TIMEOUT=30000
KEEP_ALIVE_TIMEOUT=65000
HEADERS_TIMEOUT=66000
SHUTDOWN_TIMEOUT=30000
MAX_REQUEST_SIZE=10mb

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
ENABLE_REQUEST_LOGGING=true
ENABLE_ERROR_TRACKING=true
```

## Workflow Types

### Asset Deposit Workflow
Complete lifecycle for physical asset processing:

1. **Asset Submission** - User submits asset details and images
2. **Asset Verification** - Professional verification of authenticity
3. **Asset Valuation** - Market-based valuation in target currency
4. **Fiat Crediting** - Credit user's fiat account with asset value

**Timeline**: 3-7 business days
**Participants**: User, Asset Service, Currency Service, User Service

### Bitcoin Purchase Workflow
Seamless fiat-to-Bitcoin conversion:

1. **Balance Check** - Verify sufficient fiat balance
2. **Currency Conversion** - Get current Bitcoin exchange rate
3. **Bitcoin Purchase** - Execute purchase at market rate
4. **Wallet Crediting** - Credit Bitcoin to user's wallet

**Timeline**: 1-5 minutes
**Participants**: User, Currency Service, Crypto Service, User Service

### Fiat Transfer Workflow
Internal fiat transfers between users:

1. **Balance Check** - Verify sender's balance
2. **Recipient Verification** - Validate recipient account
3. **Transfer Execution** - Execute the transfer
4. **Confirmation** - Confirm completion to both parties

**Timeline**: Instant
**Participants**: Sender, Recipient, User Service

### Crypto Transfer Workflow
Bitcoin transfers to external wallets:

1. **Wallet Verification** - Verify source wallet and balance
2. **Address Validation** - Validate destination address
3. **Transaction Creation** - Create Bitcoin transaction
4. **Broadcasting** - Broadcast to Bitcoin network

**Timeline**: 10-60 minutes (depending on network)
**Participants**: User, Crypto Service, Bitcoin Network

## Data Models

### PaymentWorkflow
Core workflow management:
- Workflow metadata and status
- Step-by-step progress tracking
- Context data and results
- Error handling and recovery
- Timeout and expiration management

### PaymentTransaction
Individual transaction tracking:
- Transaction details and amounts
- Status and processing history
- Balance changes and reconciliation
- Fee calculation and application
- Audit trail and compliance data

### AssetDeposit
Physical asset deposit tracking:
- Asset details and documentation
- Verification and valuation process
- Status updates and notifications
- Integration with Asset Service
- Compliance and audit requirements

### CryptoPurchase
Bitcoin purchase management:
- Purchase details and exchange rates
- Execution status and confirmations
- Wallet integration and crediting
- Fee calculation and application
- Market data and analytics

## Service Integration

### User Service Integration
- **Balance Management**: Real-time balance updates and verification
- **Account Operations**: Debit/credit operations with transaction history
- **User Verification**: KYC/AML status and compliance checks
- **Notification Preferences**: User communication preferences

### Asset Service Integration
- **Deposit Processing**: Asset submission and verification coordination
- **Valuation Updates**: Real-time asset valuation and pricing
- **Status Synchronization**: Workflow status updates and notifications
- **Compliance Integration**: AML and sanctions screening

### Currency Service Integration
- **Exchange Rates**: Real-time currency and Bitcoin pricing
- **Conversion Calculations**: Multi-currency conversion support
- **Market Data**: Historical pricing and trend analysis
- **Fee Calculations**: Dynamic fee calculation based on market conditions

### Crypto Service Integration
- **Wallet Management**: Bitcoin wallet creation and management
- **Transaction Processing**: Bitcoin transaction creation and broadcasting
- **Address Validation**: Bitcoin address verification and validation
- **Network Monitoring**: Bitcoin network status and confirmation tracking

### Notification Service Integration
- **Workflow Notifications**: Real-time workflow status updates
- **Transaction Alerts**: Transaction completion and failure notifications
- **Compliance Alerts**: AML/KYC and compliance notifications
- **Marketing Communications**: Promotional and educational content

## Queue Management

### Queue Types
- **Asset Processing Queue**: Asset verification and valuation jobs
- **Bitcoin Purchase Queue**: Bitcoin purchase execution jobs
- **Fiat Transfer Queue**: Internal transfer processing jobs
- **Notification Queue**: User notification delivery jobs
- **Analytics Queue**: Metrics and analytics calculation jobs

### Job Processing
- **Priority Levels**: Critical, high, normal, low priority processing
- **Retry Logic**: Exponential backoff with maximum retry limits
- **Dead Letter Handling**: Failed job analysis and manual intervention
- **Load Balancing**: Distributed processing across multiple workers
- **Monitoring**: Real-time queue metrics and alerting

### Queue Configuration
```javascript
const queueConfig = {
  assetProcessing: {
    concurrency: 3,
    maxRetries: 5,
    retryDelay: 10000,
    priority: 'high'
  },
  bitcoinPurchase: {
    concurrency: 10,
    maxRetries: 3,
    retryDelay: 5000,
    priority: 'critical'
  },
  fiatTransfer: {
    concurrency: 15,
    maxRetries: 3,
    retryDelay: 2000,
    priority: 'high'
  },
  notifications: {
    concurrency: 20,
    maxRetries: 5,
    retryDelay: 1000,
    priority: 'normal'
  }
};
```

## Error Handling

### Error Categories
- **Validation Errors**: Invalid input parameters or data
- **Business Logic Errors**: Insufficient balance, invalid operations
- **External Service Errors**: Third-party service failures
- **Network Errors**: Connectivity and timeout issues
- **System Errors**: Database and infrastructure failures

### Recovery Strategies
- **Automatic Retry**: Transient errors with exponential backoff
- **Manual Intervention**: Complex errors requiring human review
- **Workflow Rollback**: Partial transaction reversal and cleanup
- **Compensation**: Alternative processing paths and workarounds
- **Escalation**: Critical error escalation and alerting

### Error Monitoring
```javascript
const errorHandling = {
  retryableErrors: [
    'NETWORK_TIMEOUT',
    'SERVICE_UNAVAILABLE',
    'RATE_LIMIT_EXCEEDED',
    'TEMPORARY_FAILURE'
  ],
  nonRetryableErrors: [
    'INVALID_INPUT',
    'INSUFFICIENT_BALANCE',
    'UNAUTHORIZED',
    'FORBIDDEN'
  ],
  escalationThreshold: 5,
  alertingEnabled: true
};
```

## Security & Compliance

### Security Features
- **JWT Authentication**: Secure API access with token validation
- **API Key Management**: Service-to-service authentication
- **Data Encryption**: Sensitive data encryption at rest and in transit
- **Audit Logging**: Comprehensive audit trail for all operations
- **Rate Limiting**: API abuse prevention and fair usage

### Compliance Integration
- **AML Screening**: Anti-money laundering checks and monitoring
- **KYC Verification**: Know-your-customer compliance validation
- **Sanctions Screening**: OFAC and sanctions list verification
- **Transaction Monitoring**: Suspicious activity detection and reporting
- **Regulatory Reporting**: Compliance reporting and documentation

### Risk Management
```javascript
const riskManagement = {
  transactionLimits: {
    daily: 50000,
    monthly: 200000,
    single: 25000
  },
  riskScoring: {
    lowRisk: { threshold: 30, autoApprove: true },
    mediumRisk: { threshold: 70, manualReview: true },
    highRisk: { threshold: 100, reject: true }
  },
  complianceChecks: {
    aml: true,
    kyc: true,
    sanctions: true,
    pep: true
  }
};
```

## Analytics & Reporting

### Real-Time Metrics
- **Workflow Metrics**: Active, completed, and failed workflows
- **Transaction Volume**: Daily, weekly, and monthly transaction volumes
- **Processing Times**: Average and percentile processing times
- **Success Rates**: Workflow and transaction success rates
- **Revenue Metrics**: Fee collection and revenue analytics

### Business Intelligence
- **User Analytics**: User behavior and transaction patterns
- **Asset Analytics**: Asset deposit trends and valuations
- **Bitcoin Analytics**: Bitcoin purchase volumes and trends
- **Performance Analytics**: Service performance and optimization opportunities
- **Compliance Analytics**: Compliance metrics and risk indicators

### Reporting Dashboard
```javascript
const analyticsConfig = {
  realTimeMetrics: {
    updateInterval: 30000,
    retentionPeriod: '7d',
    aggregationLevels: ['minute', 'hour', 'day']
  },
  businessReports: {
    daily: { schedule: '0 6 * * *', recipients: ['admin@swiftpayme.com'] },
    weekly: { schedule: '0 6 * * 1', recipients: ['management@swiftpayme.com'] },
    monthly: { schedule: '0 6 1 * *', recipients: ['board@swiftpayme.com'] }
  },
  customDashboards: {
    operations: ['workflows', 'transactions', 'queues'],
    business: ['revenue', 'volume', 'users'],
    compliance: ['aml', 'kyc', 'risk']
  }
};
```

## Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Lint code
npm run lint
```

## Docker

```bash
# Build image
docker build -t swiftpayme-payment-service .

# Run container
docker run -p 3004:3004 swiftpayme-payment-service

# Run with dependencies
docker-compose up payment-service
```

## Testing

### Unit Tests
- Workflow orchestration logic
- Transaction processing functions
- Service integration mocks
- Error handling scenarios

### Integration Tests
- End-to-end workflow testing
- Service communication testing
- Database operations testing
- Queue processing testing

### Load Testing
- High-volume transaction processing
- Concurrent workflow execution
- Queue performance under load
- Service scalability testing

## API Examples

### Initiate Asset Deposit
```bash
curl -X POST http://localhost:3004/api/payments/asset-deposit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "assetType": "gold",
    "assetDetails": {
      "weight": 31.1,
      "purity": 0.999,
      "condition": "excellent",
      "certificates": ["cert123.pdf"],
      "images": ["gold1.jpg", "gold2.jpg"]
    },
    "targetCurrency": "USD"
  }'
```

### Purchase Bitcoin
```bash
curl -X POST http://localhost:3004/api/payments/bitcoin-purchase \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "amount": 1000,
    "currency": "USD",
    "destinationWallet": "internal"
  }'
```

### Transfer Fiat
```bash
curl -X POST http://localhost:3004/api/payments/fiat-transfer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "toUserId": "user456",
    "amount": 500,
    "currency": "USD",
    "memo": "Payment for services"
  }'
```

### Check Workflow Status
```bash
curl -X GET http://localhost:3004/api/payments/workflows/workflow123 \
  -H "Authorization: Bearer $JWT_TOKEN"
```

## Monitoring & Alerting

### Health Checks
- Service health and dependency status
- Database connectivity and performance
- Queue health and processing rates
- External service availability

### Performance Monitoring
- Request/response times and throughput
- Database query performance
- Queue processing metrics
- Memory and CPU utilization

### Business Alerting
- Failed workflow notifications
- High-value transaction alerts
- Compliance violation alerts
- System performance degradation

## Deployment

### Production Deployment
- Docker containerization with multi-stage builds
- Kubernetes orchestration with auto-scaling
- Load balancing and service discovery
- Blue-green deployment strategy

### Configuration Management
- Environment-specific configuration
- Secret management and rotation
- Feature flag management
- A/B testing configuration

### Monitoring Stack
- Prometheus metrics collection
- Grafana dashboards and visualization
- ELK stack for log aggregation
- PagerDuty for incident management

## Troubleshooting

### Common Issues
- Workflow stuck in processing state
- Transaction timeout and retry failures
- Service communication errors
- Queue processing bottlenecks

### Debugging Tools
- Workflow status and step tracking
- Transaction audit trails
- Service health dashboards
- Queue monitoring and management

### Performance Optimization
- Database query optimization
- Queue processing tuning
- Service communication optimization
- Caching strategy implementation

## Support

For technical support and documentation:
- **API Documentation**: Comprehensive API reference and examples
- **Integration Guides**: Step-by-step integration documentation
- **Best Practices**: Security and performance recommendations
- **Community Support**: Developer community and forums

