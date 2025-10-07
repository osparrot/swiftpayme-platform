# SwiftPayMe Crypto Service

**Version**: 1.5.0  
**Author**: Manus AI  
**Date**: October 7, 2025

## 1. Introduction

The SwiftPayMe Crypto Service is a production-grade microservice responsible for managing all cryptocurrency-related operations within the SwiftPayMe ecosystem. It provides a secure and efficient gateway to Bitcoin and the Lightning Network, enabling a wide range of financial services including wallet management, transaction processing, and real-time balance tracking.

This document provides a comprehensive overview of the service architecture, features, API endpoints, and deployment instructions.

## 2. Service Architecture

The crypto service is built with a modern, scalable architecture using Node.js, TypeScript, and Express. It follows a clean, modular design with a clear separation of concerns:

| Layer | Description |
| :--- | :--- |
| **Controllers** | Handles incoming API requests, validates input, and orchestrates service calls |
| **Services** | Contains the core business logic for wallet management, transactions, and Lightning operations |
| **Middleware** | Provides authentication, validation, rate limiting, logging, and error handling |
| **Models** | Defines the database schemas for wallets, transactions, and other crypto-related data |
| **Routes** | Maps API endpoints to the corresponding controller methods |
| **Utilities** | Includes shared utilities for logging, Redis caching, event bus, and error handling |
| **Enums & Types** | Defines shared data types and enumerations for consistency |

### 2.1. Key Technologies

- **Node.js & TypeScript**: For a robust and type-safe backend
- **Express**: As the web application framework
- **MongoDB & Mongoose**: For flexible and scalable data persistence
- **Redis**: For high-performance caching and rate limiting
- **Bitcoin Core & LND**: For native Bitcoin and Lightning Network integration
- **Docker**: For containerized deployment and consistency

## 3. Core Features

The crypto service provides a comprehensive set of features for managing cryptocurrencies:

### 3.1. Bitcoin Core Integration

- **HD Wallet Management**: Create and manage Hierarchical Deterministic (HD) wallets with enhanced security.
- **Address Generation**: Generate multiple address types (Legacy, SegWit, Native SegWit).
- **Smart Fee Estimation**: Dynamically calculate transaction fees based on network congestion.
- **Transaction Broadcasting**: Securely broadcast transactions to the Bitcoin network with RBF support.
- **Real-time Monitoring**: Monitor blockchain synchronization, mempool status, and network health.

### 3.2. Lightning Network Support

- **Intelligent Channel Management**: Automate channel opening, rebalancing, and fee policies.
- **Efficient Payment Processing**: Support for Multi-Part Payments (MPP) and Atomic Multi-Path (AMP).
- **Advanced Invoice System**: Create and manage invoices with route hints and keysend support.
- **Real-time Updates**: Use WebSockets for real-time updates on channel status and payments.

### 3.3. Production-Grade Enhancements

- **Connection Pooling**: Efficiently manage connections to Bitcoin Core and LND.
- **Performance Caching**: Use Redis to cache frequently accessed data.
- **Graceful Shutdown**: Ensure data integrity during service restarts.
- **Health Checks & Monitoring**: Provide endpoints for health, readiness, and performance metrics.
- **Scheduled Tasks**: Automate tasks like balance updates, transaction processing, and data cleanup.

## 4. API Endpoints

The crypto service exposes a comprehensive set of RESTful API endpoints for managing crypto operations. All endpoints are secured with JWT authentication and rate limiting.

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

## 5. Deployment

The crypto service is designed for containerized deployment using Docker. The production-grade `docker-compose.production.yml` file provides a complete configuration for deploying the service and its dependencies.

### 5.1. Environment Variables

The service is configured using environment variables. A complete template is available in `.env.production.template`.

### 5.2. Running the Service

To run the service in a production environment, use the provided deployment script:

```bash
./scripts/deploy-production-enhanced.sh
```

This script will build and start all the necessary Docker containers, including the crypto service, Bitcoin Core, LND, MongoDB, Redis, and Nginx.

## 6. Testing

The crypto service includes a comprehensive suite of tests to ensure its quality and reliability.

### 6.1. Unit & Integration Tests

To run the unit and integration tests, use the following command:

```bash
npm test
```

### 6.2. End-to-End Validation

A comprehensive end-to-end validation script is available to test the complete service integration:

```bash
./scripts/validate-crypto-service-integration.sh
```

This script validates the file structure, service connections, and overall architecture of the service.

## 7. Conclusion

The SwiftPayMe Crypto Service is a robust, secure, and scalable microservice that provides a solid foundation for the SwiftPayMe platform. Its comprehensive features, production-grade architecture, and extensive testing make it a reliable solution for managing cryptocurrency operations.

