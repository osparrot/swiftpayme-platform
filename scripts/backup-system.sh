#!/bin/bash

# SwiftPayMe Backup Script
# Creates backups of important system files

BACKUP_DIR="/home/ubuntu/swiftpayme-backup-$(date +%Y%m%d-%H%M%S)"
echo "📦 Creating system backup in $BACKUP_DIR"

mkdir -p "$BACKUP_DIR"

# Backup configuration files
echo "📋 Backing up configuration files..."
cp -r /home/ubuntu/swiftpayme/*.yml "$BACKUP_DIR/" 2>/dev/null || true
cp -r /home/ubuntu/swiftpayme/.env* "$BACKUP_DIR/" 2>/dev/null || true
cp -r /home/ubuntu/swiftpayme/package.json "$BACKUP_DIR/" 2>/dev/null || true

# Backup Web UI build
echo "🌐 Backing up Web UI build..."
cp -r /home/ubuntu/swiftpayme/web-ui/dist "$BACKUP_DIR/web-ui-dist" 2>/dev/null || true

# Backup scripts
echo "📜 Backing up scripts..."
cp -r /home/ubuntu/swiftpayme/scripts "$BACKUP_DIR/" 2>/dev/null || true

# Backup documentation
echo "📚 Backing up documentation..."
cp -r /home/ubuntu/swiftpayme/README.md "$BACKUP_DIR/" 2>/dev/null || true
cp -r /home/ubuntu/swiftpayme/LICENSE "$BACKUP_DIR/" 2>/dev/null || true

# Create backup archive
echo "🗜️  Creating backup archive..."
tar -czf "$BACKUP_DIR.tar.gz" -C "$(dirname "$BACKUP_DIR")" "$(basename "$BACKUP_DIR")"
rm -rf "$BACKUP_DIR"

echo "✅ Backup created: $BACKUP_DIR.tar.gz"
echo "📊 Backup size: $(du -h "$BACKUP_DIR.tar.gz" | cut -f1)"
