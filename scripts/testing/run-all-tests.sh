#!/bin/bash

# SwiftPayMe - Comprehensive Test Runner
# This script runs all test suites for the SwiftPayMe payment system

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TEST_DIR="$PROJECT_ROOT/tests"
REPORTS_DIR="$PROJECT_ROOT/test-reports"
COVERAGE_DIR="$PROJECT_ROOT/coverage"

# Test configuration
UNIT_TEST_TIMEOUT=30
INTEGRATION_TEST_TIMEOUT=120
E2E_TEST_TIMEOUT=300
LOAD_TEST_DURATION=60
LOAD_TEST_USERS=50

# Service URLs (can be overridden by environment variables)
API_GATEWAY_URL=${API_GATEWAY_URL:-"http://localhost:3000"}
USER_SERVICE_URL=${USER_SERVICE_URL:-"http://localhost:3002"}
ASSET_SERVICE_URL=${ASSET_SERVICE_URL:-"http://localhost:3003"}
CURRENCY_SERVICE_URL=${CURRENCY_SERVICE_URL:-"http://localhost:3004"}
CRYPTO_SERVICE_URL=${CRYPTO_SERVICE_URL:-"http://localhost:3005"}
PAYMENT_SERVICE_URL=${PAYMENT_SERVICE_URL:-"http://localhost:3006"}
ADMIN_SERVICE_URL=${ADMIN_SERVICE_URL:-"http://localhost:3007"}
NOTIFICATION_SERVICE_URL=${NOTIFICATION_SERVICE_URL:-"http://localhost:3008"}

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Function to check if a service is running
check_service() {
    local service_name=$1
    local service_url=$2
    local max_attempts=30
    local attempt=1

    print_status "Checking $service_name at $service_url..."

    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$service_url/health" > /dev/null 2>&1; then
            print_success "$service_name is running"
            return 0
        fi
        
        print_status "Attempt $attempt/$max_attempts: $service_name not ready, waiting..."
        sleep 2
        ((attempt++))
    done

    print_error "$service_name is not responding after $max_attempts attempts"
    return 1
}

# Function to wait for all services
wait_for_services() {
    print_header "CHECKING SERVICE AVAILABILITY"
    
    local services=(
        "API Gateway:$API_GATEWAY_URL"
        "User Service:$USER_SERVICE_URL"
        "Asset Service:$ASSET_SERVICE_URL"
        "Currency Service:$CURRENCY_SERVICE_URL"
        "Crypto Service:$CRYPTO_SERVICE_URL"
        "Payment Service:$PAYMENT_SERVICE_URL"
        "Admin Service:$ADMIN_SERVICE_URL"
        "Notification Service:$NOTIFICATION_SERVICE_URL"
    )

    local all_ready=true

    for service in "${services[@]}"; do
        IFS=':' read -r name url <<< "$service"
        if ! check_service "$name" "$url"; then
            all_ready=false
        fi
    done

    if [ "$all_ready" = true ]; then
        print_success "All services are ready for testing"
        return 0
    else
        print_error "Some services are not ready. Please start all services before running tests."
        return 1
    fi
}

# Function to setup test environment
setup_test_environment() {
    print_header "SETTING UP TEST ENVIRONMENT"
    
    # Create directories
    mkdir -p "$REPORTS_DIR"
    mkdir -p "$COVERAGE_DIR"
    
    # Set environment variables for testing
    export NODE_ENV=test
    export TEST_BASE_URL="$API_GATEWAY_URL"
    export TEST_USER_SERVICE_URL="$USER_SERVICE_URL"
    export TEST_ASSET_SERVICE_URL="$ASSET_SERVICE_URL"
    export TEST_CURRENCY_SERVICE_URL="$CURRENCY_SERVICE_URL"
    export TEST_CRYPTO_SERVICE_URL="$CRYPTO_SERVICE_URL"
    export TEST_PAYMENT_SERVICE_URL="$PAYMENT_SERVICE_URL"
    export TEST_ADMIN_SERVICE_URL="$ADMIN_SERVICE_URL"
    export TEST_NOTIFICATION_SERVICE_URL="$NOTIFICATION_SERVICE_URL"
    
    # Test configuration
    export UNIT_TEST_TIMEOUT="$UNIT_TEST_TIMEOUT"
    export INTEGRATION_TEST_TIMEOUT="$INTEGRATION_TEST_TIMEOUT"
    export E2E_TEST_TIMEOUT="$E2E_TEST_TIMEOUT"
    export LOAD_TEST_DURATION="$LOAD_TEST_DURATION"
    export LOAD_TEST_USERS="$LOAD_TEST_USERS"
    export LOAD_TEST_BASE_URL="$API_GATEWAY_URL"
    
    print_success "Test environment configured"
}

