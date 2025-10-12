#!/bin/bash

echo "=== SwiftPayMe User Service Validation ==="
echo ""

# Check service structure
echo "1. Service Structure Check:"
echo "✅ Controllers: $(ls services/user-service/src/controllers/*.ts 2>/dev/null | wc -l) files"
echo "✅ Routes: $(ls services/user-service/src/routes/*.ts 2>/dev/null | wc -l) files"
echo "✅ Models: $(ls services/user-service/src/models/*.ts 2>/dev/null | wc -l) files"
echo "✅ Middleware: $(ls services/user-service/src/middleware/*.ts 2>/dev/null | wc -l) files"
echo "✅ Utils: $(ls services/user-service/src/utils/*.ts 2>/dev/null | wc -l) files"
echo "✅ Types: $(ls services/user-service/src/types/*.ts 2>/dev/null | wc -l) files"
echo "✅ Enums: $(ls services/user-service/src/enums/*.ts 2>/dev/null | wc -l) files"
echo ""

# Check consistency with other services
echo "2. Consistency Check with Other Services:"
echo "User Service Port: $(grep -o 'PORT.*3[0-9][0-9][0-9]' services/user-service/src/index.ts | head -1)"
echo "Crypto Service Port: $(grep -o 'PORT.*3[0-9][0-9][0-9]' services/crypto-service/src/index.ts | head -1)"
echo "Asset Service Port: $(grep -o 'PORT.*3[0-9][0-9][0-9]' services/asset-service/src/index.ts | head -1)"
echo ""

# Check package.json consistency
echo "3. Package.json Consistency:"
echo "User Service has package.json: $(test -f services/user-service/package.json && echo "✅ Yes" || echo "❌ No")"
echo "User Service has tsconfig.json: $(test -f services/user-service/tsconfig.json && echo "✅ Yes" || echo "❌ No")"
echo "User Service has Dockerfile: $(test -f services/user-service/Dockerfile && echo "✅ Yes" || echo "❌ No")"
echo ""

# Check import consistency
echo "4. Import Structure Analysis:"
echo "Total imports in index.ts: $(grep -c "^import" services/user-service/src/index.ts)"
echo "Local imports: $(grep -c "from '\\./" services/user-service/src/index.ts)"
echo "External imports: $(grep -c "from '[^\\.]" services/user-service/src/index.ts)"
echo ""

echo "5. Architecture Consistency:"
echo "Express framework: $(grep -c "express" services/user-service/package.json)"
echo "MongoDB integration: $(grep -c "mongoose" services/user-service/package.json)"
echo "Security middleware: $(grep -c "helmet" services/user-service/package.json)"
echo "CORS support: $(grep -c "cors" services/user-service/package.json)"
echo ""

echo "User Service Validation Complete!"
