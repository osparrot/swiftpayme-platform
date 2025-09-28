# SwiftPayMe SSL/TLS Configuration Guide

This guide provides detailed instructions for setting up SSL/TLS certificates for the **swiftpayme.com** domain and its subdomains. Using HTTPS is essential for securing your platform and protecting user data.

We will use **Let's Encrypt** to obtain free, trusted SSL/TLS certificates and **Certbot** to automate the process of obtaining and renewing them.

## 1. Prerequisites

-   **A Linux server** (Ubuntu 22.04 recommended) with shell access.
-   **A registered domain name** (`swiftpayme.com`) with DNS records pointing to your server's IP address.
-   **Docker and Docker Compose** installed on your server.

## 2. Installing Certbot

We will use the official Certbot Docker image to obtain and renew our certificates. This method is clean, and it avoids installing dependencies on your host system.

1.  **Install Certbot:**

    ```bash
    sudo apt-get update
    sudo apt-get install certbot python3-certbot-nginx
    ```

2.  **Verify the installation:**

    ```bash
    certbot --version
    ```

## 3. Obtaining SSL/TLS Certificates

We will use Certbot's `certonly` command with the `--standalone` authenticator to obtain our certificates. This method will temporarily run a web server on port 80 to verify that you control the domain.

### Step 3.1: Stop Your Web Server

Before running Certbot, you need to stop any web server that is currently running on port 80. If you are using the Docker-based deployment of SwiftPayMe, you can stop the Nginx container:

```bash
docker-compose stop nginx
```

### Step 3.2: Run Certbot to Obtain Certificates

Run the following command to obtain certificates for all your subdomains. Be sure to replace `your-email@example.com` with your actual email address.

```bash
sudo certbot certonly --standalone \
  -d swiftpayme.com \
  -d www.swiftpayme.com \
  -d app.swiftpayme.com \
  -d admin.swiftpayme.com \
  -d api.swiftpayme.com \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive
```

This command will:

-   Obtain a single certificate that is valid for all the specified domains.
-   Save the certificate and key files in `/etc/letsencrypt/live/swiftpayme.com/`.
-   Automatically configure a renewal process.

### Step 3.3: Verify Certificate Files

After the command completes, you can verify that the certificate files have been created:

```bash
ls -l /etc/letsencrypt/live/swiftpayme.com/
```

You should see the following files:

-   `cert.pem`: Your domain's certificate.
-   `chain.pem`: The Let's Encrypt chain certificate.
-   `fullchain.pem`: `cert.pem` and `chain.pem` combined.
-   `privkey.pem`: Your certificate's private key.

## 4. Automating Certificate Renewal

Let's Encrypt certificates are valid for 90 days. Certbot automatically creates a cron job or systemd timer to renew your certificates before they expire.

You can test the renewal process with the following command:

```bash
sudo certbot renew --dry-run
```

This command will simulate the renewal process without actually renewing the certificate. If it completes without errors, your automated renewal is set up correctly.

## 5. Using the Certificates with Nginx

Now that you have your SSL/TLS certificates, you need to configure your Nginx reverse proxy to use them. See the `nginx-reverse-proxy.md` guide for detailed instructions on how to configure Nginx for SSL/TLS.

## 6. SSL/TLS Automation Script

To automate the process of obtaining and renewing your SSL/TLS certificates, you can use the following shell script. This script will stop your web server, obtain the certificates, and then restart your web server.

See the `scripts/ssl-setup.sh` file for the automation script.

