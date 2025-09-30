#!/bin/bash

# SwiftPayMe API Contract Testing Script
# Tests all microservice API endpoints and inter-service communication

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BASE_URL="http://localhost"
TIMEOUT=10

echo -e "${BLUE}🔍 SwiftPayMe API Contract Testing${NC}"
echo -e "${BLUE}===================================${NC}"

# Function to test service health
test_health() {
    local service_name=$1
    local port=$2
    local endpoint="${BASE_URL}:${port}/health"
    
    echo -e "${YELLOW}Testing ${service_name} health...${NC}"
    
    if curl -s --max-time $TIMEOUT "$endpoint" > /dev/null; then
        echo -e "${GREEN}✅ ${service_name} health check passed${NC}"
        return 0
    else
        echo -e "${RED}❌ ${service_name} health check failed${NC}"
        return 1
    fi
}

# Function to test API endpoint
test_endpoint() {
    local service_name=$1
    local port=$2
    local path=$3
    local method=${4:-GET}
    local expected_status=${5:-200}
    
    local endpoint="${BASE_URL}:${port}${path}"
    
    echo -e "${YELLOW}Testing ${service_name} ${method} ${path}...${NC}"
    
    local response=$(curl -s -w "%{http_code}" -X "$method" --max-time $TIMEOUT "$endpoint" -o /dev/null)
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✅ ${service_name} ${method} ${path} returned ${response}${NC}"
        return 0
    else
        echo -e "${RED}❌ ${service_name} ${method} ${path} returned ${response}, expected ${expected_status}${NC}"
        return 1
    fi
}

# Function to test service with authentication
test_authenticated_endpoint() {
    local service_name=$1
    local port=$2
    local path=$3
    local method=${4:-GET}
    
    local endpoint="${BASE_URL}:${port}${path}"
    
    echo -e "${YELLOW}Testing ${service_name} ${method} ${path} (auth required)...${NC}"
    
    # Test without auth (should return 401)
    local response=$(curl -s -w "%{http_code}" -X "$method" --max-time $TIMEOUT "$endpoint" -o /dev/null)
    
    if [ "$response" = "401" ] || [ "$response" = "403" ]; then
        echo -e "${GREEN}✅ ${service_name} ${method} ${path} properly requires authentication${NC}"
        return 0
    else
        echo -e "${RED}❌ ${service_name} ${method} ${path} returned ${response}, expected 401/403${NC}"
        return 1
    fi
}

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run test and count results
run_test() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if "$@"; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

echo -e "\n${BLUE}1. Testing Infrastructure Services${NC}"
echo -e "${BLUE}=================================${NC}"

# Test MongoDB (indirect through services)
echo -e "${YELLOW}MongoDB will be tested through service connections...${NC}"

# Test Redis (indirect through services)
echo -e "${YELLOW}Redis will be tested through service connections...${NC}"

echo -e "\n${BLUE}2. Testing Core Microservices${NC}"
echo -e "${BLUE}=============================${NC}"

# API Gateway (Port 3000)
echo -e "\n${YELLOW}--- API Gateway (Port 3000) ---${NC}"
run_test test_health "API Gateway" 3000
run_test test_endpoint "API Gateway" 3000 "/health" "GET" 200
run_test test_endpoint "API Gateway" 3000 "/api/status" "GET" 200

# User Service (Port 3002)
echo -e "\n${YELLOW}--- User Service (Port 3002) ---${NC}"
run_test test_health "User Service" 3002
run_test test_endpoint "User Service" 3002 "/api/auth/register" "POST" 400
run_test test_endpoint "User Service" 3002 "/api/auth/login" "POST" 400
run_test test_authenticated_endpoint "User Service" 3002 "/api/users/profile" "GET"

# Asset Service (Port 3003)
echo -e "\n${YELLOW}--- Asset Service (Port 3003) ---${NC}"
run_test test_health "Asset Service" 3003
run_test test_endpoint "Asset Service" 3003 "/api/assets/types" "GET" 200
run_test test_authenticated_endpoint "Asset Service" 3003 "/api/deposits" "GET"
run_test test_authenticated_endpoint "Asset Service" 3003 "/api/deposits" "POST"

# Currency Service (Port 3004)
echo -e "\n${YELLOW}--- Currency Service (Port 3004) ---${NC}"
run_test test_health "Currency Service" 3004
run_test test_endpoint "Currency Service" 3004 "/api/rates" "GET" 200
run_test test_endpoint "Currency Service" 3004 "/api/rates/USD/EUR" "GET" 200
run_test test_endpoint "Currency Service" 3004 "/api/metals/gold" "GET" 200

