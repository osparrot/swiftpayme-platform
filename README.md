# SwiftPayMe - Professional Asset Deposit and Cryptocurrency Trading Platform

SwiftPayMe is a comprehensive, enterprise-grade financial platform that enables users to deposit physical assets (gold, silver, diamonds), receive fiat credit, and seamlessly trade cryptocurrencies. The system is built on a modern microservices architecture, ensuring scalability, security, and maintainability.

## 🌟 Key Features

- **Physical Asset Deposit**: A complete workflow for depositing, verifying, and receiving credit for precious assets.
- **Multi-Currency Accounts**: Manage fiat currencies (USD, EUR, GBP) with real-time conversion.
- **Bitcoin Wallet**: A full-featured Bitcoin wallet for buying, selling, sending, and receiving BTC.
- **Portfolio Management**: A comprehensive dashboard to track asset allocation, performance, and transaction history.
- **Real-Time Notifications**: Instant updates on transactions, asset status, and market changes via WebSockets.
- **Enterprise-Grade Security**: Multi-factor authentication, KYC/AML compliance, and end-to-end encryption.
- **Scalable Microservices**: 11+ microservices for handling specific business domains, ensuring high availability and performance.
- **Responsive UIs**: A modern, mobile-first Web UI for users and a comprehensive Admin UI for system management.

## 🏛️ System Architecture

The SwiftPayMe platform is composed of three main components:

1.  **Microservices**: A collection of independent services that handle the core business logic.
2.  **Web UI**: A user-facing React application for all customer interactions.
3.  **Admin UI**: A React-based dashboard for system administration and management.

### Microservices Overview

| Service                       | Port | Description                                                                 |
| ----------------------------- | ---- | --------------------------------------------------------------------------- |
| **API Gateway**               | 3000 | The single entry point for all client requests, handling routing and security. |
| **User Service**              | 3002 | Manages user authentication, profiles, and KYC verification.                |
| **Asset Service**             | 3003 | Handles the physical asset deposit and verification workflow.               |
| **Currency Conversion Service** | 3004 | Provides real-time exchange rates and currency conversion.                  |
| **Crypto Service**            | 3005 | Manages Bitcoin wallets, transactions, and blockchain interactions.         |
| **Payment Service**           | 3006 | Orchestrates payment workflows, including asset-to-crypto trades.           |
| **Admin Service**             | 3007 | Provides administrative functionalities for the Admin UI.                     |
| **Notification Service**      | 3008 | Sends real-time notifications via WebSockets, email, and SMS.               |
| **Tokenization Service**      | 3009 | Manages the tokenization of physical assets.                                |
| **Ledger Service**            | 3010 | A double-entry accounting system for all transactions.                      |
| **Account Service**           | 3011 | Manages user accounts, balances, and currency holdings.                     |

### Frontend Applications

-   **Web UI**: A responsive React application providing a seamless user experience for all platform features. Built with Vite, Tailwind CSS, and Radix UI.
-   **Admin UI**: A comprehensive dashboard for administrators to manage users, assets, transactions, and system settings.

## 🚀 Getting Started

### Prerequisites

-   Docker and Docker Compose
-   Node.js 18+ and npm
-   Git

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/osparrot/swiftpayme-platform.git
    cd swiftpayme-platform
    ```

2.  **Set up the environment:**

    ```bash
    cp .env.example .env
    # Edit .env with your configuration, especially the JWT_SECRET
    ```

3.  **Install dependencies and build the applications:**

    ```bash
    npm run install:all
    npm run build
    ```

### Running the System

#### With Docker (Recommended)

```bash
# Build and start all services in detached mode
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Once the system is running, you can access:

-   **Web UI**: `http://localhost:3000`
-   **Admin UI**: `http://localhost:3001`
-   **API Gateway**: `http://localhost:8080`

#### Without Docker (for development)

```bash
# Start all services concurrently
npm run dev
```

## 🧪 Testing

The platform includes a comprehensive suite of tests:

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e

# Get test coverage
npm run test:coverage
```

## 🔒 Security

Security is a top priority for SwiftPayMe. The platform includes:

-   **Authentication**: JWT-based authentication with refresh tokens.
-   **Authorization**: Role-based access control for all services.
-   **Data Encryption**: End-to-end encryption for all data in transit and at rest.
-   **Input Validation**: All incoming data is validated and sanitized.
-   **Security Headers**: Helmet.js is used to set secure HTTP headers.
-   **Rate Limiting**: To prevent brute-force attacks.

## 📚 Documentation

-   [API Documentation](./services/api-gateway/README.md)
-   [Web UI Documentation](./web-ui/README.md)
-   [Deployment Guide](./DEPLOYMENT.md)

## 🤝 Contributing

Contributions are welcome! Please read our [contributing guidelines](./CONTRIBUTING.md) to get started.

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

