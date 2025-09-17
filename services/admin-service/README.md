# SwiftPayMe Admin Service

The Admin Service provides comprehensive administrative capabilities for managing the SwiftPayMe payment system. It offers a complete interface for user management, asset verification, system monitoring, compliance oversight, and operational administration.

## Features

### 🔐 Admin Authentication & Authorization
- **Multi-Factor Authentication (MFA)** with TOTP support
- **Role-Based Access Control (RBAC)** with granular permissions
- **JWT-based authentication** with secure session management
- **Admin user lifecycle management** with audit trails
- **API key management** for programmatic access

### 👥 User Management
- **Complete user lifecycle management** (create, update, suspend, delete)
- **KYC/AML verification oversight** with approval workflows
- **Risk assessment and scoring** management
- **User activity monitoring** and analytics
- **Bulk user operations** for administrative efficiency
- **Advanced user search and filtering**

### 💎 Asset Verification & Management
- **Physical asset verification workflows** (gold, silver, diamonds)
- **Professional appraisal integration** and approval
- **Asset valuation management** with multiple methodologies
- **Verification confidence scoring** and quality control
- **Asset deposit tracking** and status management
- **Compliance verification** (origin, authenticity, legal)

### 📊 System Monitoring & Analytics
- **Real-time system health monitoring** with alerts
- **Performance metrics and dashboards** 
- **Transaction monitoring and analytics**
- **Service health checks** and dependency monitoring
- **Error tracking and incident management**
- **Capacity planning and resource utilization**

### 📈 Reporting & Business Intelligence
- **Automated report generation** (daily, weekly, monthly)
- **Custom report builder** with flexible parameters
- **Financial reporting and reconciliation**
- **Compliance reporting** for regulatory requirements
- **Export capabilities** (PDF, Excel, CSV, JSON)
- **Scheduled report delivery**

### 🔔 Real-Time Notifications
- **WebSocket-based real-time updates**
- **Admin alert system** with severity levels
- **Event-driven notifications** for critical actions
- **Customizable notification preferences**
- **Multi-channel delivery** (email, SMS, push, webhook)

### 🛡️ Security & Compliance
- **Comprehensive audit logging** with tamper protection
- **Security incident management** and response
- **Compliance case management** (AML, KYC, sanctions)
- **Access control and permission management**
- **Threat detection and monitoring**
- **Data protection and privacy controls**

### ⚙️ Configuration Management
- **System configuration interface** with validation
- **Feature flag management** for controlled rollouts
- **Environment-specific settings** management
- **Integration configuration** for external services
- **Backup and recovery management**

## Architecture

### Service Design
- **Microservice architecture** with clear separation of concerns
- **Event-driven communication** with other services
- **RESTful API design** with comprehensive documentation
- **WebSocket integration** for real-time features
- **Modular service architecture** for scalability

### Technology Stack
- **Node.js & TypeScript** for robust backend development
- **Express.js** for HTTP server and API routing
- **Socket.IO** for real-time WebSocket communication
- **MongoDB** for persistent data storage
- **Redis** for caching and session management
- **JWT** for secure authentication
- **Speakeasy** for MFA/TOTP implementation

### Security Features
- **Helmet.js** for security headers
- **Rate limiting** with Redis backend
- **Input validation** with Joi schemas
- **CORS configuration** for cross-origin security
- **Audit logging** for all administrative actions
- **Secure password hashing** with bcrypt

## API Endpoints

### Authentication
- `POST /api/admin/login` - Admin login with MFA support
- `POST /api/admin/logout` - Secure logout
- `POST /api/admin/refresh` - Token refresh
- `POST /api/admin/mfa/enable` - Enable MFA
- `POST /api/admin/mfa/verify` - Verify MFA setup

### User Management
- `GET /api/users` - List users with filtering and pagination
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user information
- `POST /api/users/:id/suspend` - Suspend user account
- `POST /api/users/:id/activate` - Activate user account
- `POST /api/users/:id/kyc/verify` - Verify user KYC
- `POST /api/users/bulk` - Bulk user operations

