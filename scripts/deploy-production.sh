#!/bin/bash

# SwiftPayMe Production Deployment Script
# This script automates the deployment of the SwiftPayMe platform to a production environment.

set -e

# Colors for output
RED=\'\033[0;31m\'
GREEN=\'\033[0;32m\'
YELLOW=\'\033[1;33m\'
NC=\'\033[0m\'

echo -e "${YELLOW}🚀 Starting SwiftPayMe Production Deployment...${NC}"

# Step 1: Pull the latest code from GitHub
echo -e "${YELLOW}🔄 Pulling latest code from GitHub...${NC}"
git pull origin main

# Step 2: Install dependencies and build applications
echo -e "${YELLOW}🔧 Installing dependencies and building applications...${NC}"
npm run install:all
npm run build

# Step 3: Set up the environment
echo -e "${YELLOW}⚙️ Setting up the production environment...${NC}"
cp .env.production .env

# Step 4: Run database migrations (if any)
# echo -e "${YELLOW}🗄️ Running database migrations...${NC}"
# npm run migrate

# Step 5: Build and start Docker containers
echo -e "${YELLOW}🐳 Building and starting Docker containers...${NC}"
docker-compose up --build -d

# Step 6: Run health checks
echo -e "${YELLOW}🏥 Running health checks...${NC}"
./scripts/health-check.sh

# Step 7: Run DNS and SSL checks
echo -e "${YELLOW}🔍 Running DNS and SSL checks...${NC}"
./scripts/dns-check.sh

# Step 8: Display deployment summary
echo -e "${GREEN}✅ SwiftPayMe Production Deployment Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo -e "- **Web UI**: https://app.swiftpayme.com"
echo -e "- **Admin UI**: https://admin.swiftpayme.com"
echo -e "- **API Gateway**: https://api.swiftpayme.com"
echo -e "- **Main Website**: https://swiftpayme.com"

