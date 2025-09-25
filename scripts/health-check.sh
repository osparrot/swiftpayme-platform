#!/bin/bash

# SwiftPayMe Health Check Script
# Verifies system health after deployment

echo "🏥 SwiftPayMe Health Check"
echo "========================="

# Check Web UI
echo "🌐 Checking Web UI..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
    echo "✅ Web UI is healthy (HTTP 200)"
else
    echo "❌ Web UI is not responding"
fi

# Check if processes are running
echo "🔍 Checking running processes..."
if pgrep -f "serve.cjs" > /dev/null; then
    echo "✅ Web UI server is running"
else
    echo "❌ Web UI server is not running"
fi

# Check disk space
echo "💾 Checking disk space..."
disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $disk_usage -lt 80 ]; then
    echo "✅ Disk space is adequate ($disk_usage% used)"
else
    echo "⚠️  Disk space is running low ($disk_usage% used)"
fi

# Check memory usage
echo "🧠 Checking memory usage..."
memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $memory_usage -lt 80 ]; then
    echo "✅ Memory usage is normal ($memory_usage% used)"
else
    echo "⚠️  Memory usage is high ($memory_usage% used)"
fi

# Check log files
echo "📝 Checking log files..."
if [ -f "/home/ubuntu/swiftpayme/web-ui/web-ui.log" ]; then
    log_size=$(du -h /home/ubuntu/swiftpayme/web-ui/web-ui.log | cut -f1)
    echo "✅ Web UI log file exists ($log_size)"
else
    echo "⚠️  Web UI log file not found"
fi

echo "🏥 Health check completed"