# Function to run unit tests
run_unit_tests() {
    print_header "RUNNING UNIT TESTS"
    
    cd "$PROJECT_ROOT"
    
    if npm run test:unit -- --coverage --coverageDirectory="$COVERAGE_DIR/unit" --testTimeout=$((UNIT_TEST_TIMEOUT * 1000)); then
        print_success "Unit tests passed"
        return 0
    else
        print_error "Unit tests failed"
        return 1
    fi
}

# Function to run integration tests
run_integration_tests() {
    print_header "RUNNING INTEGRATION TESTS"
    
    cd "$PROJECT_ROOT"
    
    if npm run test:integration -- --coverage --coverageDirectory="$COVERAGE_DIR/integration" --testTimeout=$((INTEGRATION_TEST_TIMEOUT * 1000)); then
        print_success "Integration tests passed"
        return 0
    else
        print_error "Integration tests failed"
        return 1
    fi
}

# Function to run end-to-end tests
run_e2e_tests() {
    print_header "RUNNING END-TO-END TESTS"
    
    cd "$PROJECT_ROOT"
    
    if npm run test:e2e -- --coverage --coverageDirectory="$COVERAGE_DIR/e2e" --testTimeout=$((E2E_TEST_TIMEOUT * 1000)); then
        print_success "End-to-end tests passed"
        return 0
    else
        print_error "End-to-end tests failed"
        return 1
    fi
}

# Function to run security tests
run_security_tests() {
    print_header "RUNNING SECURITY TESTS"
    
    cd "$PROJECT_ROOT"
    
    if ts-node scripts/testing/security-test.ts; then
        print_success "Security tests passed"
        return 0
    else
        print_error "Security tests failed"
        return 1
    fi
}

# Function to run load tests
run_load_tests() {
    print_header "RUNNING LOAD TESTS"
    
    cd "$PROJECT_ROOT"
    
    if ts-node tests/performance/load-test.ts; then
        print_success "Load tests passed"
        return 0
    else
        print_error "Load tests failed"
        return 1
    fi
}

# Function to generate combined coverage report
generate_coverage_report() {
    print_header "GENERATING COVERAGE REPORT"
    
    cd "$PROJECT_ROOT"
    
    # Merge coverage reports
    if command -v nyc > /dev/null; then
        nyc merge "$COVERAGE_DIR" "$COVERAGE_DIR/merged-coverage.json"
        nyc report --reporter=html --reporter=text --reporter=lcov --temp-dir="$COVERAGE_DIR" --report-dir="$REPORTS_DIR/coverage"
        print_success "Combined coverage report generated"
    else
        print_warning "nyc not found, skipping coverage merge"
    fi
}

# Function to generate test report
generate_test_report() {
    print_header "GENERATING TEST REPORT"
    
    local timestamp=$(date '+%Y-%m-%d_%H-%M-%S')
    local report_file="$REPORTS_DIR/test-report-$timestamp.json"
    
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "project": "SwiftPayMe",
  "version": "1.0.0",
  "environment": "test",
  "testSuites": {
    "unit": {
      "status": "$unit_test_status",
      "duration": "$unit_test_duration"
    },
    "integration": {
      "status": "$integration_test_status",
      "duration": "$integration_test_duration"
    },
    "e2e": {
      "status": "$e2e_test_status",
      "duration": "$e2e_test_duration"
    },
    "security": {
      "status": "$security_test_status",
      "duration": "$security_test_duration"
    },
    "load": {
      "status": "$load_test_status",
      "duration": "$load_test_duration"
    }
  },
  "overallStatus": "$overall_status",
  "totalDuration": "$total_duration"
}
EOF
    
    print_success "Test report generated: $report_file"
}

# Function to cleanup test environment
cleanup_test_environment() {
    print_header "CLEANING UP TEST ENVIRONMENT"
    
    # Clean up any test artifacts
    # This could include stopping test databases, cleaning temp files, etc.
    
    print_success "Test environment cleaned up"
}

# Function to display usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --unit-only          Run only unit tests"
    echo "  --integration-only   Run only integration tests"
    echo "  --e2e-only          Run only end-to-end tests"
    echo "  --security-only     Run only security tests"
    echo "  --load-only         Run only load tests"
    echo "  --no-coverage       Skip coverage reporting"
    echo "  --no-services-check Skip service availability check"
    echo "  --help              Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  API_GATEWAY_URL     API Gateway URL (default: http://localhost:3000)"
    echo "  LOAD_TEST_DURATION  Load test duration in seconds (default: 60)"
    echo "  LOAD_TEST_USERS     Number of concurrent users for load test (default: 50)"
}

