feat: Enhance crypto service with production-grade features

This commit introduces a significantly enhanced crypto service with production-grade features for Bitcoin Core and Lightning Network integration.

**Enhanced Bitcoin Core Service:**
- Connection pooling and retry logic
- Performance monitoring and caching
- Advanced wallet management (HD wallets, multiple address types)
- Smart fee estimation
- RBF (Replace-By-Fee) transaction broadcasting

**Enhanced Lightning Network Service:**
- Intelligent channel management (opening, rebalancing)
- Efficient payment processing (MPP, AMP)
- Advanced invoice system (route hints, keysend)
- Performance and routing optimizations

**Production Docker Compose Configuration:**
- Production-grade service definitions
- Resource limits and health checks
- Network isolation and security
- Monitoring and logging setup

**Configuration Files:**
- `docker-compose.production.yml`: Complete production deployment configuration
- `bitcoin.production.conf`: Optimized Bitcoin Core configuration for mainnet
- `lnd.production.conf`: Advanced Lightning Network configuration
- `redis-cluster.conf`: Redis cluster configuration with security
- `.env.production.template`: Comprehensive environment variables template
- `deploy-production-enhanced.sh`: Automated deployment script with verification

**Testing:**
- `CRYPTO_SERVICE_TEST_PLAN.md`: Comprehensive test plan for the enhanced crypto service
- `scripts/test-crypto-service.sh`: Automated test script for the enhanced crypto service
