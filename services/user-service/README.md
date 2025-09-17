# SwiftPayMe User Service

The User Service is a core microservice in the SwiftPayMe payment system that handles user management, authentication, and payment-related user data including physical asset deposits, fiat accounts, and Bitcoin wallets.

## Features

### Core User Management
- User registration and authentication
- Profile management and verification
- Multi-factor authentication support
- Session management and security

### SwiftPayMe Payment Features
- **Physical Asset Deposits**: Track gold, silver, and diamond deposits
- **Fiat Account Management**: Multi-currency fiat account balances
- **Bitcoin Wallet Integration**: Internal and external wallet management
- **Transaction History**: Comprehensive transaction tracking
- **KYC/AML Verification**: Enhanced compliance and verification
- **Trading Limits**: Dynamic limits based on verification levels

### Security & Compliance
- Enhanced KYC verification with document management
- AML, sanctions, and PEP compliance checks
- Risk scoring and assessment
- Secure password management with history
- API key management for service integration

## API Endpoints

### User Management
- `POST /api/users/register` - User registration
- `POST /api/users/login` - User authentication
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/verify-email` - Email verification
- `POST /api/users/verify-phone` - Phone verification

### Asset Management
- `POST /api/users/assets/deposit` - Submit asset deposit
- `GET /api/users/assets/deposits` - Get user's asset deposits
- `GET /api/users/assets/deposits/:id` - Get specific deposit details

### Fiat Accounts
- `GET /api/users/accounts/fiat` - Get fiat account balances
- `GET /api/users/accounts/fiat/:currency` - Get specific currency balance
- `POST /api/users/accounts/fiat/transfer` - Transfer between accounts

### Bitcoin Wallets
- `POST /api/users/wallets/bitcoin` - Create Bitcoin wallet
- `GET /api/users/wallets/bitcoin` - Get user's Bitcoin wallets
- `POST /api/users/wallets/bitcoin/purchase` - Purchase Bitcoin
- `POST /api/users/wallets/bitcoin/transfer` - Transfer Bitcoin

### KYC/Verification
- `POST /api/users/kyc/submit` - Submit KYC documents
- `GET /api/users/kyc/status` - Get KYC verification status
- `POST /api/users/kyc/documents` - Upload verification documents

### Transaction History
- `GET /api/users/transactions` - Get transaction history
- `GET /api/users/transactions/:id` - Get specific transaction
- `GET /api/users/transactions/summary` - Get transaction summary

## Environment Variables

```env
# Server Configuration
PORT=3002
NODE_ENV=production
HOST=0.0.0.0

# Database
MONGODB_URI=mongodb://admin:password@mongodb:27017/swiftpay_users?authSource=admin
DB_POOL_SIZE=10
DB_TIMEOUT=5000

# Security
JWT_SECRET=your-super-secret-jwt-key
BCRYPT_ROUNDS=12

# External Services
NOTIFICATION_SERVICE_URL=http://notification-service:3009
COMPLIANCE_SERVICE_URL=http://compliance-service:3011
ASSET_SERVICE_URL=http://asset-service:3005
BITCOIN_SERVICE_URL=http://bitcoin-service:3008

# File Upload
MAX_REQUEST_SIZE=10mb
FILE_UPLOAD_MAX_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Data Models

### SwiftPayUser
Enhanced user model with payment system integration:
- Basic user information (name, email, phone, etc.)
- KYC verification status and documents
- Asset deposits with verification workflow
- Fiat accounts with multi-currency support
- Bitcoin wallets (internal and external)
- Transaction history and trading limits
- Payment preferences and security settings

### Asset Deposits
- Asset type (gold, silver, diamond)
- Quantity, purity, and estimated value
- Verification status and workflow
- Images and certificates
- Actual appraised value after verification

### Fiat Accounts
- Multi-currency support (USD, EUR, etc.)
- Available and pending balances
- Transaction history and limits
- Account status and metadata

### Bitcoin Wallets
- Internal (managed) and external wallets
- Balance tracking and transaction history
- Address management and verification
- Security features and backup

## Security Features

- Password hashing with bcrypt
- JWT token-based authentication
- Rate limiting and request validation
- Input sanitization and validation
- Secure file upload handling
- API key management
- Session management with device tracking
- Two-factor authentication support

## Integration

The User Service integrates with:
- **Asset Service**: For asset valuation and verification
- **Bitcoin Service**: For Bitcoin transactions and wallet management
- **Notification Service**: For user notifications and alerts
- **Compliance Service**: For KYC/AML verification
- **Analytics Service**: For user behavior and transaction analytics

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
docker build -t swiftpayme-user-service .

# Run container
docker run -p 3002:3002 swiftpayme-user-service
```

## Health Checks

- `GET /health` - Basic health check
- `GET /ready` - Readiness check with dependencies
- `GET /metrics` - Service metrics and statistics

## Monitoring

The service includes comprehensive logging and monitoring:
- Request/response logging
- Error tracking and alerting
- Performance metrics
- Database connection monitoring
- Security event logging

