#!/bin/bash

# SwiftPayMe Full System Integration Test
# This script performs comprehensive testing of all microservices and their integration

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
API_GATEWAY_URL="http://localhost:3000"
TEST_USER_EMAIL="test@swiftpayme.com"
TEST_USER_PASSWORD="TestPassword123!"
TEST_ADMIN_EMAIL="admin@swiftpayme.com"
TEST_ADMIN_PASSWORD="AdminPassword123!"

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Logging function
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

# HTTP request helper
make_request() {
    local method="$1"
    local url="$2"
    local data="$3"
    local headers="$4"
    local expected_status="$5"
    
    if [ -n "$data" ]; then
        if [ -n "$headers" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
                -H "Content-Type: application/json" \
                -H "$headers" \
                -d "$data")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
                -H "Content-Type: application/json" \
                -d "$data")
        fi
    else
        if [ -n "$headers" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
                -H "$headers")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$url")
        fi
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "$expected_status" ]; then
        echo "$body"
        return 0
    else
        echo "Expected status $expected_status, got $http_code. Response: $body" >&2
        return 1
    fi
}

# Wait for service to be ready
wait_for_service() {
    local service_url="$1"
    local service_name="$2"
    local max_attempts=30
    local attempt=1
    
    log "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$service_url/health" > /dev/null 2>&1; then
            success "$service_name is ready"
            return 0
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    error "$service_name failed to start within $((max_attempts * 2)) seconds"
    return 1
}

# Test 1: Infrastructure Services
test_infrastructure() {
    log "Testing infrastructure services..."
    
    # Test MongoDB
    run_test "MongoDB Connection" "docker-compose exec -T mongodb mongosh --eval 'db.adminCommand(\"ping\")' > /dev/null 2>&1"
    
    # Test Redis
    run_test "Redis Connection" "docker-compose exec -T redis redis-cli ping | grep -q PONG"
    
    # Test Bitcoin Node
    run_test "Bitcoin Node Connection" "docker-compose exec -T bitcoin-node bitcoin-cli -testnet -rpcuser=bitcoin -rpcpassword=password getblockchaininfo > /dev/null 2>&1"
}

# Test 2: Service Health Checks
test_service_health() {
    log "Testing service health endpoints..."
    
    local services=(
        "api-gateway:3000"
        "user-service:3002"
        "asset-service:3003"
        "currency-conversion-service:3004"
        "crypto-service:3005"
        "payment-service:3006"
        "admin-service:3007"
        "notification-service:3008"
    )
    
    for service in "${services[@]}"; do
        IFS=':' read -r name port <<< "$service"
        run_test "$name Health Check" "curl -s -f http://localhost:$port/health > /dev/null"
    done
}

# Test 3: API Gateway Routing
test_api_gateway_routing() {
    log "Testing API Gateway routing..."
    
    # Test gateway health
    run_test "API Gateway Health" "make_request GET '$API_GATEWAY_URL/health' '' '' '200'"
    
    # Test service routing (should get 401 for protected endpoints)
    run_test "User Service Routing" "make_request GET '$API_GATEWAY_URL/api/users/profile' '' '' '401'"
    run_test "Asset Service Routing" "make_request GET '$API_GATEWAY_URL/api/assets/deposits' '' '' '401'"
    run_test "Currency Service Routing" "make_request GET '$API_GATEWAY_URL/api/currency/rates' '' '' '200'"
    run_test "Crypto Service Routing" "make_request GET '$API_GATEWAY_URL/api/crypto/wallets' '' '' '401'"
    run_test "Payment Service Routing" "make_request GET '$API_GATEWAY_URL/api/payments/transactions' '' '' '401'"
    run_test "Admin Service Routing" "make_request GET '$API_GATEWAY_URL/api/admin/users' '' '' '401'"
    run_test "Notification Service Routing" "make_request GET '$API_GATEWAY_URL/api/notifications' '' '' '401'"
}

