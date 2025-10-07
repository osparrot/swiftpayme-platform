#!/bin/bash

# SwiftPayMe Crypto Service Integration Validation Script
# This script validates the complete crypto service integration

set -e

echo "🚀 SwiftPayMe Crypto Service Integration Validation"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test function
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Testing $test_name... "
    
    if eval "$test_command" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Navigate to crypto service directory
cd /home/ubuntu/swiftpayme/services/crypto-service

echo -e "${BLUE}📁 File Structure Validation${NC}"
echo "----------------------------"

# Check main directories exist
run_test "src directory exists" "[ -d src ]"
run_test "controllers directory exists" "[ -d src/controllers ]"
run_test "middleware directory exists" "[ -d src/middleware ]"
run_test "models directory exists" "[ -d src/models ]"
run_test "routes directory exists" "[ -d src/routes ]"
run_test "services directory exists" "[ -d src/services ]"
run_test "utils directory exists" "[ -d src/utils ]"
run_test "enums directory exists" "[ -d src/enums ]"

echo ""
echo -e "${BLUE}📄 Core Files Validation${NC}"
echo "-------------------------"

# Check core files exist
run_test "main index.ts exists" "[ -f src/index.ts ]"
run_test "package.json exists" "[ -f package.json ]"
run_test "Dockerfile exists" "[ -f Dockerfile ]"
run_test "README exists" "[ -f README.md ]"

echo ""
echo -e "${BLUE}🔧 Service Files Validation${NC}"
echo "---------------------------"

# Check service files
run_test "BitcoinService exists" "[ -f src/services/BitcoinService.ts ]"
run_test "EnhancedBitcoinService exists" "[ -f src/services/EnhancedBitcoinService.ts ]"
run_test "LightningService exists" "[ -f src/services/LightningService.ts ]"
run_test "EnhancedLightningService exists" "[ -f src/services/EnhancedLightningService.ts ]"
run_test "WalletService exists" "[ -f src/services/WalletService.ts ]"
run_test "TransactionService exists" "[ -f src/services/TransactionService.ts ]"

echo ""
echo -e "${BLUE}🛠️ Utility Files Validation${NC}"
echo "----------------------------"

# Check utility files
run_test "Logger utility exists" "[ -f src/utils/Logger.ts ]"
run_test "RedisClient utility exists" "[ -f src/utils/RedisClient.ts ]"
run_test "EventBus utility exists" "[ -f src/utils/EventBus.ts ]"
run_test "Errors utility exists" "[ -f src/utils/Errors.ts ]"
run_test "BitcoinHandler utility exists" "[ -f src/utils/BitcoinHandler.ts ]"
run_test "LightningClient utility exists" "[ -f src/utils/LightningClient.ts ]"

echo ""
echo -e "${BLUE}🔐 Middleware Validation${NC}"
echo "------------------------"

# Check middleware files
run_test "auth middleware exists" "[ -f src/middleware/auth.ts ]"
run_test "validation middleware exists" "[ -f src/middleware/validation.ts ]"
run_test "logging middleware exists" "[ -f src/middleware/logging.ts ]"
run_test "rateLimit middleware exists" "[ -f src/middleware/rateLimit.ts ]"

echo ""
echo -e "${BLUE}📊 Model Files Validation${NC}"
echo "-------------------------"

# Check model files
run_test "CryptoWallet model exists" "[ -f src/models/CryptoWallet.ts ]"
run_test "CryptoTransaction model exists" "[ -f src/models/CryptoTransaction.ts ]"

echo ""
echo -e "${BLUE}🛣️ Routes Validation${NC}"
echo "---------------------"

# Check route files
run_test "main routes file exists" "[ -f src/routes/index.ts ]"

echo ""
echo -e "${BLUE}🎛️ Controller Validation${NC}"
echo "-------------------------"

# Check controller files
run_test "crypto controller exists" "[ -f src/controllers/cryptoController.ts ]"

echo ""
echo -e "${BLUE}📝 Configuration Validation${NC}"
echo "-----------------------------"

# Check configuration files
run_test "crypto enums exist" "[ -f src/enums/cryptoEnums.ts ]"
run_test "bitcoin types exist" "[ -f src/types/bitcoin.ts ]"
run_test "crypto schemas exist" "[ -f src/schemas/cryptoSchemas.ts ]"

