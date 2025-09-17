# SwiftPayMe Asset Service

The Asset Service is a core microservice in the SwiftPayMe payment system that handles physical asset management, including gold, silver, and diamond deposits, verification, valuation, and integration with the fiat crediting system.

## Features

### Physical Asset Management
- **Asset Deposit Tracking**: Complete lifecycle management for physical assets
- **Multi-Asset Support**: Gold, silver, and diamond processing
- **Image Management**: Upload and organize asset photos and certificates
- **Certificate Verification**: Authenticity and purity certificate validation
- **Shipping Integration**: Track asset delivery and insurance

### Verification System
- **Multiple Verification Methods**: Visual inspection, XRF analysis, acid testing, electronic testing, professional appraisal
- **Risk Assessment**: Automated risk scoring based on asset type, value, and user history
- **Compliance Checks**: AML screening, sanctions screening, origin verification
- **Quality Control**: Multi-stage verification workflow with approval processes

### Valuation Engine
- **Real-time Pricing**: Integration with precious metals price feeds
- **Multiple Valuation Types**: Estimated, preliminary, professional, and final valuations
- **Market Comparison**: Price validation against market data
- **Confidence Scoring**: Reliability assessment for valuations
- **Premium/Discount Calculation**: Market-based pricing adjustments

### Integration & Communication
- **User Service Integration**: Seamless user deposit tracking
- **Event-Driven Architecture**: Real-time notifications and updates
- **Audit Trail**: Complete compliance and activity logging
- **External Service Health Monitoring**: Price feed and service availability checks

## API Endpoints

### Asset Deposits
- `POST /api/assets/deposits` - Submit new asset deposit
- `GET /api/assets/deposits` - Get user's asset deposits
- `GET /api/assets/deposits/:id` - Get specific deposit details
- `PUT /api/assets/deposits/:id/status` - Update deposit status
- `POST /api/assets/deposits/:id/images` - Upload asset images
- `POST /api/assets/deposits/:id/certificates` - Upload certificates

### Asset Verification
- `POST /api/assets/deposits/:id/verification` - Start verification process
- `PUT /api/assets/deposits/:id/verification/:verificationId` - Update verification
- `GET /api/assets/verification/pending` - Get pending verifications (admin)
- `POST /api/assets/verification/:id/approve` - Approve verification (admin)
- `POST /api/assets/verification/:id/reject` - Reject verification (admin)

### Asset Valuation
- `POST /api/assets/deposits/:id/valuation` - Create asset valuation
- `GET /api/assets/deposits/:id/valuations` - Get valuation history
- `PUT /api/assets/valuations/:id` - Update valuation
- `GET /api/assets/prices/current` - Get current market prices
- `GET /api/assets/prices/history` - Get price history

### Admin & Management
- `GET /api/assets/admin/dashboard` - Admin dashboard data
- `GET /api/assets/admin/pending` - Pending verifications queue
- `POST /api/assets/admin/assign` - Assign verification to appraiser
- `GET /api/assets/analytics` - Asset analytics and metrics
- `GET /api/assets/reports` - Generate compliance reports

### Price Feeds
- `GET /api/assets/prices/gold` - Current gold prices
- `GET /api/assets/prices/silver` - Current silver prices
- `GET /api/assets/prices/diamond` - Current diamond prices
- `GET /api/assets/prices/quote` - Get price quote for asset

## Environment Variables

```env
# Server Configuration
PORT=3005
NODE_ENV=production
HOST=0.0.0.0

# Database
MONGODB_URI=mongodb://admin:password@mongodb:27017/swiftpay_assets?authSource=admin
DB_POOL_SIZE=10
DB_TIMEOUT=5000

# Redis Cache
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=your-redis-password

# External Services
USER_SERVICE_URL=http://user-service:3002
CURRENCY_SERVICE_URL=http://currency-service:3006
NOTIFICATION_SERVICE_URL=http://notification-service:3009
COMPLIANCE_SERVICE_URL=http://compliance-service:3011

# Price Feeds
GOLD_PRICE_API_URL=https://api.metals-api.com/v1/latest
SILVER_PRICE_API_URL=https://api.metals-api.com/v1/latest
DIAMOND_PRICE_API_URL=https://api.diamond-prices.com/v1/latest
PRICE_API_KEY=your-price-api-key
PRICE_UPDATE_INTERVAL=300000

# File Storage
FILE_STORAGE_TYPE=s3
AWS_S3_BUCKET=swiftpayme-assets
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1

# Security
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-encryption-key

# Verification Settings
AUTO_ASSIGN_VERIFICATIONS=true
REQUIRE_MULTIPLE_APPRAISERS=false
MIN_VALUE_FOR_PROFESSIONAL_APPRAISAL=10000
MAX_PROCESSING_DAYS=7

# Risk Management
MAX_DAILY_DEPOSIT_VALUE=100000
MAX_SINGLE_DEPOSIT_VALUE=50000
HIGH_RISK_THRESHOLD=75
REQUIRE_ADDITIONAL_VERIFICATION_THRESHOLD=85

# Compliance
ENABLE_AML_SCREENING=true
ENABLE_SANCTIONS_SCREENING=true
ENABLE_ORIGIN_VERIFICATION=true
COMPLIANCE_RETENTION_DAYS=2555
```

