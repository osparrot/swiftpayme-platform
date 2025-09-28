#!/bin/bash

# SwiftPayMe DNS Check Script
# Verifies that the DNS records for swiftpayme.com are configured correctly.

DOMAIN="swiftpayme.com"
SERVER_IP="[Your Production Server IP]"

# Colors for output
RED=\'\033[0;31m\'
GREEN=\'\033[0;32m\'
YELLOW=\'\033[1;33m\'
NC=\'\033[0m\'

echo -e "${YELLOW}🔍 Verifying DNS records for $DOMAIN...${NC}"

# Function to check A records
check_a_record() {
    local hostname=$1
    local ip=$(dig +short $hostname A)

    if [ "$ip" == "$SERVER_IP" ]; then
        echo -e "${GREEN}✅ A record for $hostname is correct: $ip${NC}"
    else
        echo -e "${RED}❌ A record for $hostname is incorrect. Expected $SERVER_IP, but got $ip${NC}"
    fi
}

# Function to check CNAME record
check_cname_record() {
    local hostname=$1
    local target=$2
    local cname=$(dig +short $hostname CNAME)

    if [ "$cname" == "$target." ]; then
        echo -e "${GREEN}✅ CNAME record for $hostname is correct: $cname${NC}"
    else
        echo -e "${RED}❌ CNAME record for $hostname is incorrect. Expected $target, but got $cname${NC}"
    fi
}

# Function to check MX record
check_mx_record() {
    local domain=$1
    local expected_mx="10 mail.$domain."
    local mx=$(dig +short $domain MX)

    if [ "$mx" == "$expected_mx" ]; then
        echo -e "${GREEN}✅ MX record for $domain is correct: $mx${NC}"
    else
        echo -e "${RED}❌ MX record for $domain is incorrect. Expected $expected_mx, but got $mx${NC}"
    fi
}

# Function to check TXT record
check_txt_record() {
    local domain=$1
    local expected_txt=$2
    local txt=$(dig +short $domain TXT)

    if [[ $txt == *"$expected_txt"* ]]; then
        echo -e "${GREEN}✅ TXT record for $domain contains '$expected_txt'${NC}"
    else
        echo -e "${RED}❌ TXT record for $domain does not contain '$expected_txt'${NC}"
    fi
}

# Check A records
check_a_record $DOMAIN
check_a_record "app.$DOMAIN"
check_a_record "admin.$DOMAIN"
check_a_record "api.$DOMAIN"

# Check CNAME record
check_cname_record "www.$DOMAIN" $DOMAIN

# Check MX record
check_mx_record $DOMAIN

# Check TXT records
check_txt_record $DOMAIN "v=spf1"
check_txt_record "_dmarc.$DOMAIN" "v=DMARC1"

echo -e "${YELLOW}✅ DNS check complete.${NC}"

