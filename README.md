# SwiftPayMe - Production-Ready Payment System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-%3E%3D20.0.0-blue)](https://www.docker.com/)
[![TypeScript](https://img.shields.io/badge/typescript-%3E%3D5.0.0-blue)](https://www.typescriptlang.org/)

SwiftPayMe is a comprehensive, production-ready microservices-based payment system that enables users to deposit physical assets (gold, silver, diamonds), receive fiat credits, and purchase Bitcoin. The system features enterprise-grade security, real-time currency conversion, and seamless Bitcoin integration.

## 🚀 Features

### Core Capabilities
- **Physical Asset Management** - Accept and verify gold, silver, and diamond deposits
- **Professional Asset Verification** - Multi-stage verification with professional appraisal
- **Real-Time Currency Conversion** - Live pricing for 150+ fiat currencies and precious metals
- **Bitcoin Integration** - Complete Bitcoin wallet management and transaction processing
- **Multi-Currency Support** - Handle deposits and transactions in multiple currencies
- **Enterprise Security** - JWT authentication, RBAC, encryption, and comprehensive audit trails

### Business Workflows
- **Asset Deposit Workflow** - Physical asset → Verification → Valuation → Fiat Credit
- **Bitcoin Purchase Workflow** - Fiat Balance → Real-time Pricing → Bitcoin Purchase
- **Bitcoin Transfer Workflow** - Internal wallets → External wallet transfers
- **Admin Management** - Complete administrative interface for asset and user management

### Technical Features
- **Microservices Architecture** - 7 independent, scalable services
- **Event-Driven Communication** - Redis-based event bus for real-time updates
- **API Gateway** - Unified entry point with rate limiting and security
- **Comprehensive Testing** - Unit, integration, E2E, security, and load testing
- **Production Monitoring** - Health checks, logging, and performance metrics

## 🏗️ Architecture

### Microservices Overview

| Service | Port | Description |
|---------|------|-------------|
| **API Gateway** | 3000 | Unified entry point, authentication, rate limiting |
| **User Service** | 3002 | User management, authentication, KYC, accounts |
| **Asset Service** | 3003 | Physical asset deposits, verification, valuation |
| **Currency Service** | 3004 | Real-time pricing, currency conversion |
| **Crypto Service** | 3005 | Bitcoin wallets, transactions, blockchain integration |
| **Payment Service** | 3006 | Payment orchestration, transaction processing |
| **Admin Service** | 3007 | Administrative interface, asset management |
| **Notification Service** | 3008 | Multi-channel notifications, alerts |

### Infrastructure Components

- **MongoDB** - Primary database for all services
- **Redis** - Caching, session storage, event bus
- **Bitcoin Core** - Bitcoin node for cryptocurrency operations
- **Fluentd** - Centralized logging and monitoring
- **NGINX** - Load balancing and reverse proxy

## 🚀 Quick Start

### Prerequisites

- **Docker** >= 20.0.0
- **Docker Compose** >= 2.0.0
- **Node.js** >= 18.0.0 (for development)
- **Git** for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/username/swiftpayment.git
   cd swiftpayment
   ```

2. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Build and start services**
   ```bash
   npm run setup    # Install dependencies and build images
   npm start        # Start all services
   ```

4. **Verify installation**
   ```bash
   npm run health   # Check service health
   ```

### Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development environment**
   ```bash
   npm run dev      # Start with development configuration
   ```

3. **Run tests**
   ```bash
   npm test         # Run all test suites
   npm run test:unit        # Unit tests only
   npm run test:integration # Integration tests
   npm run test:e2e         # End-to-end tests
   ```

## 📖 API Documentation

### Authentication

All API requests require authentication via JWT tokens:

```bash
# Login to get access token
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Use token in subsequent requests
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Core API Endpoints

#### User Management
- `POST /api/users/register` - User registration
- `POST /api/users/login` - User authentication
- `GET /api/users/profile` - Get user profile
- `POST /api/users/kyc/submit` - Submit KYC documents

#### Asset Management
- `POST /api/assets/deposits` - Submit asset deposit
- `GET /api/assets/deposits/{id}` - Get deposit status
- `GET /api/assets/deposits` - List user deposits

#### Currency & Pricing
- `GET /api/currency/rates` - Get exchange rates
- `GET /api/currency/prices/precious-metals/{metal}` - Get metal prices
- `GET /api/currency/prices/crypto/{symbol}` - Get crypto prices

#### Bitcoin Operations
- `POST /api/crypto/wallets` - Create Bitcoin wallet
- `POST /api/payments/bitcoin/buy` - Purchase Bitcoin
- `POST /api/payments/bitcoin/transfer` - Transfer Bitcoin

#### Admin Operations
- `PUT /api/admin/assets/{id}/receipt` - Acknowledge asset receipt
- `POST /api/admin/assets/{id}/verify` - Verify asset
- `POST /api/admin/assets/{id}/approve` - Approve asset for crediting

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Database Configuration
MONGODB_URI=mongodb://mongodb:27017/swiftpayme
REDIS_URL=redis://redis:6379

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key
MASTER_ENCRYPTION_KEY=your-32-byte-encryption-key

# Bitcoin Configuration
BITCOIN_RPC_HOST=bitcoin-node
BITCOIN_RPC_PORT=8332
BITCOIN_RPC_USER=bitcoin
BITCOIN_RPC_PASSWORD=your-bitcoin-password

# External APIs
COINBASE_API_KEY=your-coinbase-api-key
METALS_API_KEY=your-metals-api-key

# Notification Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-email-password
```

## 🧪 Testing

### Test Suites

SwiftPayMe includes comprehensive testing:

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit        # Unit tests
npm run test:integration # Integration tests
npm run test:e2e         # End-to-end tests
npm run test:security    # Security tests
npm run test:load        # Load tests

# Generate coverage report
npm run test:coverage
```

### Test Configuration

- **Unit Tests**: Individual service functionality
- **Integration Tests**: Inter-service communication
- **E2E Tests**: Complete user workflows
- **Security Tests**: Vulnerability assessment
- **Load Tests**: Performance under load

## 🔒 Security

### Security Features

- **JWT Authentication** - Secure token-based authentication
- **Role-Based Access Control** - Granular permission management
- **API Rate Limiting** - Protection against abuse
- **Input Validation** - Comprehensive data sanitization
- **Encryption** - AES-256 encryption for sensitive data
- **Audit Logging** - Complete security event tracking

### Security Best Practices

- All passwords are hashed using bcrypt
- Sensitive data is encrypted at rest
- API endpoints are protected with authentication
- Rate limiting prevents brute force attacks
- Comprehensive audit trails for compliance

## 📊 Monitoring & Logging

### Health Monitoring

```bash
# Check overall system health
curl http://localhost:3000/health

# Check individual service health
curl http://localhost:3002/health  # User Service
curl http://localhost:3003/health  # Asset Service
curl http://localhost:3004/health  # Currency Service
```

### Logging

- **Centralized Logging** - Fluentd aggregates logs from all services
- **Structured Logging** - JSON format for easy parsing
- **Log Levels** - DEBUG, INFO, WARN, ERROR, FATAL
- **Audit Trails** - Complete transaction and security event logging

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**
   ```bash
   # Copy production environment
   cp .env.production .env
   
   # Update configuration for production
   vim .env
   ```

2. **Deploy Services**
   ```bash
   # Production deployment
   npm run deploy:production
   
   # Or using Docker Compose
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Verify Deployment**
   ```bash
   # Check service health
   npm run health
   
   # Run smoke tests
   npm run test:e2e
   ```

## 📚 Documentation

### Service Documentation

- [User Service](services/user-service/README.md) - User management and authentication
- [Asset Service](services/asset-service/README.md) - Physical asset management
- [Currency Service](services/currency-conversion-service/README.md) - Currency conversion
- [Crypto Service](services/crypto-service/README.md) - Bitcoin operations
- [Payment Service](services/payment-service/README.md) - Payment orchestration
- [Admin Service](services/admin-service/README.md) - Administrative interface
- [Notification Service](services/notification-service/README.md) - Notifications

### API Documentation

- [API Gateway Documentation](api-gateway/README.md)
- [Service Contracts](shared/contracts/service-contracts.ts)
- [Event Bus Documentation](shared/events/event-bus.ts)

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Run tests**
   ```bash
   npm test
   npm run lint
   npm run typecheck
   ```
5. **Commit your changes**
   ```bash
   git commit -m "Add your feature description"
   ```
6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Create a Pull Request**

### Code Standards

- **TypeScript** - All code must be written in TypeScript
- **ESLint** - Follow the configured linting rules
- **Prettier** - Use Prettier for code formatting
- **Testing** - Maintain 80%+ test coverage
- **Documentation** - Update documentation for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help

- **Documentation** - Check the service-specific README files
- **Issues** - Create an issue on GitHub for bugs or feature requests
- **Discussions** - Use GitHub Discussions for questions

### Troubleshooting

#### Common Issues

1. **Services not starting**
   ```bash
   # Check Docker status
   docker-compose ps
   
   # View service logs
   npm run logs
   ```

2. **Database connection issues**
   ```bash
   # Restart database services
   docker-compose restart mongodb redis
   ```

3. **Test failures**
   ```bash
   # Clean and rebuild
   npm run clean
   npm run setup
   npm test
   ```

## 🗺️ Roadmap

### Upcoming Features

- **Mobile App** - React Native mobile application
- **Advanced Analytics** - Business intelligence dashboard
- **Multi-Signature Wallets** - Enhanced Bitcoin security
- **Additional Cryptocurrencies** - Ethereum, Litecoin support
- **API Marketplace** - Third-party integrations
- **Advanced KYC** - Biometric verification

### Version History

- **v1.0.0** - Initial production release
  - Complete microservices architecture
  - Physical asset management
  - Bitcoin integration
  - Enterprise security
  - Comprehensive testing

---

**SwiftPayMe** - Transforming physical assets into digital value with enterprise-grade security and reliability.