### Asset Management
- `GET /api/assets/deposits` - List asset deposits
- `GET /api/assets/deposits/:id` - Get deposit details
- `POST /api/assets/deposits/:id/verify` - Verify asset deposit
- `POST /api/assets/deposits/:id/approve` - Approve asset valuation
- `POST /api/assets/deposits/:id/reject` - Reject asset deposit
- `PUT /api/assets/deposits/:id/valuation` - Update asset valuation

### System Monitoring
- `GET /api/system/health` - System health overview
- `GET /api/system/metrics` - Performance metrics
- `GET /api/system/alerts` - Active system alerts
- `GET /api/system/services` - Service status overview
- `POST /api/system/alerts/:id/resolve` - Resolve system alert

### Reporting
- `GET /api/reports` - List available reports
- `POST /api/reports/generate` - Generate custom report
- `GET /api/reports/:id` - Get report details
- `GET /api/reports/:id/download` - Download report file
- `POST /api/reports/schedule` - Schedule recurring report

### Configuration
- `GET /api/config` - Get system configuration
- `PUT /api/config` - Update system configuration
- `GET /api/config/features` - Get feature flags
- `PUT /api/config/features` - Update feature flags

## Real-Time Events

### WebSocket Events
- `system-metrics` - Real-time system performance data
- `transaction-metrics` - Transaction volume and status updates
- `user-activity` - User registration and activity updates
- `asset-verification-updated` - Asset verification status changes
- `alert-created` - New system alerts
- `compliance-case-updated` - Compliance case status changes

### Event Subscriptions
- `subscribe-monitoring` - Subscribe to monitoring channels
- `subscribe-alerts` - Subscribe to alert notifications
- `subscribe-user-activity` - Subscribe to user activity updates

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3008
NODE_ENV=production
SERVICE_VERSION=1.0.0

# Database Configuration
MONGODB_URI=mongodb://admin:password@mongodb:27017/swiftpay_admin
REDIS_URL=redis://redis:6379

# Authentication
JWT_SECRET=your-super-secure-jwt-secret
JWT_EXPIRES_IN=8h

# External Services
USER_SERVICE_URL=http://user-service:3002
ASSET_SERVICE_URL=http://asset-service:3005
PAYMENT_SERVICE_URL=http://payment-service:3004
CRYPTO_SERVICE_URL=http://crypto-service:3007
CURRENCY_SERVICE_URL=http://currency-conversion-service:3006

# Security
ALLOWED_ORIGINS=http://localhost:3000,https://admin.swiftpayme.com
MAX_REQUEST_SIZE=50mb
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Admin Configuration
DEFAULT_ADMIN_EMAIL=admin@swiftpayme.com
DEFAULT_ADMIN_PASSWORD=SwiftPay2024!
AUDIT_LOG_RETENTION_DAYS=90

# Notification Configuration
EMAIL_SERVICE_URL=http://notification-service:3009
SMS_PROVIDER=twilio
WEBHOOK_SECRET=your-webhook-secret

# Monitoring
HEALTH_CHECK_INTERVAL=30000
METRICS_COLLECTION_INTERVAL=60000
LOG_LEVEL=info
```

### Docker Configuration

```yaml
admin-service:
  build: ./services/admin-service
  ports:
    - "3008:3008"
  environment:
    - NODE_ENV=production
    - MONGODB_URI=mongodb://admin:password@mongodb:27017/swiftpay_admin
    - REDIS_URL=redis://redis:6379
    - JWT_SECRET=${JWT_SECRET}
  depends_on:
    - mongodb
    - redis
    - user-service
    - asset-service
  networks:
    - swiftpayme-network
  volumes:
    - admin-logs:/app/logs
    - admin-uploads:/app/uploads
  restart: unless-stopped
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3008/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 60s
```

## Development

### Prerequisites
- Node.js 18+ and npm
- MongoDB 5.0+
- Redis 6.0+
- Docker and Docker Compose (for containerized development)

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/swiftpayme/admin-service.git
cd admin-service

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Development Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server
npm test             # Run test suite
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format code with Prettier
```

## Deployment

### Docker Deployment

