#!/bin/bash

# SwiftPayMe SSL/TLS Setup Script
# Automates the process of obtaining and renewing SSL/TLS certificates with Let's Encrypt.

# Configuration
DOMAIN="swiftpayme.com"
EMAIL="your-email@example.com"

# Colors for output
RED=\'\033[0;31m\'
GREEN=\'\033[0;32m\'
YELLOW=\'\033[1;33m\'
NC=\'\033[0m\'

echo -e "${YELLOW}🚀 Starting SSL/TLS setup for $DOMAIN...${NC}"

# Step 1: Install Certbot
echo -e "${YELLOW}🔧 Installing Certbot...${NC}"
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Step 2: Stop the web server
echo -e "${YELLOW}🛑 Stopping Nginx...${NC}"
docker-compose stop nginx

# Step 3: Obtain the SSL/TLS certificates
echo -e "${YELLOW}🔐 Obtaining SSL/TLS certificates...${NC}"
sudo certbot certonly --standalone \
  -d $DOMAIN \
  -d www.$DOMAIN \
  -d app.$DOMAIN \
  -d admin.$DOMAIN \
  -d api.$DOMAIN \
  --email $EMAIL \
  --agree-tos \
  --non-interactive

# Step 4: Verify the certificate files
echo -e "${YELLOW}🔍 Verifying certificate files...${NC}"
ls -l /etc/letsencrypt/live/$DOMAIN/

# Step 5: Test the renewal process
echo -e "${YELLOW}🔄 Testing certificate renewal...${NC}"
sudo certbot renew --dry-run

# Step 6: Restart the web server
echo -e "${YELLOW}🚀 Restarting Nginx...${NC}"
docker-compose start nginx

echo -e "${GREEN}✅ SSL/TLS setup complete!${NC}"

