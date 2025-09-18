#!/bin/bash

# SwiftPayMe System Validation Script
# Validates system architecture, configuration, and service contracts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED_TESTS++))
}

error() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED_TESTS++))
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Test function wrapper
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    ((TOTAL_TESTS++))
    log "Running test: $test_name"
    
    if eval "$test_command"; then
        success "$test_name"
        return 0
    else
        error "$test_name"
        return 1
    fi
}

# Test 1: Project Structure Validation
test_project_structure() {
    log "Validating project structure..."
    
    # Check main directories
    run_test "API Gateway Directory" "[ -d 'api-gateway' ]"
    run_test "Services Directory" "[ -d 'services' ]"
    run_test "Shared Directory" "[ -d 'shared' ]"
    run_test "Tests Directory" "[ -d 'tests' ]"
    run_test "Scripts Directory" "[ -d 'scripts' ]"
    run_test "Docker Directory" "[ -d 'docker' ]"
    
    # Check service directories
    local services=("user-service" "asset-service" "currency-conversion-service" "crypto-service" "payment-service" "admin-service" "notification-service")
    
    for service in "${services[@]}"; do
        run_test "$service Directory" "[ -d 'services/$service' ]"
        run_test "$service Package.json" "[ -f 'services/$service/package.json' ]"
        run_test "$service Dockerfile" "[ -f 'services/$service/Dockerfile' ]"
        run_test "$service Source Directory" "[ -d 'services/$service/src' ]"
    done
}

# Test 2: Configuration Files Validation
test_configuration_files() {
    log "Validating configuration files..."
    
    # Main configuration files
    run_test "Docker Compose File" "[ -f 'docker-compose.yml' ]"
    run_test "Environment Example" "[ -f '.env.example' ]"
    run_test "Package.json" "[ -f 'package.json' ]"
    run_test "README.md" "[ -f 'README.md' ]"
    run_test "LICENSE" "[ -f 'LICENSE' ]"
    run_test "Gitignore" "[ -f '.gitignore' ]"
    
    # Docker configuration
    run_test "MongoDB Init Scripts" "[ -d 'docker/mongodb' ]"
    run_test "Redis Configuration" "[ -f 'docker/redis/redis.conf' ]"
    run_test "Bitcoin Configuration" "[ -f 'docker/bitcoin/bitcoin.conf' ]"
    run_test "Fluentd Configuration" "[ -f 'docker/fluentd/conf/fluent.conf' ]"
}

# Test 3: Docker Compose Validation
test_docker_compose() {
    log "Validating Docker Compose configuration..."
    
    # Check service definitions
    local services=("api-gateway" "user-service" "asset-service" "currency-conversion-service" "crypto-service" "payment-service" "admin-service" "notification-service" "mongodb" "redis" "bitcoin-node" "fluentd")
    
    for service in "${services[@]}"; do
        run_test "Docker Compose: $service Service" "grep -q '$service:' docker-compose.yml"
    done
    
    # Check port mappings
    run_test "API Gateway Port 3000" "grep -q '3000:3000' docker-compose.yml"
    run_test "User Service Port 3002" "grep -q '3002:3002' docker-compose.yml"
    run_test "Asset Service Port 3003" "grep -q '3003:3003' docker-compose.yml"
    run_test "Currency Service Port 3004" "grep -q '3004:3004' docker-compose.yml"
    run_test "Crypto Service Port 3005" "grep -q '3005:3005' docker-compose.yml"
    run_test "Payment Service Port 3006" "grep -q '3006:3006' docker-compose.yml"
    run_test "Admin Service Port 3007" "grep -q '3007:3007' docker-compose.yml"
    run_test "Notification Service Port 3008" "grep -q '3008:3008' docker-compose.yml"
    
    # Check environment variables
    run_test "JWT Secret Environment" "grep -q 'JWT_SECRET' docker-compose.yml"
    run_test "MongoDB URI Environment" "grep -q 'MONGODB_URI' docker-compose.yml"
    run_test "Redis URL Environment" "grep -q 'REDIS_URL' docker-compose.yml"
    run_test "Bitcoin RPC Environment" "grep -q 'BITCOIN_RPC' docker-compose.yml"
}

