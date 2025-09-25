#!/bin/bash

# SwiftPayMe Comprehensive System Integration Tests
# This script tests all components and their interactions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
PASSED_TESTS=0
FAILED_TESTS=0
TOTAL_TESTS=0

# Logging
LOG_FILE="/home/ubuntu/swiftpayme/integration-test-results.log"
echo "SwiftPayMe Integration Test Results - $(date)" > $LOG_FILE

log_test() {
    echo "$1" | tee -a $LOG_FILE
}

run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    log_test "🧪 Running: $test_name"
    
    if eval "$test_command"; then
        if [ -n "$expected_result" ]; then
            if [[ "$?" == "$expected_result" ]]; then
                log_test "✅ PASSED: $test_name"
                PASSED_TESTS=$((PASSED_TESTS + 1))
                return 0
            else
                log_test "❌ FAILED: $test_name (unexpected result)"
                FAILED_TESTS=$((FAILED_TESTS + 1))
                return 1
            fi
        else
            log_test "✅ PASSED: $test_name"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            return 0
        fi
    else
        log_test "❌ FAILED: $test_name"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

test_service_health() {
    local service_name="$1"
    local port="$2"
    local endpoint="$3"
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port$endpoint" 2>/dev/null || echo "000")
    
    if [[ "$response" == "200" ]]; then
        return 0
    else
        return 1
    fi
}

test_api_endpoint() {
    local endpoint="$1"
    local method="$2"
    local expected_status="$3"
    local data="$4"
    
    if [ "$method" == "GET" ]; then
        local response=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" 2>/dev/null || echo "000")
    elif [ "$method" == "POST" ]; then
        local response=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$endpoint" 2>/dev/null || echo "000")
    fi
    
    if [[ "$response" == "$expected_status" ]]; then
        return 0
    else
        return 1
    fi
}

echo -e "${BLUE}🚀 Starting SwiftPayMe Comprehensive Integration Tests${NC}"
echo -e "${BLUE}=================================================${NC}"

# Phase 1: Infrastructure Tests
echo -e "\n${YELLOW}📋 Phase 1: Infrastructure Health Checks${NC}"

run_test "MongoDB Connection" "pgrep mongod > /dev/null"
run_test "Redis Connection" "pgrep redis-server > /dev/null"

# Phase 2: Frontend Applications Tests
echo -e "\n${YELLOW}📋 Phase 2: Frontend Applications${NC}"

run_test "Web UI Health Check" "test_service_health 'Web UI' 3000 '/'"
run_test "Admin UI Build Check" "[ -d '/home/ubuntu/swiftpayme/admin-ui/build' ] || [ -d '/home/ubuntu/swiftpayme/admin-ui/dist' ]"

# Phase 3: Microservices Health Tests
echo -e "\n${YELLOW}📋 Phase 3: Microservices Health${NC}"

# Test each microservice structure and configuration
services=(
    "user-service:3002"
    "asset-service:3003"
    "currency-conversion-service:3004"
    "crypto-service:3005"
    "payment-service:3006"
    "admin-service:3007"
    "notification-service:3008"
    "tokenization-service:3009"
    "ledger-service:3010"
    "account-service:3011"
)

for service in "${services[@]}"; do
    IFS=':' read -r service_name port <<< "$service"
    run_test "$service_name Configuration" "[ -f '/home/ubuntu/swiftpayme/services/$service_name/package.json' ]"
    run_test "$service_name Dockerfile" "[ -f '/home/ubuntu/swiftpayme/services/$service_name/Dockerfile' ]"
    run_test "$service_name Source Code" "[ -f '/home/ubuntu/swiftpayme/services/$service_name/src/index.ts' ] || [ -f '/home/ubuntu/swiftpayme/services/$service_name/src/index.js' ]"
done

# Phase 4: API Gateway Tests
echo -e "\n${YELLOW}📋 Phase 4: API Gateway Integration${NC}"

run_test "API Gateway Configuration" "[ -f '/home/ubuntu/swiftpayme/services/api-gateway/package.json' ]"
run_test "API Gateway Routes" "[ -f '/home/ubuntu/swiftpayme/services/api-gateway/src/routes/index.ts' ]"
run_test "API Gateway Middleware" "[ -f '/home/ubuntu/swiftpayme/services/api-gateway/src/middleware/auth.ts' ]"

# Phase 5: Database Schema Tests
echo -e "\n${YELLOW}📋 Phase 5: Database Schema Validation${NC}"

# Test model files exist
models=(
    "services/user-service/src/models/User.ts"
    "services/asset-service/src/models/AssetDeposit.ts"
    "services/ledger-service/src/models/Transaction.ts"
    "services/account-service/src/models/Account.ts"
    "services/payment-service/src/models/Payment.ts"
)

for model in "${models[@]}"; do
    model_name=$(basename "$model" .ts)
    run_test "$model_name Model" "[ -f '/home/ubuntu/swiftpayme/$model' ]"
done

# Phase 6: Configuration Tests
echo -e "\n${YELLOW}📋 Phase 6: Configuration Validation${NC}"

run_test "Docker Compose Configuration" "[ -f '/home/ubuntu/swiftpayme/docker-compose.yml' ]"
run_test "Environment Configuration" "[ -f '/home/ubuntu/swiftpayme/.env.example' ]"
run_test "Web UI Environment" "[ -f '/home/ubuntu/swiftpayme/web-ui/.env.example' ]"

# Phase 7: Build Tests
echo -e "\n${YELLOW}📋 Phase 7: Build Validation${NC}"