## Data Models

### AssetDeposit
Complete physical asset deposit tracking:
- Asset identification (type, brand, series, year)
- Physical properties (weight, dimensions, purity, condition)
- Status tracking (pending → verification → verified → credited)
- Image and certificate management
- Verification results and valuation history
- Risk assessment and compliance checks
- Audit trail and processing notes

### Asset Images
- Multiple image types (front, back, side, detail, certificate, packaging)
- Metadata extraction (dimensions, format, color space)
- Thumbnail generation and optimization
- Upload tracking and user attribution

### Asset Certificates
- Certificate type classification (authenticity, purity, weight, grading, appraisal, insurance)
- Issuer verification and license tracking
- Expiry date monitoring
- Verification status and external validation

### Asset Valuations
- Multiple valuation methodologies
- Market price comparison and confidence scoring
- Premium/discount calculations
- Source attribution and update tracking
- Historical valuation preservation

### Asset Verifications
- Verification method documentation
- Equipment and calibration tracking
- Results recording (purity, weight, authenticity confirmation)
- Condition assessment and defect notation
- Rejection reason tracking

## Security Features

- JWT token-based authentication
- Role-based access control (user, appraiser, admin)
- Input validation and sanitization
- File upload security and virus scanning
- Encrypted sensitive data storage
- Audit logging for all operations
- Rate limiting and request throttling
- CORS configuration for API access

## Integration

The Asset Service integrates with:
- **User Service**: For user deposit tracking and account updates
- **Currency Service**: For real-time currency conversion and pricing
- **Notification Service**: For deposit status updates and alerts
- **Compliance Service**: For AML/KYC verification and screening
- **Payment Service**: For fiat crediting after verification
- **Admin Service**: For management dashboard and reporting

## Verification Workflow

1. **Deposit Submission**: User submits asset with images and certificates
2. **Initial Assessment**: Automated risk scoring and compliance checks
3. **Assignment**: Verification assigned to qualified appraiser
4. **Physical Verification**: Asset examined using appropriate methods
5. **Valuation**: Professional valuation based on verification results
6. **Approval/Rejection**: Final decision with detailed reasoning
7. **Integration**: Approved assets trigger fiat crediting in User Service

## Risk Management

- **Automated Risk Scoring**: Based on asset type, value, user history, and market conditions
- **Compliance Integration**: AML, sanctions, and origin verification
- **Value Limits**: Daily and single deposit limits based on user verification level
- **Quality Control**: Multi-stage verification with professional oversight
- **Fraud Detection**: Pattern analysis and suspicious activity monitoring

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
docker build -t swiftpayme-asset-service .

# Run container
docker run -p 3005:3005 swiftpayme-asset-service
```

## Health Checks

- `GET /health` - Basic health check with database and Redis status
- `GET /ready` - Readiness check including external service dependencies
- `GET /metrics` - Service metrics including asset-specific data

## Monitoring

The service includes comprehensive monitoring:
- Asset deposit metrics and trends
- Verification processing times and success rates
- Price feed health and update frequency
- Risk score distribution and flagged deposits
- External service availability and response times
- Database and cache performance metrics

## Compliance

- **Data Retention**: Configurable retention periods for compliance requirements
- **Audit Trails**: Complete activity logging for regulatory compliance
- **Reporting**: Automated compliance report generation
- **Privacy**: GDPR-compliant data handling and user rights management
- **Security**: SOC 2 Type II compliance preparation