# Main execution function
main() {
    local run_unit=true
    local run_integration=true
    local run_e2e=true
    local run_security=true
    local run_load=true
    local check_services=true
    local generate_coverage=true
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --unit-only)
                run_integration=false
                run_e2e=false
                run_security=false
                run_load=false
                shift
                ;;
            --integration-only)
                run_unit=false
                run_e2e=false
                run_security=false
                run_load=false
                shift
                ;;
            --e2e-only)
                run_unit=false
                run_integration=false
                run_security=false
                run_load=false
                shift
                ;;
            --security-only)
                run_unit=false
                run_integration=false
                run_e2e=false
                run_load=false
                shift
                ;;
            --load-only)
                run_unit=false
                run_integration=false
                run_e2e=false
                run_security=false
                shift
                ;;
            --no-coverage)
                generate_coverage=false
                shift
                ;;
            --no-services-check)
                check_services=false
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    print_header "SWIFTPAYME COMPREHENSIVE TEST SUITE"
    print_status "Starting comprehensive testing for SwiftPayMe payment system"
    
    local start_time=$(date +%s)
    local overall_status="PASSED"
    
    # Setup test environment
    setup_test_environment
    
    # Check service availability
    if [ "$check_services" = true ]; then
        if ! wait_for_services; then
            print_error "Services are not ready. Exiting."
            exit 1
        fi
    fi
    
    # Run test suites
    local unit_test_status="SKIPPED"
    local integration_test_status="SKIPPED"
    local e2e_test_status="SKIPPED"
    local security_test_status="SKIPPED"
    local load_test_status="SKIPPED"
    
    if [ "$run_unit" = true ]; then
        local unit_start=$(date +%s)
        if run_unit_tests; then
            unit_test_status="PASSED"
        else
            unit_test_status="FAILED"
            overall_status="FAILED"
        fi
        local unit_end=$(date +%s)
        local unit_test_duration=$((unit_end - unit_start))
    fi
    
    if [ "$run_integration" = true ]; then
        local integration_start=$(date +%s)
        if run_integration_tests; then
            integration_test_status="PASSED"
        else
            integration_test_status="FAILED"
            overall_status="FAILED"
        fi
        local integration_end=$(date +%s)
        local integration_test_duration=$((integration_end - integration_start))
    fi
    
    if [ "$run_e2e" = true ]; then
        local e2e_start=$(date +%s)
        if run_e2e_tests; then
            e2e_test_status="PASSED"
        else
            e2e_test_status="FAILED"
            overall_status="FAILED"
        fi
        local e2e_end=$(date +%s)
        local e2e_test_duration=$((e2e_end - e2e_start))
    fi
    
    if [ "$run_security" = true ]; then
        local security_start=$(date +%s)
        if run_security_tests; then
            security_test_status="PASSED"
        else
            security_test_status="FAILED"
            overall_status="FAILED"
        fi
        local security_end=$(date +%s)
        local security_test_duration=$((security_end - security_start))
    fi
    
    if [ "$run_load" = true ]; then
        local load_start=$(date +%s)
        if run_load_tests; then
            load_test_status="PASSED"
        else
            load_test_status="FAILED"
            # Load test failures don't fail the overall suite
            print_warning "Load tests failed but not failing overall suite"
        fi
        local load_end=$(date +%s)
        local load_test_duration=$((load_end - load_start))
    fi
    
    # Generate reports
    if [ "$generate_coverage" = true ]; then
        generate_coverage_report
    fi
    
    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))
    
    generate_test_report
    
    # Print final summary
    print_header "TEST SUITE SUMMARY"
    echo -e "Unit Tests:        ${unit_test_status}"
    echo -e "Integration Tests: ${integration_test_status}"
    echo -e "E2E Tests:         ${e2e_test_status}"
    echo -e "Security Tests:    ${security_test_status}"
    echo -e "Load Tests:        ${load_test_status}"
    echo -e "Overall Status:    ${overall_status}"
    echo -e "Total Duration:    ${total_duration} seconds"
    
    cleanup_test_environment
    
    if [ "$overall_status" = "PASSED" ]; then
        print_success "All tests completed successfully!"
        exit 0
    else
        print_error "Some tests failed. Check the logs for details."
        exit 1
    fi
}

# Run main function with all arguments
main "$@"

