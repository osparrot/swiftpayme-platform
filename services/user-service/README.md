# SwiftPayMe User Service

**Version**: 1.7.0  
**Status**: Production Ready ✅

## Overview

The SwiftPayMe User Service is the authentication and identity hub for the entire platform. It manages user registration, profile management, KYC verification, security, and compliance.

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

## Architecture

The service follows a standard microservices architecture:

- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with Passport.js
- **Validation**: Joi for schema validation
- **Security**: Helmet, CORS, rate limiting
- **Containerization**: Docker with multi-stage builds

## API Endpoints

- **Authentication**: `/api/users/auth/*`
- **Profile Management**: `/api/users/profile/*`
- **KYC Verification**: `/api/users/kyc/*`
- **Security Settings**: `/api/users/security/*`
- **Notifications**: `/api/users/notifications/*`
- **Admin Functions**: `/api/users/admin/*`

## Getting Started

### Prerequisites

- Node.js >= 18.x
- MongoDB >= 5.x
- Redis >= 6.x
- Docker & Docker Compose

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/osparrot/swiftpayme-platform.git
   cd swiftpayme-platform/services/user-service
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

### Running the Service

- **Development**:
  ```bash
  npm run dev
  ```

- **Production**:
  ```bash
  npm run build
  npm start
  ```

- **Docker**:
  ```bash
  docker-compose up -d --build
  ```

## Configuration

| Variable | Description | Default |
|---|---|---|
| `PORT` | Service port | `3002` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/swiftpay_users` |
| `JWT_SECRET` | JWT secret key | `your-jwt-secret` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000` |

## Testing

- **Run unit tests**:
  ```bash
  npm test
  ```

- **Run integration tests**:
  ```bash
  npm run test:integration
  ```

## Deployment

The service is deployed as a Docker container. See the main `DEPLOYMENT.md` for more details.

## Contributing

Please see the main `CONTRIBUTING.md` for details on how to contribute to the project.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