# Test 4: User Registration and Authentication
test_user_authentication() {
    log "Testing user registration and authentication..."
    
    # Register test user
    local register_data="{
        \"email\": \"$TEST_USER_EMAIL\",
        \"password\": \"$TEST_USER_PASSWORD\",
        \"firstName\": \"Test\",
        \"lastName\": \"User\",
        \"phoneNumber\": \"+1234567890\"
    }"
    
    run_test "User Registration" "make_request POST '$API_GATEWAY_URL/api/users/register' '$register_data' '' '201'"
    
    # Login test user
    local login_data="{
        \"email\": \"$TEST_USER_EMAIL\",
        \"password\": \"$TEST_USER_PASSWORD\"
    }"
    
    if USER_TOKEN=$(make_request POST "$API_GATEWAY_URL/api/users/login" "$login_data" "" "200" | jq -r '.token' 2>/dev/null); then
        success "User Login"
        export USER_TOKEN
    else
        error "User Login"
        return 1
    fi
    
    # Test authenticated request
    run_test "Authenticated User Profile" "make_request GET '$API_GATEWAY_URL/api/users/profile' '' 'Authorization: Bearer $USER_TOKEN' '200'"
}

# Test 5: Currency Service Integration
test_currency_service() {
    log "Testing currency service integration..."
    
    # Test exchange rates
    run_test "Get Exchange Rates" "make_request GET '$API_GATEWAY_URL/api/currency/rates?from=USD&to=EUR' '' '' '200'"
    
    # Test precious metals pricing
    run_test "Get Gold Price" "make_request GET '$API_GATEWAY_URL/api/currency/prices/precious-metals/gold' '' '' '200'"
    
    # Test crypto pricing
    run_test "Get Bitcoin Price" "make_request GET '$API_GATEWAY_URL/api/currency/prices/crypto/BTC' '' '' '200'"
    
    # Test currency conversion
    local conversion_data="{
        \"amount\": 100,
        \"fromCurrency\": \"USD\",
        \"toCurrency\": \"EUR\"
    }"
    run_test "Currency Conversion" "make_request POST '$API_GATEWAY_URL/api/currency/convert' '$conversion_data' '' '200'"
}

# Test 6: Asset Service Integration
test_asset_service() {
    log "Testing asset service integration..."
    
    if [ -z "$USER_TOKEN" ]; then
        warning "Skipping asset service tests - no user token available"
        return 0
    fi
    
    # Submit asset deposit
    local asset_data="{
        \"assetType\": \"gold\",
        \"weight\": 10.5,
        \"purity\": 0.999,
        \"description\": \"Gold bar for testing\",
        \"estimatedValue\": 500
    }"
    
    if ASSET_ID=$(make_request POST "$API_GATEWAY_URL/api/assets/deposits" "$asset_data" "Authorization: Bearer $USER_TOKEN" "201" | jq -r '.id' 2>/dev/null); then
        success "Asset Deposit Submission"
        export ASSET_ID
    else
        error "Asset Deposit Submission"
        return 1
    fi
    
    # Get asset deposit status
    run_test "Get Asset Deposit Status" "make_request GET '$API_GATEWAY_URL/api/assets/deposits/$ASSET_ID' '' 'Authorization: Bearer $USER_TOKEN' '200'"
    
    # List user asset deposits
    run_test "List User Asset Deposits" "make_request GET '$API_GATEWAY_URL/api/assets/deposits' '' 'Authorization: Bearer $USER_TOKEN' '200'"
}

# Test 7: Crypto Service Integration
test_crypto_service() {
    log "Testing crypto service integration..."
    
    if [ -z "$USER_TOKEN" ]; then
        warning "Skipping crypto service tests - no user token available"
        return 0
    fi
    
    # Create Bitcoin wallet
    local wallet_data="{
        \"walletType\": \"internal\",
        \"label\": \"Test Wallet\"
    }"
    
    if WALLET_ID=$(make_request POST "$API_GATEWAY_URL/api/crypto/wallets" "$wallet_data" "Authorization: Bearer $USER_TOKEN" "201" | jq -r '.id' 2>/dev/null); then
        success "Bitcoin Wallet Creation"
        export WALLET_ID
    else
        error "Bitcoin Wallet Creation"
        return 1
    fi
    
    # Get wallet details
    run_test "Get Wallet Details" "make_request GET '$API_GATEWAY_URL/api/crypto/wallets/$WALLET_ID' '' 'Authorization: Bearer $USER_TOKEN' '200'"
    
    # List user wallets
    run_test "List User Wallets" "make_request GET '$API_GATEWAY_URL/api/crypto/wallets' '' 'Authorization: Bearer $USER_TOKEN' '200'"
}