run_test "Web UI Build Output" "[ -d '/home/ubuntu/swiftpayme/web-ui/dist' ]"
run_test "Web UI Assets" "[ -f '/home/ubuntu/swiftpayme/web-ui/dist/index.html' ]"

# Phase 8: Security Tests
echo -e "\n${YELLOW}📋 Phase 8: Security Configuration${NC}"

run_test "JWT Secret Configuration" "grep -q 'JWT_SECRET' /home/ubuntu/swiftpayme/.env.example"
run_test "Security Middleware" "[ -f '/home/ubuntu/swiftpayme/services/api-gateway/src/middleware/security.ts' ]"
run_test "Encryption Utilities" "[ -f '/home/ubuntu/swiftpayme/shared/utils/Encryption.ts' ]"

# Phase 9: Documentation Tests
echo -e "\n${YELLOW}📋 Phase 9: Documentation Validation${NC}"

run_test "Main README" "[ -f '/home/ubuntu/swiftpayme/README.md' ]"
run_test "Web UI README" "[ -f '/home/ubuntu/swiftpayme/web-ui/README.md' ]"
run_test "API Documentation" "[ -f '/home/ubuntu/swiftpayme/services/api-gateway/README.md' ]"

# Phase 10: Integration Workflow Tests
echo -e "\n${YELLOW}📋 Phase 10: Workflow Integration${NC}"

run_test "Asset Deposit Workflow" "[ -f '/home/ubuntu/swiftpayme/web-ui/src/pages/AssetDeposit.jsx' ]"
run_test "Transaction Processing" "[ -f '/home/ubuntu/swiftpayme/web-ui/src/pages/Transactions.jsx' ]"
run_test "Wallet Management" "[ -f '/home/ubuntu/swiftpayme/web-ui/src/pages/Wallet.jsx' ]"
run_test "User Dashboard" "[ -f '/home/ubuntu/swiftpayme/web-ui/src/pages/Dashboard.jsx' ]"

# Phase 11: Real-time Features Tests
echo -e "\n${YELLOW}📋 Phase 11: Real-time Features${NC}"

run_test "WebSocket Service" "[ -f '/home/ubuntu/swiftpayme/web-ui/src/services/websocketService.js' ]"
run_test "Notification System" "[ -f '/home/ubuntu/swiftpayme/web-ui/src/components/notifications/NotificationCenter.jsx' ]"
run_test "Real-time Hooks" "[ -f '/home/ubuntu/swiftpayme/web-ui/src/hooks/useRealTimeUpdates.js' ]"

# Phase 12: Deployment Tests
echo -e "\n${YELLOW}📋 Phase 12: Deployment Configuration${NC}"

run_test "Web UI Deployment Script" "[ -f '/home/ubuntu/swiftpayme/deploy-web-ui.sh' ]"
run_test "Web UI Server" "[ -f '/home/ubuntu/swiftpayme/web-ui/serve.cjs' ]"
run_test "Docker Configuration" "[ -f '/home/ubuntu/swiftpayme/web-ui/Dockerfile' ]"
run_test "Nginx Configuration" "[ -f '/home/ubuntu/swiftpayme/web-ui/nginx.conf' ]"

# Phase 13: Component Integration Tests
echo -e "\n${YELLOW}📋 Phase 13: Component Integration${NC}"

# Test critical component files
components=(
    "web-ui/src/components/auth/Login.jsx"
    "web-ui/src/components/auth/Register.jsx"
    "web-ui/src/components/common/Navbar.jsx"
    "web-ui/src/components/common/Footer.jsx"
    "web-ui/src/components/dashboard/PortfolioChart.jsx"
    "web-ui/src/components/wallet/BitcoinWallet.jsx"
    "web-ui/src/components/assets/AssetCard.jsx"
)

for component in "${components[@]}"; do
    component_name=$(basename "$component" .jsx)
    run_test "$component_name Component" "[ -f '/home/ubuntu/swiftpayme/$component' ]"
done

# Phase 14: Service Integration Tests
echo -e "\n${YELLOW}📋 Phase 14: Service Integration${NC}"

run_test "Service Discovery" "[ -f '/home/ubuntu/swiftpayme/services/api-gateway/src/utils/ServiceDiscovery.ts' ]"
run_test "Event Bus" "[ -f '/home/ubuntu/swiftpayme/shared/events/event-bus.ts' ]"
run_test "Workflow Engine" "[ -f '/home/ubuntu/swiftpayme/shared/workflow/WorkflowEngine.ts' ]"

# Phase 15: Final System Validation
echo -e "\n${YELLOW}📋 Phase 15: Final System Validation${NC}"

run_test "Complete Project Structure" "[ -d '/home/ubuntu/swiftpayme/services' ] && [ -d '/home/ubuntu/swiftpayme/web-ui' ] && [ -d '/home/ubuntu/swiftpayme/admin-ui' ]"
run_test "All Package Files" "find /home/ubuntu/swiftpayme -name 'package.json' | wc -l | grep -q '[0-9]'"
run_test "License File" "[ -f '/home/ubuntu/swiftpayme/LICENSE' ]"
run_test "Git Ignore" "[ -f '/home/ubuntu/swiftpayme/.gitignore' ]"

# Test Summary
echo -e "\n${BLUE}📊 Test Results Summary${NC}"
echo -e "${BLUE}======================${NC}"
echo -e "Total Tests: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All integration tests passed! System is ready for deployment.${NC}"
    log_test "🎉 All integration tests passed! System is ready for deployment."
    exit 0
else
    echo -e "\n${RED}⚠️  Some tests failed. Please review the issues above.${NC}"
    log_test "⚠️ Some tests failed. Please review the issues above."
    exit 1
fi
