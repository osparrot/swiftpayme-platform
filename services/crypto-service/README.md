# SwiftPayMe Crypto Service

The Crypto Service is a comprehensive Bitcoin and cryptocurrency management microservice for the SwiftPayMe payment system. It provides secure wallet management, transaction processing, Lightning Network integration, and multi-signature support for Bitcoin operations.

## Features

### Bitcoin Wallet Management
- **HD Wallet Generation**: BIP32/BIP44/BIP84 compliant hierarchical deterministic wallets
- **Multi-Signature Wallets**: Support for M-of-N multi-signature configurations
- **Address Generation**: Automatic address generation with gap limit management
- **Watch-Only Wallets**: Monitor addresses without private key access
- **Wallet Import/Export**: Support for various wallet formats and standards

### Transaction Processing
- **Transaction Creation**: Build and sign Bitcoin transactions
- **UTXO Management**: Intelligent coin selection and UTXO optimization
- **Fee Estimation**: Dynamic fee calculation based on network conditions
- **RBF Support**: Replace-by-fee for transaction acceleration
- **Batch Transactions**: Process multiple transactions efficiently

### Lightning Network Integration
- **Channel Management**: Open, close, and monitor Lightning channels
- **Invoice Generation**: Create and manage Lightning invoices
- **Payment Processing**: Send and receive Lightning payments
- **Route Finding**: Optimal path discovery for Lightning payments
- **Channel Balancing**: Automated channel liquidity management

### Security Features
- **Secure Key Management**: Hardware security module (HSM) integration
- **Multi-Signature Support**: Enterprise-grade multi-signature workflows
- **Encrypted Storage**: AES-256 encryption for sensitive data
- **Audit Logging**: Comprehensive transaction and access logging
- **Compliance Integration**: AML/KYC compliance checking

### Network Support
- **Multiple Networks**: Mainnet, Testnet, and Regtest support
- **Real-Time Monitoring**: Block and transaction monitoring
- **Network Health**: Connection and sync status monitoring
- **Mempool Analysis**: Transaction fee and confirmation time analysis

## API Endpoints

### Wallet Management
- `POST /api/crypto/wallets` - Create new wallet
- `GET /api/crypto/wallets/:walletId` - Get wallet details
- `PUT /api/crypto/wallets/:walletId` - Update wallet settings
- `DELETE /api/crypto/wallets/:walletId` - Deactivate wallet
- `GET /api/crypto/wallets/:walletId/balance` - Get wallet balance
- `POST /api/crypto/wallets/:walletId/addresses` - Generate new address
- `GET /api/crypto/wallets/:walletId/addresses` - List wallet addresses
- `POST /api/crypto/wallets/multisig` - Create multi-signature wallet
- `POST /api/crypto/wallets/import` - Import existing wallet
- `GET /api/crypto/wallets/:walletId/export` - Export wallet data

### Transaction Management
- `POST /api/crypto/transactions` - Create new transaction
- `GET /api/crypto/transactions/:txId` - Get transaction details
- `POST /api/crypto/transactions/:txId/sign` - Sign transaction
- `POST /api/crypto/transactions/:txId/broadcast` - Broadcast transaction
- `GET /api/crypto/transactions` - List transactions with filters
- `POST /api/crypto/transactions/batch` - Create batch transactions
- `GET /api/crypto/transactions/:txId/status` - Get transaction status
- `POST /api/crypto/transactions/:txId/cancel` - Cancel pending transaction

### Address Management
- `POST /api/crypto/addresses/validate` - Validate Bitcoin address
- `GET /api/crypto/addresses/:address/info` - Get address information
- `GET /api/crypto/addresses/:address/transactions` - Get address transactions
- `GET /api/crypto/addresses/:address/utxos` - Get address UTXOs
- `POST /api/crypto/addresses/:address/label` - Add address label

### Lightning Network
- `POST /api/crypto/lightning/invoices` - Create Lightning invoice
- `GET /api/crypto/lightning/invoices/:hash` - Get invoice details
- `POST /api/crypto/lightning/payments` - Send Lightning payment
- `GET /api/crypto/lightning/payments/:hash` - Get payment details
- `GET /api/crypto/lightning/channels` - List Lightning channels
- `POST /api/crypto/lightning/channels` - Open Lightning channel
- `DELETE /api/crypto/lightning/channels/:channelId` - Close Lightning channel
- `GET /api/crypto/lightning/balance` - Get Lightning balance
- `GET /api/crypto/lightning/routes/:destination` - Find payment routes

### Network Information
- `GET /api/crypto/network/info` - Get network information
- `GET /api/crypto/network/blocks/:height` - Get block information
- `GET /api/crypto/network/mempool` - Get mempool information
- `GET /api/crypto/network/fees` - Get fee recommendations
- `GET /api/crypto/network/peers` - Get connected peers

### Admin & Analytics
- `GET /api/crypto/admin/wallets` - List all wallets (admin)
- `GET /api/crypto/admin/transactions` - List all transactions (admin)
- `GET /api/crypto/admin/metrics` - Get service metrics
- `POST /api/crypto/admin/sync` - Force wallet synchronization
- `GET /api/crypto/admin/health` - Detailed health information