# Crypto Service (Port 3005)
echo -e "\n${YELLOW}--- Crypto Service (Port 3005) ---${NC}"
run_test test_health "Crypto Service" 3005
run_test test_endpoint "Crypto Service" 3005 "/api/bitcoin/price" "GET" 200
run_test test_authenticated_endpoint "Crypto Service" 3005 "/api/wallets" "GET"
run_test test_authenticated_endpoint "Crypto Service" 3005 "/api/transactions" "GET"

# Payment Service (Port 3006)
echo -e "\n${YELLOW}--- Payment Service (Port 3006) ---${NC}"
run_test test_health "Payment Service" 3006
run_test test_authenticated_endpoint "Payment Service" 3006 "/api/payments" "GET"
run_test test_authenticated_endpoint "Payment Service" 3006 "/api/payments" "POST"
run_test test_authenticated_endpoint "Payment Service" 3006 "/api/transactions" "GET"

# Admin Service (Port 3007)
echo -e "\n${YELLOW}--- Admin Service (Port 3007) ---${NC}"
run_test test_health "Admin Service" 3007
run_test test_authenticated_endpoint "Admin Service" 3007 "/api/admin/users" "GET"
run_test test_authenticated_endpoint "Admin Service" 3007 "/api/admin/assets" "GET"
run_test test_authenticated_endpoint "Admin Service" 3007 "/api/admin/dashboard" "GET"

# Notification Service (Port 3008)
echo -e "\n${YELLOW}--- Notification Service (Port 3008) ---${NC}"
run_test test_health "Notification Service" 3008
run_test test_authenticated_endpoint "Notification Service" 3008 "/api/notifications" "GET"
run_test test_endpoint "Notification Service" 3008 "/api/templates" "GET" 200

# Tokenization Service (Port 3009)
echo -e "\n${YELLOW}--- Tokenization Service (Port 3009) ---${NC}"
run_test test_health "Tokenization Service" 3009
run_test test_authenticated_endpoint "Tokenization Service" 3009 "/api/tokens" "GET"
run_test test_authenticated_endpoint "Tokenization Service" 3009 "/api/tokens" "POST"

# Ledger Service (Port 3010)
echo -e "\n${YELLOW}--- Ledger Service (Port 3010) ---${NC}"
run_test test_health "Ledger Service" 3010
run_test test_authenticated_endpoint "Ledger Service" 3010 "/api/accounts" "GET"
run_test test_authenticated_endpoint "Ledger Service" 3010 "/api/transactions" "GET"
run_test test_authenticated_endpoint "Ledger Service" 3010 "/api/journal" "GET"

# Account Service (Port 3011)
echo -e "\n${YELLOW}--- Account Service (Port 3011) ---${NC}"
run_test test_health "Account Service" 3011
run_test test_authenticated_endpoint "Account Service" 3011 "/api/accounts" "GET"
run_test test_authenticated_endpoint "Account Service" 3011 "/api/balances" "GET"
run_test test_authenticated_endpoint "Account Service" 3011 "/api/transactions" "GET"

echo -e "\n${BLUE}3. Testing Frontend Applications${NC}"
echo -e "${BLUE}===============================${NC}"

# Web UI (Port 3000 - same as API Gateway in current setup)
echo -e "\n${YELLOW}--- Web UI ---${NC}"
echo -e "${YELLOW}Web UI is served through API Gateway on port 3000${NC}"

# Admin UI (Port 3001)
echo -e "\n${YELLOW}--- Admin UI (Port 3001) ---${NC}"
run_test test_endpoint "Admin UI" 3001 "/" "GET" 200

echo -e "\n${BLUE}4. Testing Inter-Service Communication${NC}"
echo -e "${BLUE}=====================================${NC}"

# Test service discovery through API Gateway
echo -e "\n${YELLOW}--- Service Discovery ---${NC}"
run_test test_endpoint "API Gateway" 3000 "/api/users/health" "GET" 200
run_test test_endpoint "API Gateway" 3000 "/api/assets/health" "GET" 200
run_test test_endpoint "API Gateway" 3000 "/api/currency/health" "GET" 200

echo -e "\n${BLUE}5. Test Results Summary${NC}"
echo -e "${BLUE}======================${NC}"
echo -e "Total Tests: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All API contract tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  Some API contract tests failed. Please review the output above.${NC}"
    exit 1
fi