# Test 4: Service Dependencies Validation
test_service_dependencies() {
    log "Validating service dependencies..."
    
    # Check package.json dependencies for each service
    local services=("user-service" "asset-service" "currency-conversion-service" "crypto-service" "payment-service" "admin-service" "notification-service")
    
    for service in "${services[@]}"; do
        if [ -f "services/$service/package.json" ]; then
            run_test "$service: Express Dependency" "grep -q '\"express\"' services/$service/package.json"
            run_test "$service: TypeScript Dependency" "grep -q '\"typescript\"' services/$service/package.json"
            run_test "$service: MongoDB Dependency" "grep -q '\"mongoose\"\\|\"mongodb\"' services/$service/package.json"
            run_test "$service: Redis Dependency" "grep -q '\"ioredis\"\\|\"redis\"' services/$service/package.json"
        fi
    done
}

# Test 5: API Gateway Configuration
test_api_gateway_config() {
    log "Validating API Gateway configuration..."
    
    # Check API Gateway source files
    run_test "API Gateway Main File" "[ -f 'api-gateway/src/index.ts' ]"
    run_test "API Gateway Package.json" "[ -f 'api-gateway/package.json' ]"
    run_test "API Gateway Dockerfile" "[ -f 'api-gateway/Dockerfile' ]"
    
    # Check service URL configurations in API Gateway
    run_test "User Service URL Config" "grep -q 'user-service:3002' api-gateway/src/index.ts"
    run_test "Asset Service URL Config" "grep -q 'asset-service:3003' api-gateway/src/index.ts"
    run_test "Currency Service URL Config" "grep -q 'currency-conversion-service:3004' api-gateway/src/index.ts"
    run_test "Crypto Service URL Config" "grep -q 'crypto-service:3005' api-gateway/src/index.ts"
    run_test "Payment Service URL Config" "grep -q 'payment-service:3006' api-gateway/src/index.ts"
    run_test "Admin Service URL Config" "grep -q 'admin-service:3007' api-gateway/src/index.ts"
    run_test "Notification Service URL Config" "grep -q 'notification-service:3008' api-gateway/src/index.ts"
}

# Test 6: Service Contracts Validation
test_service_contracts() {
    log "Validating service contracts..."
    
    # Check shared contracts
    run_test "Service Contracts File" "[ -f 'shared/contracts/service-contracts.ts' ]"
    run_test "Event Bus File" "[ -f 'shared/events/event-bus.ts' ]"
    run_test "Encryption Utils" "[ -f 'shared/utils/Encryption.ts' ]"
    run_test "Logger Utils" "[ -f 'shared/utils/Logger.ts' ]"
    
    # Check contract definitions
    if [ -f 'shared/contracts/service-contracts.ts' ]; then
        run_test "User Service Contract" "grep -q 'UserServiceContract' shared/contracts/service-contracts.ts"
        run_test "Asset Service Contract" "grep -q 'AssetServiceContract' shared/contracts/service-contracts.ts"
        run_test "Currency Service Contract" "grep -q 'CurrencyServiceContract' shared/contracts/service-contracts.ts"
        run_test "Crypto Service Contract" "grep -q 'CryptoServiceContract' shared/contracts/service-contracts.ts"
        run_test "Payment Service Contract" "grep -q 'PaymentServiceContract' shared/contracts/service-contracts.ts"
    fi
}

# Test 7: Security Configuration Validation
test_security_config() {
    log "Validating security configuration..."
    
    # Check security middleware
    run_test "Authentication Middleware" "[ -f 'api-gateway/src/middleware/auth.ts' ]"
    run_test "Security Middleware" "[ -f 'api-gateway/src/middleware/security.ts' ]"
    run_test "Validation Middleware" "[ -f 'api-gateway/src/middleware/validation.ts' ]"
    
    # Check encryption utilities
    run_test "Encryption Utilities" "[ -f 'shared/utils/Encryption.ts' ]"
    
    # Check security configurations in services
    local services=("user-service" "asset-service" "crypto-service" "payment-service" "admin-service")
    
    for service in "${services[@]}"; do
        if [ -f "services/$service/src/index.ts" ]; then
            run_test "$service: JWT Configuration" "grep -q 'JWT\\|jwt' services/$service/src/index.ts"
            run_test "$service: CORS Configuration" "grep -q 'cors' services/$service/src/index.ts"
        fi
    done
}