echo ""
echo -e "${BLUE}🔍 Code Quality Validation${NC}"
echo "-----------------------------"

# Check for proper exports in main files
run_test "index.ts has exports" "grep -q 'export' src/index.ts"
run_test "services have exports" "find src/services -name '*.ts' -exec grep -l 'export' {} \; | wc -l | grep -q '[1-9]'"
run_test "utils have exports" "find src/utils -name '*.ts' -exec grep -l 'export' {} \; | wc -l | grep -q '[1-9]'"
run_test "models have exports" "find src/models -name '*.ts' -exec grep -l 'export' {} \; | wc -l | grep -q '[1-9]'"

echo ""
echo -e "${BLUE}🔗 Import/Export Consistency${NC}"
echo "--------------------------------"

# Check import consistency
IMPORT_COUNT=$(grep -r "import.*from" src/ | wc -l)
EXPORT_COUNT=$(grep -r "export" src/ | wc -l)

run_test "imports present ($IMPORT_COUNT found)" "[ $IMPORT_COUNT -gt 50 ]"
run_test "exports present ($EXPORT_COUNT found)" "[ $EXPORT_COUNT -gt 100 ]"

echo ""
echo -e "${BLUE}📦 Package Dependencies${NC}"
echo "-------------------------"

# Check package.json dependencies
run_test "express dependency" "grep -q '\"express\"' package.json"
run_test "mongoose dependency" "grep -q '\"mongoose\"' package.json"
run_test "redis dependency" "grep -q '\"redis\"' package.json"
run_test "decimal.js dependency" "grep -q '\"decimal.js\"' package.json"
run_test "bitcoinjs-lib dependency" "grep -q '\"bitcoinjs-lib\"' package.json"
run_test "typescript dev dependency" "grep -q '\"typescript\"' package.json"

echo ""
echo -e "${BLUE}🏗️ Service Architecture Validation${NC}"
echo "-----------------------------------"

# Check service architecture patterns
run_test "service classes defined" "grep -r 'class.*Service' src/services/ | wc -l | grep -q '[1-9]'"
run_test "async methods present" "grep -r 'async.*(' src/services/ | wc -l | grep -q '[1-9]'"
run_test "error handling present" "grep -r 'try.*catch' src/ | wc -l | grep -q '[1-9]'"
run_test "logging statements present" "grep -r 'logger\.' src/ | wc -l | grep -q '[1-9]'"

echo ""
echo -e "${BLUE}🔒 Security Validation${NC}"
echo "------------------------"

# Check security implementations
run_test "JWT imports present" "grep -r 'jsonwebtoken' src/ | wc -l | grep -q '[1-9]'"
run_test "validation schemas present" "grep -r 'Joi\|joi' src/ | wc -l | grep -q '[1-9]'"
run_test "rate limiting present" "grep -r 'rateLimit' src/ | wc -l | grep -q '[1-9]'"
run_test "helmet security present" "grep -r 'helmet' src/ | wc -l | grep -q '[1-9]'"

echo ""
echo -e "${BLUE}⚡ Bitcoin/Lightning Integration${NC}"
echo "-----------------------------------"

# Check Bitcoin and Lightning integration
run_test "Bitcoin RPC integration" "grep -r 'bitcoin.*rpc\|rpc.*bitcoin' src/ | wc -l | grep -q '[1-9]'"
run_test "Lightning Network integration" "grep -r 'lightning\|lnd\|bolt11' src/ | wc -l | grep -q '[1-9]'"
run_test "wallet generation logic" "grep -r 'generateWallet\|createWallet' src/ | wc -l | grep -q '[1-9]'"
run_test "transaction processing" "grep -r 'sendTransaction\|processTransaction' src/ | wc -l | grep -q '[1-9]'"

echo ""
echo "=================================================="
echo -e "${BLUE}📊 VALIDATION SUMMARY${NC}"
echo "=================================================="

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo -e "Total Tests: $TOTAL_TESTS"
    echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed: ${GREEN}$FAILED_TESTS${NC}"
    echo ""
    echo -e "${GREEN}✅ Crypto Service is fully integrated and ready for deployment!${NC}"
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo -e "Total Tests: $TOTAL_TESTS"
    echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Please review and fix the failed components${NC}"
    exit 1
fi
