# SwiftPayMe Nginx Reverse Proxy Setup Guide

This guide provides detailed instructions for configuring Nginx as a reverse proxy for the SwiftPayMe platform with SSL/TLS termination and load balancing capabilities.

## 1. Overview

The Nginx reverse proxy configuration provides the following features:

- **SSL/TLS Termination**: Handles HTTPS encryption and decryption
- **Load Balancing**: Distributes traffic across multiple backend services
- **Rate Limiting**: Protects against abuse and DDoS attacks
- **Static Asset Caching**: Improves performance for static resources
- **Security Headers**: Adds security headers to all responses
- **WebSocket Support**: Enables real-time communication features

## 2. Domain Routing Configuration

The Nginx configuration routes traffic to different services based on the subdomain:

| Subdomain | Target Service | Port | Purpose |
|-----------|---------------|------|---------|
| `swiftpayme.com` | Static Files | N/A | Main marketing website |
| `app.swiftpayme.com` | Web UI | 3000 | User-facing application |
| `admin.swiftpayme.com` | Admin UI | 3001 | Administrative dashboard |
| `api.swiftpayme.com` | API Gateway | 8080 | RESTful API and WebSocket endpoints |

## 3. Security Features

The configuration includes several security enhancements:

### SSL/TLS Configuration
- **Modern TLS protocols** (TLS 1.2 and 1.3 only)
- **Strong cipher suites** with perfect forward secrecy
- **HSTS headers** to enforce HTTPS connections
- **SSL session caching** for improved performance

### Security Headers
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-XSS-Protection**: Enables browser XSS protection
- **Strict-Transport-Security**: Enforces HTTPS connections

### Rate Limiting
- **API endpoints**: Limited to 10 requests per second per IP
- **Login endpoints**: Limited to 5 requests per minute per IP
- **Burst handling**: Allows temporary spikes in traffic

## 4. Performance Optimizations

### Gzip Compression
The configuration enables gzip compression for text-based content types including:
- HTML, CSS, and JavaScript files
- JSON and XML responses
- SVG images and fonts

### Static Asset Caching
Static assets are cached with long expiration times:
- **Cache duration**: 1 year for immutable assets
- **Cache headers**: Proper cache-control headers
- **Asset versioning**: Supports cache busting through versioning

### Connection Optimization
- **Keep-alive connections**: Reduces connection overhead
- **TCP optimizations**: Enables TCP_NOPUSH and TCP_NODELAY
- **Worker connections**: Configured for high concurrency

## 5. Deployment Instructions

### Step 5.1: Create Directory Structure

Create the necessary directories for the Nginx configuration:

```bash
mkdir -p /home/ubuntu/swiftpayme/nginx/html
mkdir -p /home/ubuntu/swiftpayme/nginx/logs
```

### Step 5.2: Create Main Website Content

Create a simple landing page for the main domain:

```bash
cat > /home/ubuntu/swiftpayme/nginx/html/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SwiftPayMe - Professional Asset Trading Platform</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; }
        h1 { color: #2c3e50; text-align: center; }
        .cta { text-align: center; margin: 30px 0; }
        .btn { background: #3498db; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to SwiftPayMe</h1>
        <p>Transform your physical assets into digital value with our professional asset deposit and cryptocurrency trading platform.</p>
        <div class="cta">
            <a href="https://app.swiftpayme.com" class="btn">Launch Application</a>
        </div>
    </div>
</body>
</html>
EOF
```

### Step 5.3: Update Docker Compose Configuration

Add the Nginx service to your main `docker-compose.yml` file:

```yaml
  nginx:
    image: nginx:alpine
    container_name: swiftpayme-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - ./nginx/html:/var/www/html:ro
      - ./nginx/logs:/var/log/nginx
    networks:
      - swiftpayme-network
    depends_on:
      - web-ui
      - admin-ui
      - api-gateway
```

### Step 5.4: Deploy the Nginx Configuration

Deploy the Nginx reverse proxy:

```bash
cd /home/ubuntu/swiftpayme
docker-compose up -d nginx
```

### Step 5.5: Verify the Configuration

Test the Nginx configuration:

```bash
docker exec swiftpayme-nginx nginx -t
```

Check the logs for any errors:

```bash
docker logs swiftpayme-nginx
```

## 6. Monitoring and Maintenance

### Log Monitoring
Monitor the Nginx access and error logs:

```bash
# Access logs
tail -f /home/ubuntu/swiftpayme/nginx/logs/access.log

# Error logs
tail -f /home/ubuntu/swiftpayme/nginx/logs/error.log
```

### SSL Certificate Renewal
The SSL certificates will be automatically renewed by Certbot. You can test the renewal process:

```bash
sudo certbot renew --dry-run
```

After certificate renewal, reload the Nginx configuration:

```bash
docker exec swiftpayme-nginx nginx -s reload
```

## 7. Troubleshooting

### Common Issues

**SSL Certificate Not Found**
- Ensure SSL certificates are properly generated using the `ssl-setup.sh` script
- Verify certificate paths in the Nginx configuration
- Check file permissions on certificate files

**502 Bad Gateway Errors**
- Verify that backend services are running and accessible
- Check Docker network connectivity
- Review upstream server configurations

**Rate Limiting Issues**
- Adjust rate limiting zones if legitimate traffic is being blocked
- Monitor rate limiting logs in the error log
- Consider implementing IP whitelisting for trusted sources

### Performance Tuning

**High Traffic Optimization**
- Increase worker connections in the events block
- Adjust rate limiting thresholds based on traffic patterns
- Consider implementing additional caching layers

**SSL Performance**
- Enable SSL session resumption
- Use OCSP stapling for certificate validation
- Consider using hardware acceleration for SSL operations

This configuration provides a robust, secure, and performant reverse proxy setup for the SwiftPayMe platform, ensuring reliable service delivery and protection against common web vulnerabilities.