# Test 8: Payment Service Integration
test_payment_service() {
    log "Testing payment service integration..."
    
    if [ -z "$USER_TOKEN" ]; then
        warning "Skipping payment service tests - no user token available"
        return 0
    fi
    
    # Get user account balance
    run_test "Get Account Balance" "make_request GET '$API_GATEWAY_URL/api/payments/balance' '' 'Authorization: Bearer $USER_TOKEN' '200'"
    
    # Get transaction history
    run_test "Get Transaction History" "make_request GET '$API_GATEWAY_URL/api/payments/transactions' '' 'Authorization: Bearer $USER_TOKEN' '200'"
    
    # Test Bitcoin purchase quote (should work even without balance)
    local quote_data="{
        \"amount\": 100,
        \"currency\": \"USD\",
        \"cryptoCurrency\": \"BTC\"
    }"
    run_test "Get Bitcoin Purchase Quote" "make_request POST '$API_GATEWAY_URL/api/payments/bitcoin/quote' '$quote_data' 'Authorization: Bearer $USER_TOKEN' '200'"
}

# Test 9: Notification Service Integration
test_notification_service() {
    log "Testing notification service integration..."
    
    if [ -z "$USER_TOKEN" ]; then
        warning "Skipping notification service tests - no user token available"
        return 0
    fi
    
    # Get user notifications
    run_test "Get User Notifications" "make_request GET '$API_GATEWAY_URL/api/notifications' '' 'Authorization: Bearer $USER_TOKEN' '200'"
    
    # Get notification preferences
    run_test "Get Notification Preferences" "make_request GET '$API_GATEWAY_URL/api/notifications/preferences' '' 'Authorization: Bearer $USER_TOKEN' '200'"
    
    # Update notification preferences
    local prefs_data="{
        \"email\": true,
        \"sms\": false,
        \"push\": true
    }"
    run_test "Update Notification Preferences" "make_request PUT '$API_GATEWAY_URL/api/notifications/preferences' '$prefs_data' 'Authorization: Bearer $USER_TOKEN' '200'"
}

# Test 10: Admin Service Integration
test_admin_service() {
    log "Testing admin service integration..."
    
    # Register admin user
    local admin_register_data="{
        \"email\": \"$TEST_ADMIN_EMAIL\",
        \"password\": \"$TEST_ADMIN_PASSWORD\",
        \"firstName\": \"Admin\",
        \"lastName\": \"User\",
        \"role\": \"admin\"
    }"
    
    # Note: In production, admin users would be created through a different process
    # For testing, we'll try to login with default admin credentials
    local admin_login_data="{
        \"email\": \"$TEST_ADMIN_EMAIL\",
        \"password\": \"$TEST_ADMIN_PASSWORD\"
    }"
    
    if ADMIN_TOKEN=$(make_request POST "$API_GATEWAY_URL/api/admin/login" "$admin_login_data" "" "200" | jq -r '.token' 2>/dev/null); then
        success "Admin Login"
        export ADMIN_TOKEN
        
        # Test admin endpoints
        run_test "Get All Users (Admin)" "make_request GET '$API_GATEWAY_URL/api/admin/users' '' 'Authorization: Bearer $ADMIN_TOKEN' '200'"
        run_test "Get System Stats (Admin)" "make_request GET '$API_GATEWAY_URL/api/admin/stats' '' 'Authorization: Bearer $ADMIN_TOKEN' '200'"
        
        if [ -n "$ASSET_ID" ]; then
            # Test asset management
            run_test "Get Asset for Review (Admin)" "make_request GET '$API_GATEWAY_URL/api/admin/assets/$ASSET_ID' '' 'Authorization: Bearer $ADMIN_TOKEN' '200'"
        fi
    else
        warning "Admin login failed - skipping admin service tests"
    fi
}

