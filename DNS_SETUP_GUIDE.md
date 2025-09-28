'''# SwiftPayMe DNS Configuration Guide

This guide provides detailed instructions for configuring the DNS records for the **swiftpayme.com** domain and its subdomains. Proper DNS setup is crucial for the accessibility and security of the platform.

## 1. DNS Records Overview

The following table summarizes the DNS records that need to be created for the SwiftPayMe platform:

| Record Type | Hostname             | Value / Target                | TTL      | Purpose                                    |
|-------------|----------------------|-------------------------------|----------|--------------------------------------------|
| **A**       | `swiftpayme.com`     | `[Your Production Server IP]` | 3600     | Main website and marketing pages           |
| **A**       | `app.swiftpayme.com`   | `[Your Production Server IP]` | 3600     | User-facing web application                |
| **A**       | `admin.swiftpayme.com` | `[Your Production Server IP]` | 3600     | Administrative dashboard                   |
| **A**       | `api.swiftpayme.com`   | `[Your Production Server IP]` | 3600     | API gateway and microservices              |
| **CNAME**   | `www.swiftpayme.com`   | `swiftpayme.com`              | 3600     | Redirects `www` to the main domain         |
| **MX**      | `swiftpayme.com`     | `10 mail.swiftpayme.com`      | 3600     | Mail server for email notifications        |
| **TXT**     | `swiftpayme.com`     | `"v=spf1 mx ~all"`            | 3600     | Sender Policy Framework (SPF) for email    |
| **TXT**     | `_dmarc.swiftpayme.com`| `"v=DMARC1; p=none"`          | 3600     | Domain-based Message Authentication (DMARC) |

**Note:** Replace `[Your Production Server IP]` with the actual public IP address of your production server.

## 2. Step-by-Step DNS Configuration

These instructions are generic and may vary slightly depending on your DNS provider (e.g., GoDaddy, Namecheap, Cloudflare, AWS Route 53).

### Step 2.1: Log in to Your DNS Provider

1.  Go to your domain registrar


    or DNS hosting provider's website.
2.  Log in to your account.
3.  Navigate to the DNS management section for the `swiftpayme.com` domain.

### Step 2.2: Create A Records

Create the following A records to point your subdomains to your production server:

-   **Record Type:** `A`
-   **Host/Name:** `@` (or `swiftpayme.com`)
-   **Value/Points to:** `[Your Production Server IP]`
-   **TTL:** `1 hour` (or 3600 seconds)

-   **Record Type:** `A`
-   **Host/Name:** `app`
-   **Value/Points to:** `[Your Production Server IP]`
-   **TTL:** `1 hour` (or 3600 seconds)

-   **Record Type:** `A`
-   **Host/Name:** `admin`
-   **Value/Points to:** `[Your Production Server IP]`
-   **TTL:** `1 hour` (or 3600 seconds)

-   **Record Type:** `A`
-   **Host/Name:** `api`
-   **Value/Points to:** `[Your Production Server IP]`
-   **TTL:** `1 hour` (or 3600 seconds)

### Step 2.3: Create CNAME Record

Create a CNAME record to redirect `www` traffic to your main domain:

-   **Record Type:** `CNAME`
-   **Host/Name:** `www`
-   **Value/Points to:** `swiftpayme.com`
-   **TTL:** `1 hour` (or 3600 seconds)

### Step 2.4: Create MX Record

Create an MX record for your mail server:

-   **Record Type:** `MX`
-   **Host/Name:** `@` (or `swiftpayme.com`)
-   **Value/Points to:** `mail.swiftpayme.com`
-   **Priority:** `10`
-   **TTL:** `1 hour` (or 3600 seconds)

### Step 2.5: Create TXT Records for Email Authentication

Create the following TXT records to improve email deliverability and security:

-   **SPF Record:**
    -   **Record Type:** `TXT`
    -   **Host/Name:** `@` (or `swiftpayme.com`)
    -   **Value/Content:** `"v=spf1 mx ~all"`
    -   **TTL:** `1 hour` (or 3600 seconds)

-   **DMARC Record:**
    -   **Record Type:** `TXT`
    -   **Host/Name:** `_dmarc`
    -   **Value/Content:** `"v=DMARC1; p=none"`
    -   **TTL:** `1 hour` (or 3600 seconds)

## 3. Verifying DNS Propagation

After creating the DNS records, it may take some time for them to propagate across the internet. You can use the following tools to check the status of your DNS records:

-   **`dig` command-line tool:**

    ```bash
    dig swiftpayme.com
    dig app.swiftpayme.com
    dig admin.swiftpayme.com
    dig api.swiftpayme.com
    dig www.swiftpayme.com
    dig swiftpayme.com MX
    dig swiftpayme.com TXT
    ```

-   **Online DNS Checkers:**
    -   [Google Public DNS](https://dns.google/)
    -   [DNS Checker](https://dnschecker.org/)
    -   [MXToolbox](https://mxtoolbox.com/)

## 4. DNS Automation Script

To automate the process of checking your DNS records, you can use the following shell script. This script will query the DNS records for your domain and verify that they are configured correctly.

See the `scripts/dns-check.sh` file for the automation script.