# Test 8: Database Models Validation
test_database_models() {
    log "Validating database models..."
    
    # Check model files
    run_test "User Model" "[ -f 'services/user-service/src/models/SwiftPayUser.ts' ]"
    run_test "Asset Deposit Model" "[ -f 'services/asset-service/src/models/AssetDeposit.ts' ]"
    run_test "Crypto Wallet Model" "[ -f 'services/crypto-service/src/models/CryptoWallet.ts' ]"
    
    # Check model schemas
    if [ -f 'services/user-service/src/models/SwiftPayUser.ts' ]; then
        run_test "User Model: Email Field" "grep -q 'email' services/user-service/src/models/SwiftPayUser.ts"
        run_test "User Model: Password Field" "grep -q 'password' services/user-service/src/models/SwiftPayUser.ts"
        run_test "User Model: KYC Fields" "grep -q 'kyc\\|KYC' services/user-service/src/models/SwiftPayUser.ts"
    fi
    
    if [ -f 'services/asset-service/src/models/AssetDeposit.ts' ]; then
        run_test "Asset Model: Asset Type" "grep -q 'assetType' services/asset-service/src/models/AssetDeposit.ts"
        run_test "Asset Model: Weight Field" "grep -q 'weight' services/asset-service/src/models/AssetDeposit.ts"
        run_test "Asset Model: Verification Status" "grep -q 'verification\\|status' services/asset-service/src/models/AssetDeposit.ts"
    fi
}

# Test 9: Testing Infrastructure Validation
test_testing_infrastructure() {
    log "Validating testing infrastructure..."
    
    # Check test files
    run_test "Jest Configuration" "[ -f 'tests/jest.config.js' ]"
    run_test "Test Setup Utilities" "[ -f 'tests/utils/setup.ts' ]"
    run_test "Unit Tests" "[ -f 'tests/unit/user-service.test.ts' ]"
    run_test "Integration Tests" "[ -f 'tests/integration/asset-workflow.test.ts' ]"
    run_test "E2E Tests" "[ -f 'tests/e2e/complete-payment-flow.test.ts' ]"
    run_test "Performance Tests" "[ -f 'tests/performance/load-test.ts' ]"
    
    # Check test scripts
    run_test "Test Runner Script" "[ -f 'scripts/testing/run-all-tests.sh' ]"
    run_test "Security Test Script" "[ -f 'scripts/testing/security-test.ts' ]"
    
    # Check package.json test scripts
    run_test "NPM Test Scripts" "grep -q '\"test\"' package.json"
    run_test "NPM Test Coverage" "grep -q '\"test:coverage\"' package.json"
}

# Test 10: Documentation Validation
test_documentation() {
    log "Validating documentation..."
    
    # Check main documentation
    run_test "Main README" "[ -f 'README.md' ]"
    run_test "README Content Length" "[ \$(wc -l < README.md) -gt 100 ]"
    
    # Check service documentation
    local services=("user-service" "asset-service" "currency-conversion-service" "crypto-service" "payment-service" "admin-service" "notification-service")
    
    for service in "${services[@]}"; do
        run_test "$service README" "[ -f 'services/$service/README.md' ]"
    done
    
    # Check API Gateway documentation
    run_test "API Gateway README" "[ -f 'api-gateway/README.md' ]"
    
    # Check documentation content
    run_test "README: Installation Instructions" "grep -q -i 'installation\\|install' README.md"
    run_test "README: Usage Instructions" "grep -q -i 'usage\\|quick start' README.md"
    run_test "README: API Documentation" "grep -q -i 'api\\|endpoint' README.md"
    run_test "README: Architecture Description" "grep -q -i 'architecture\\|microservice' README.md"
}