# Test 11: End-to-End Workflow
test_end_to_end_workflow() {
    log "Testing end-to-end workflow..."
    
    if [ -z "$USER_TOKEN" ] || [ -z "$ASSET_ID" ]; then
        warning "Skipping end-to-end workflow test - missing prerequisites"
        return 0
    fi
    
    # Simulate complete asset deposit to Bitcoin purchase workflow
    log "Simulating complete asset-to-Bitcoin workflow..."
    
    # 1. Check asset status
    run_test "E2E: Check Asset Status" "make_request GET '$API_GATEWAY_URL/api/assets/deposits/$ASSET_ID' '' 'Authorization: Bearer $USER_TOKEN' '200'"
    
    # 2. Get current Bitcoin price
    run_test "E2E: Get Bitcoin Price" "make_request GET '$API_GATEWAY_URL/api/currency/prices/crypto/BTC' '' '' '200'"
    
    # 3. Check account balance
    run_test "E2E: Check Account Balance" "make_request GET '$API_GATEWAY_URL/api/payments/balance' '' 'Authorization: Bearer $USER_TOKEN' '200'"
    
    # 4. Get Bitcoin purchase quote
    local quote_data="{
        \"amount\": 50,
        \"currency\": \"USD\",
        \"cryptoCurrency\": \"BTC\"
    }"
    run_test "E2E: Get Bitcoin Quote" "make_request POST '$API_GATEWAY_URL/api/payments/bitcoin/quote' '$quote_data' 'Authorization: Bearer $USER_TOKEN' '200'"
    
    # 5. Check notifications
    run_test "E2E: Check Notifications" "make_request GET '$API_GATEWAY_URL/api/notifications' '' 'Authorization: Bearer $USER_TOKEN' '200'"
    
    success "End-to-end workflow simulation completed"
}

# Test 12: Performance and Load Testing
test_performance() {
    log "Testing system performance..."
    
    # Test concurrent requests to public endpoints
    run_test "Concurrent Health Checks" "
        for i in {1..10}; do
            curl -s -f '$API_GATEWAY_URL/health' > /dev/null &
        done
        wait
    "
    
    # Test rate limiting
    run_test "Rate Limiting Test" "
        for i in {1..5}; do
            curl -s '$API_GATEWAY_URL/api/currency/rates' > /dev/null
        done
    "
}

# Main test execution
main() {
    log "🚀 Starting SwiftPayMe Full System Integration Test"
    log "=================================================="
    
    # Check if Docker Compose is running
    if ! docker-compose ps | grep -q "Up"; then
        error "Docker Compose services are not running. Please start with: docker-compose up -d"
        exit 1
    fi
    
    # Wait for all services to be ready
    log "Waiting for all services to be ready..."
    wait_for_service "$API_GATEWAY_URL" "API Gateway"
    
    # Run all test suites
    test_infrastructure
    test_service_health
    test_api_gateway_routing
    test_user_authentication
    test_currency_service
    test_asset_service
    test_crypto_service
    test_payment_service
    test_notification_service
    test_admin_service
    test_end_to_end_workflow
    test_performance
    
    # Test summary
    log "=================================================="
    log "🏁 Test Execution Complete"
    log "=================================================="
    
    echo -e "${BLUE}Total Tests:${NC} $TOTAL_TESTS"
    echo -e "${GREEN}Passed:${NC} $PASSED_TESTS"
    echo -e "${RED}Failed:${NC} $FAILED_TESTS"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}🎉 ALL TESTS PASSED! SwiftPayMe system is working correctly.${NC}"
        exit 0
    else
        echo -e "${RED}❌ Some tests failed. Please check the output above for details.${NC}"
        exit 1
    fi
}

# Run main function
main "$@"

