#!/bin/bash

# SwiftPayMe Security Scan Script
# Performs basic security checks on the codebase

echo "🔒 SwiftPayMe Security Scan"
echo "=========================="

# Check for hardcoded secrets
echo "🔍 Scanning for hardcoded secrets..."
if grep -r -i "password.*=" --include="*.ts" --include="*.js" --include="*.jsx" . | grep -v ".env" | grep -v "example"; then
    echo "⚠️  Potential hardcoded passwords found"
else
    echo "✅ No hardcoded passwords detected"
fi

# Check for API keys in code
echo "🔍 Scanning for hardcoded API keys..."
if grep -r -i "api.*key.*=" --include="*.ts" --include="*.js" --include="*.jsx" . | grep -v ".env" | grep -v "example"; then
    echo "⚠️  Potential hardcoded API keys found"
else
    echo "✅ No hardcoded API keys detected"
fi

# Check for TODO/FIXME security items
echo "🔍 Scanning for security TODOs..."
if grep -r -i "TODO.*security\|FIXME.*security" --include="*.ts" --include="*.js" --include="*.jsx" .; then
    echo "⚠️  Security-related TODOs found"
else
    echo "✅ No security TODOs found"
fi

# Check for console.log statements (potential info leakage)
echo "🔍 Scanning for console.log statements..."
console_logs=$(grep -r "console\.log" --include="*.ts" --include="*.js" --include="*.jsx" . | wc -l)
if [ $console_logs -gt 0 ]; then
    echo "⚠️  Found $console_logs console.log statements (potential info leakage)"
else
    echo "✅ No console.log statements found"
fi

# Check for proper error handling
echo "🔍 Checking error handling patterns..."
if grep -r "try.*catch" --include="*.ts" --include="*.js" services/ | wc -l | awk '{print ($1 > 10)}' | grep -q 1; then
    echo "✅ Error handling patterns found"
else
    echo "⚠️  Limited error handling detected"
fi

# Check for input validation
echo "🔍 Checking input validation..."
if grep -r -i "validate\|sanitize" --include="*.ts" --include="*.js" services/ | wc -l | awk '{print ($1 > 5)}' | grep -q 1; then
    echo "✅ Input validation patterns found"
else
    echo "⚠️  Limited input validation detected"
fi

echo "🔒 Security scan completed"