```bash
# Build Docker image
docker build -t swiftpayme-admin-service .

# Run container
docker run -d \
  --name admin-service \
  -p 3008:3008 \
  -e MONGODB_URI=mongodb://localhost:27017/swiftpay_admin \
  -e REDIS_URL=redis://localhost:6379 \
  -e JWT_SECRET=your-secret \
  swiftpayme-admin-service
```

### Production Deployment

```bash
# Using Docker Compose
docker-compose up -d admin-service

# Using Kubernetes
kubectl apply -f k8s/admin-service.yaml

# Health check
curl http://localhost:3008/health
```

## Monitoring & Observability

### Health Checks
- **Liveness probe**: `/health` - Basic service health
- **Readiness probe**: `/ready` - Service readiness for traffic
- **Metrics endpoint**: `/metrics` - Prometheus-compatible metrics

### Logging
- **Structured logging** with Winston
- **Request/response logging** with correlation IDs
- **Error tracking** with stack traces
- **Audit logging** for all administrative actions
- **Performance logging** for slow operations

### Metrics
- **HTTP request metrics** (count, duration, status codes)
- **Database operation metrics** (queries, connections, response time)
- **Cache metrics** (hit rate, memory usage, operations)
- **Business metrics** (user actions, asset verifications, system alerts)
- **Custom metrics** for admin-specific operations

## Security Considerations

### Authentication & Authorization
- **Strong password requirements** with complexity validation
- **Multi-factor authentication** mandatory for sensitive operations
- **Role-based permissions** with principle of least privilege
- **Session management** with secure token handling
- **API key rotation** for programmatic access

### Data Protection
- **Encryption at rest** for sensitive data
- **Encryption in transit** with TLS 1.3
- **PII data handling** with privacy controls
- **Audit trail protection** with tamper detection
- **Secure file uploads** with virus scanning

### Operational Security
- **Rate limiting** to prevent abuse
- **Input validation** to prevent injection attacks
- **CORS configuration** for cross-origin security
- **Security headers** with Helmet.js
- **Dependency scanning** for vulnerabilities

## Compliance & Governance

### Regulatory Compliance
- **GDPR compliance** with data protection controls
- **PCI DSS compliance** for payment data handling
- **AML/KYC compliance** with verification workflows
- **SOX compliance** for financial reporting
- **Audit trail requirements** for regulatory reporting

### Data Governance
- **Data retention policies** with automated cleanup
- **Data classification** and handling procedures
- **Privacy controls** with consent management
- **Data lineage tracking** for compliance reporting
- **Backup and recovery** procedures

## Troubleshooting

### Common Issues

**Service won't start**
```bash
# Check logs
docker logs admin-service

# Verify environment variables
docker exec admin-service env | grep -E "(MONGODB|REDIS|JWT)"

# Test database connectivity
docker exec admin-service node -e "require('mongoose').connect(process.env.MONGODB_URI)"
```

**Authentication failures**
```bash
# Verify JWT secret
echo $JWT_SECRET

# Check admin user creation
docker exec admin-service npm run create-admin

# Verify MFA setup
curl -X POST http://localhost:3008/api/admin/mfa/enable
```

**Performance issues**
```bash
# Check system metrics
curl http://localhost:3008/metrics

# Monitor database performance
docker exec mongodb mongostat

# Check Redis performance
docker exec redis redis-cli info stats
```

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug

# Start with debugging
npm run dev -- --inspect

# Connect debugger
chrome://inspect
```

## Contributing

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests for new features
- Update documentation for API changes
- Follow semantic versioning for releases
- Use conventional commits for git messages

### Code Quality
- **ESLint** for code linting
- **Prettier** for code formatting
- **Jest** for unit and integration testing
- **Husky** for pre-commit hooks
- **SonarQube** for code quality analysis

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For technical support and questions:
- **Documentation**: https://docs.swiftpayme.com/admin-service
- **Issues**: https://github.com/swiftpayme/admin-service/issues
- **Email**: dev@swiftpayme.com
- **Slack**: #admin-service channel

---

**SwiftPayMe Admin Service** - Comprehensive administrative interface for the SwiftPayMe payment system, providing secure and efficient management of users, assets, transactions, and system operations.