## Environment Variables

```env
# Server Configuration
PORT=3007
NODE_ENV=production
HOST=0.0.0.0
SERVICE_VERSION=1.0.0

# Database
MONGODB_URI=mongodb://admin:password@mongodb:27017/swiftpay_crypto?authSource=admin
DB_POOL_SIZE=10
DB_TIMEOUT=5000
DB_SOCKET_TIMEOUT=45000

# Redis Cache
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=your-redis-password

# Bitcoin Core Configuration
BITCOIN_NETWORK=testnet
BITCOIN_RPC_HOST=bitcoin-core
BITCOIN_RPC_PORT=18332
BITCOIN_RPC_USER=bitcoin
BITCOIN_RPC_PASSWORD=your-bitcoin-rpc-password
BITCOIN_RPC_TIMEOUT=30000

# Lightning Network Configuration
LIGHTNING_ENABLED=true
LIGHTNING_NETWORK=testnet
LIGHTNING_HOST=lnd
LIGHTNING_PORT=10009
LIGHTNING_TLS_CERT_PATH=/app/certs/tls.cert
LIGHTNING_MACAROON_PATH=/app/certs/admin.macaroon

# External Services
USER_SERVICE_URL=http://user-service:3002
CURRENCY_SERVICE_URL=http://currency-conversion-service:3006
ASSET_SERVICE_URL=http://asset-service:3005
NOTIFICATION_SERVICE_URL=http://notification-service:3009

# Security
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-32-byte-encryption-key
API_KEY_SECRET=your-api-key-secret

# Wallet Configuration
WALLET_PASSPHRASE=your-wallet-passphrase
DEFAULT_FEE_RATE=10
ADDRESS_GAP_LIMIT=20
ENABLE_RBF=true
ENABLE_COIN_CONTROL=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
HEALTH_CHECK_INTERVAL=30000
SYNC_INTERVAL=300000

# ZMQ Configuration (optional)
ENABLE_ZMQ=false
ZMQ_HOST=bitcoin-core
ZMQ_PORT=28332

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3011,http://localhost:8080

# Timeouts
SERVER_TIMEOUT=30000
KEEP_ALIVE_TIMEOUT=65000
HEADERS_TIMEOUT=66000
SHUTDOWN_TIMEOUT=30000
```

## Data Models

### BitcoinWallet
Comprehensive wallet management:
- Wallet metadata and configuration
- HD wallet derivation paths
- Multi-signature setup
- Address management
- Balance tracking
- Transaction history

### BitcoinTransaction
Transaction lifecycle management:
- Transaction creation and signing
- Multi-signature coordination
- Broadcasting and confirmation
- Fee management
- Status tracking

### BitcoinAddress
Address management:
- Address generation and validation
- Derivation path tracking
- Balance monitoring
- Transaction association
- Label management

### LightningInvoice
Lightning Network invoice management:
- Payment request generation
- Expiry management
- Payment tracking
- Description and metadata

### LightningChannel
Lightning channel management:
- Channel opening and closing
- Balance monitoring
- Route management
- Fee configuration

## Bitcoin Core Integration

### RPC Interface
- **Connection Management**: Persistent RPC connections with retry logic
- **Authentication**: Username/password authentication
- **Error Handling**: Comprehensive error handling and logging
- **Timeout Management**: Configurable timeouts for all operations

### Supported Operations
- **Blockchain Queries**: Block and transaction information
- **Wallet Operations**: Address generation, transaction creation
- **Network Information**: Peer connections, mempool status
- **Raw Transactions**: Transaction creation and broadcasting

### ZMQ Integration (Optional)
- **Real-Time Notifications**: Block and transaction notifications
- **Event Processing**: Automated wallet synchronization
- **Performance Optimization**: Reduced polling overhead

## Lightning Network Integration

### LND Integration
- **gRPC Interface**: Native LND gRPC client integration
- **Macaroon Authentication**: Secure authentication with macaroons
- **TLS Encryption**: Encrypted communication with LND node

### Supported Features
- **Invoice Management**: Create and track Lightning invoices
- **Payment Processing**: Send and receive Lightning payments
- **Channel Management**: Open, close, and monitor channels
- **Route Finding**: Optimal payment route discovery
- **Balance Management**: Channel and wallet balance tracking

## Security Architecture

### Key Management
- **Hierarchical Deterministic**: BIP32/BIP44/BIP84 key derivation
- **Secure Storage**: AES-256 encryption for private keys
- **Hardware Security**: HSM integration for enterprise deployments
- **Multi-Signature**: M-of-N signature schemes

### Access Control
- **JWT Authentication**: Token-based authentication
- **API Key Management**: Service-to-service authentication
- **Role-Based Access**: User permission management
- **Audit Logging**: Comprehensive access and operation logging

### Compliance
- **AML Integration**: Anti-money laundering checks
- **KYC Verification**: Know-your-customer compliance
- **Transaction Monitoring**: Suspicious activity detection
- **Regulatory Reporting**: Compliance reporting capabilities

