# SwiftPayMe Deployment Guide

This guide provides detailed instructions for deploying the SwiftPayMe platform to a production environment. It covers everything from infrastructure setup to application deployment and post-deployment health checks.

## 1. Infrastructure Prerequisites

Before deploying SwiftPayMe, ensure your infrastructure meets the following requirements:

-   **Server**: A Linux server (Ubuntu 22.04 recommended) with at least 4GB of RAM and 2 CPU cores.
-   **Docker**: Docker and Docker Compose installed.
-   **Node.js**: Node.js 18+ and npm installed.
-   **Git**: Git for cloning the repository.
-   **Firewall**: A firewall configured to allow traffic on ports 80, 443, 3000, and 3001.

## 2. Environment Configuration

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/osparrot/swiftpayme-platform.git
    cd swiftpayme-platform
    ```

2.  **Create a production environment file:**

    ```bash
    cp .env.production .env
    ```

3.  **Edit the `.env` file** and provide values for all the variables, especially the following:

    -   `JWT_SECRET`: A long, random string for signing JWTs.
    -   `MONGO_URI`: The connection string for your MongoDB database.
    -   `REDIS_URL`: The URL for your Redis instance.
    -   `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: Your email server details.
    -   `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`: Your Twilio credentials for SMS notifications.

## 3. Building the Applications

1.  **Install all dependencies:**

    ```bash
    npm run install:all
    ```

2.  **Build all applications (services, Web UI, Admin UI):**

    ```bash
    npm run build
    ```

## 4. Deployment

### Option 1: Docker Compose (Recommended)

This is the easiest and most reliable way to deploy SwiftPayMe.

1.  **Build and start all services:**

    ```bash
    docker-compose up --build -d
    ```

2.  **Verify the deployment:**

    ```bash
    docker-compose ps
    ```

    You should see all services running.

### Option 2: Manual Deployment

If you prefer to run the services without Docker, you can do so as follows:

1.  **Start the microservices:**

    You will need to start each microservice in its own terminal session.

    ```bash
    cd services/api-gateway && npm start
    cd services/user-service && npm start
    # ... and so on for all services
    ```

2.  **Start the Web UI:**

    ```bash
    npm run start:web
    ```

3.  **Start the Admin UI:**

    ```bash
    cd admin-ui && npm start
    ```

## 5. Post-Deployment Health Check

After deploying the system, run the health check script to ensure everything is working correctly:

```bash
./scripts/health-check.sh
```

This will check the status of the Web UI, running processes, disk space, and memory usage.

## 6. Security Hardening

-   **Firewall**: Ensure your firewall is properly configured to only allow necessary traffic.
-   **HTTPS**: Set up a reverse proxy (like Nginx or Caddy) to enable HTTPS for all frontend applications.
-   **Environment Variables**: Do not commit your `.env` file to version control. Use a secrets management system to handle production secrets.
-   **Regular Updates**: Keep all dependencies and system packages up to date.

## 7. Backups

Regularly back up your database and important configuration files. You can use the provided backup script as a starting point:

```bash
./scripts/backup-system.sh
```

This will create a `tar.gz` archive of your configuration files, Web UI build, and scripts.

## 8. Monitoring and Logging

-   **Logs**: Use `docker-compose logs -f` to view the logs of all running services.
-   **Monitoring**: The system is configured to expose Prometheus metrics on port 9090. Set up a Prometheus and Grafana stack to monitor the health and performance of the system.