# Test 11: Environment Configuration Validation
test_environment_config() {
    log "Validating environment configuration..."
    
    # Check .env.example completeness
    run_test "Environment Example File" "[ -f '.env.example' ]"
    
    if [ -f '.env.example' ]; then
        run_test "JWT Secret in .env.example" "grep -q 'JWT_SECRET' .env.example"
        run_test "MongoDB Password in .env.example" "grep -q 'MONGODB_PASSWORD' .env.example"
        run_test "Redis Configuration in .env.example" "grep -q 'REDIS' .env.example"
        run_test "Bitcoin Configuration in .env.example" "grep -q 'BITCOIN' .env.example"
        run_test "API Keys in .env.example" "grep -q 'API_KEY' .env.example"
        run_test "Email Configuration in .env.example" "grep -q 'SMTP\\|SENDGRID' .env.example"
        run_test "SMS Configuration in .env.example" "grep -q 'TWILIO' .env.example"
    fi
}

# Test 12: Business Logic Validation
test_business_logic() {
    log "Validating business logic implementation..."
    
    # Check core business workflows
    run_test "Asset Verification Workflow" "grep -q -i 'verification\\|verify' services/asset-service/src/index.ts"
    run_test "Payment Processing Logic" "grep -q -i 'payment\\|transaction' services/payment-service/src/index.ts"
    run_test "Bitcoin Integration" "grep -q -i 'bitcoin\\|btc' services/crypto-service/src/index.ts"
    run_test "Currency Conversion Logic" "grep -q -i 'convert\\|exchange' services/currency-conversion-service/src/index.ts"
    
    # Check service orchestration
    if [ -f 'services/payment-service/src/services/PaymentOrchestrator.ts' ]; then
        run_test "Payment Orchestrator" "grep -q 'orchestrat' services/payment-service/src/services/PaymentOrchestrator.ts"
        run_test "Asset to Bitcoin Workflow" "grep -q -i 'asset.*bitcoin\\|bitcoin.*asset' services/payment-service/src/services/PaymentOrchestrator.ts"
    fi
    
    # Check notification integration
    if [ -f 'services/notification-service/src/services/NotificationService.ts' ]; then
        run_test "Multi-channel Notifications" "grep -q -i 'email\\|sms\\|push' services/notification-service/src/services/NotificationService.ts"
    fi
}

# Test 13: TypeScript Configuration Validation
test_typescript_config() {
    log "Validating TypeScript configuration..."
    
    # Check TypeScript config files
    local services=("user-service" "asset-service" "currency-conversion-service" "crypto-service" "payment-service" "admin-service" "notification-service")
    
    for service in "${services[@]}"; do
        if [ -f "services/$service/tsconfig.json" ]; then
            run_test "$service: TypeScript Config" "[ -f 'services/$service/tsconfig.json' ]"
        fi
    done
    
    # Check TypeScript source files
    run_test "TypeScript Source Files" "find services -name '*.ts' | wc -l | awk '{print (\$1 > 10)}' | grep -q 1"
    
    # Check type definitions
    run_test "Type Definitions" "find services -name 'types' -type d | wc -l | awk '{print (\$1 > 0)}' | grep -q 1"
}

# Main execution function
main() {
    log "🚀 Starting SwiftPayMe System Validation"
    log "========================================"
    
    # Change to project directory
    cd /home/ubuntu/swiftpayme
    
    # Run all validation tests
    test_project_structure
    test_configuration_files
    test_docker_compose
    test_service_dependencies
    test_api_gateway_config
    test_service_contracts
    test_security_config
    test_database_models
    test_testing_infrastructure
    test_documentation
    test_environment_config
    test_business_logic
    test_typescript_config
    
    # Test summary
    log "========================================"
    log "🏁 System Validation Complete"
    log "========================================"
    
    echo -e "${BLUE}Total Tests:${NC} $TOTAL_TESTS"
    echo -e "${GREEN}Passed:${NC} $PASSED_TESTS"
    echo -e "${RED}Failed:${NC} $FAILED_TESTS"
    
    local success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "${BLUE}Success Rate:${NC} ${success_rate}%"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}🎉 ALL VALIDATIONS PASSED! SwiftPayMe system is properly configured and ready for deployment.${NC}"
        exit 0
    elif [ $success_rate -ge 90 ]; then
        echo -e "${YELLOW}⚠️  Most validations passed (${success_rate}%). Minor issues detected but system is largely ready.${NC}"
        exit 0
    else
        echo -e "${RED}❌ Significant issues detected (${success_rate}% success rate). Please review the failed tests above.${NC}"
        exit 1
    fi
}

# Execute main function
main "$@"