## Monitoring & Analytics

### Health Monitoring
- **Service Health**: Component status monitoring
- **Network Health**: Bitcoin and Lightning network status
- **Performance Metrics**: Response times and throughput
- **Error Tracking**: Error rates and failure analysis

### Business Metrics
- **Wallet Statistics**: Active wallets and balances
- **Transaction Volume**: Transaction counts and amounts
- **Lightning Activity**: Channel and payment statistics
- **Fee Analysis**: Fee optimization and cost analysis

### Alerting
- **Network Issues**: Bitcoin Core and Lightning connectivity
- **Transaction Failures**: Failed or stuck transactions
- **Security Events**: Suspicious activity detection
- **Performance Degradation**: Service performance issues

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

# Bitcoin Core operations
npm run bitcoin:start
npm run bitcoin:stop

# Lightning Network operations
npm run lnd:start
npm run lnd:stop
```

## Docker

```bash
# Build image
docker build -t swiftpayme-crypto-service .

# Run container
docker run -p 3007:3007 swiftpayme-crypto-service

# Run with Bitcoin Core
docker-compose up crypto-service bitcoin-core
```

## Testing

### Unit Tests
- Service layer testing
- Bitcoin transaction creation
- Lightning Network operations
- Wallet management functions

### Integration Tests
- Bitcoin Core integration
- Lightning Network integration
- Database operations
- External service communication

### End-to-End Tests
- Complete transaction workflows
- Multi-signature operations
- Lightning payment flows
- Error handling scenarios

## API Examples

### Create HD Wallet
```bash
curl -X POST http://localhost:3007/api/crypto/wallets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "userId": "user123",
    "name": "My Bitcoin Wallet",
    "type": "hd"
  }'
```

### Create Multi-Signature Wallet
```bash
curl -X POST http://localhost:3007/api/crypto/wallets/multisig \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "userIds": ["user1", "user2", "user3"],
    "requiredSignatures": 2,
    "name": "Company Multi-Sig Wallet"
  }'
```

### Create Transaction
```bash
curl -X POST http://localhost:3007/api/crypto/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "fromWalletId": "btc_user123_1234567890",
    "toAddress": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
    "amount": 100000,
    "feeRate": 10
  }'
```

### Create Lightning Invoice
```bash
curl -X POST http://localhost:3007/api/crypto/lightning/invoices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "amount": 50000,
    "description": "Payment for services",
    "expiry": 3600
  }'
```

## Error Handling

The service provides comprehensive error handling:
- **Validation Errors**: Invalid input parameters
- **Network Errors**: Bitcoin Core or Lightning Network connectivity
- **Insufficient Funds**: Wallet balance validation
- **Transaction Errors**: Invalid transactions or broadcast failures
- **Authentication Errors**: Invalid tokens or permissions

## Performance Optimization

### Caching Strategy
- **Wallet Data**: Redis caching for frequently accessed wallets
- **Transaction Data**: Cached transaction details and status
- **Network Data**: Cached block and network information
- **Address Data**: Cached address balances and transactions

### Connection Pooling
- **Database Connections**: MongoDB connection pooling
- **RPC Connections**: Bitcoin Core RPC connection management
- **gRPC Connections**: Lightning Network connection pooling

### Batch Operations
- **Transaction Processing**: Batch transaction creation and broadcasting
- **Address Generation**: Bulk address generation
- **Balance Updates**: Batch wallet balance synchronization

## Compliance & Regulations

### AML/KYC Integration
- **Transaction Monitoring**: Real-time transaction analysis
- **Risk Scoring**: Automated risk assessment
- **Compliance Reporting**: Regulatory reporting capabilities
- **Sanctions Screening**: OFAC and sanctions list checking

### Data Protection
- **GDPR Compliance**: European data protection compliance
- **Data Encryption**: End-to-end encryption for sensitive data
- **Access Logging**: Comprehensive audit trails
- **Data Retention**: Configurable data retention policies

## Deployment

### Production Deployment
- **Docker Containers**: Containerized deployment
- **Kubernetes**: Orchestration and scaling
- **Load Balancing**: High availability configuration
- **Monitoring**: Comprehensive monitoring and alerting

### Security Considerations
- **Network Security**: VPC and firewall configuration
- **Certificate Management**: TLS certificate management
- **Secret Management**: Secure secret storage and rotation
- **Access Control**: Network and application access controls

## Troubleshooting

### Common Issues
- **Bitcoin Core Connection**: RPC connectivity problems
- **Lightning Network**: Channel and payment issues
- **Transaction Failures**: Common transaction error scenarios
- **Synchronization**: Wallet sync and balance update issues

### Debugging
- **Log Analysis**: Comprehensive logging and analysis
- **Health Checks**: Service and component health monitoring
- **Metrics**: Performance and business metrics
- **Tracing**: Request tracing and debugging

## Support

For technical support and documentation:
- **API Documentation**: Detailed API reference
- **Integration Guides**: Step-by-step integration guides
- **Best Practices**: Security and performance best practices
- **Community Support**: Developer community and forums

