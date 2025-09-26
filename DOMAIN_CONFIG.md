# SwiftPayMe Domain Configuration

This document outlines the domain configuration for the SwiftPayMe platform deployment.

## Official Domain

**Primary Domain**: `swiftpayme.com`

## Subdomain Structure

The SwiftPayMe platform uses the following subdomain structure for different components:

### Production Subdomains

- **Main Website**: `https://swiftpayme.com`
  - Landing page and marketing content
  - Public information about the platform

- **Web Application**: `https://app.swiftpayme.com`
  - User-facing application
  - Customer dashboard and trading interface
  - Asset deposit and portfolio management

- **Admin Dashboard**: `https://admin.swiftpayme.com`
  - Administrative interface
  - System management and monitoring
  - Asset verification and approval workflows

- **API Gateway**: `https://api.swiftpayme.com`
  - RESTful API endpoints
  - Microservices gateway
  - Third-party integrations

### Development Subdomains

- **Staging Environment**: `https://staging.swiftpayme.com`
  - Pre-production testing
  - Quality assurance environment

- **Development Environment**: `https://dev.swiftpayme.com`
  - Development and testing
  - Feature development environment

## SSL/TLS Configuration

All subdomains should be configured with:
- **SSL/TLS certificates** (Let's Encrypt or commercial)
- **HTTPS redirect** from HTTP
- **HSTS headers** for security
- **Modern TLS protocols** (TLS 1.2+)

## DNS Configuration

### A Records
```
swiftpayme.com          → [Production Server IP]
app.swiftpayme.com      → [Production Server IP]
admin.swiftpayme.com    → [Production Server IP]
api.swiftpayme.com      → [Production Server IP]
staging.swiftpayme.com  → [Staging Server IP]
dev.swiftpayme.com      → [Development Server IP]
```

### CNAME Records
```
www.swiftpayme.com      → swiftpayme.com
```

## Load Balancer Configuration

For production deployment, consider using a load balancer with the following configuration:

### Frontend Applications
- **Port 80/443**: Main website and marketing pages
- **Port 3000**: Web UI application (app.swiftpayme.com)
- **Port 3001**: Admin dashboard (admin.swiftpayme.com)

### Backend Services
- **Port 8080**: API Gateway (api.swiftpayme.com)
- **Internal ports**: Microservices (not exposed publicly)

## Environment Variables

Update the following environment variables for domain-specific configuration:

```bash
# Frontend URLs
REACT_APP_API_URL=https://api.swiftpayme.com
REACT_APP_WS_URL=wss://api.swiftpayme.com/ws
REACT_APP_DOMAIN=swiftpayme.com

# CORS Configuration
CORS_ORIGINS=https://swiftpayme.com,https://app.swiftpayme.com,https://admin.swiftpayme.com

# Email Configuration
FROM_EMAIL=noreply@swiftpayme.com
SUPPORT_EMAIL=support@swiftpayme.com

# Cookie Domain
COOKIE_DOMAIN=.swiftpayme.com
```

## Security Considerations

### Content Security Policy (CSP)
```
Content-Security-Policy: default-src 'self' *.swiftpayme.com; 
                        script-src 'self' 'unsafe-inline' *.swiftpayme.com;
                        style-src 'self' 'unsafe-inline' *.swiftpayme.com;
                        img-src 'self' data: *.swiftpayme.com;
```

### CORS Headers
```
Access-Control-Allow-Origin: https://swiftpayme.com, https://app.swiftpayme.com, https://admin.swiftpayme.com
Access-Control-Allow-Credentials: true
```

## Deployment Checklist

- [ ] Domain purchased and configured
- [ ] DNS records properly set up
- [ ] SSL certificates installed
- [ ] Load balancer configured
- [ ] Environment variables updated
- [ ] CORS settings configured
- [ ] Security headers implemented
- [ ] Monitoring and logging set up
- [ ] Backup and disaster recovery configured

## Contact Information

For domain-related issues or configuration changes:
- **Technical Contact**: tech@swiftpayme.com
- **Administrative Contact**: admin@swiftpayme.com
- **Security Contact**: security@swiftpayme.com
