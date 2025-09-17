# SwiftPayMe Notification Service

The Notification Service provides comprehensive real-time notification capabilities for the SwiftPayMe payment system. It handles multi-channel delivery, template management, user preferences, analytics, and integration with all other microservices to ensure seamless communication with users and administrators.

## Features

### 🔔 Multi-Channel Notification Delivery
- **Email Notifications** with SMTP and transactional email support
- **SMS Notifications** via Twilio and other providers
- **Push Notifications** for mobile and web applications
- **Webhook Notifications** with retry logic and signature verification
- **Real-Time WebSocket** notifications for instant delivery
- **Slack, Discord, Telegram** integrations for team communications
- **WhatsApp Business** API integration for customer communications

### 📧 Advanced Email System
- **MJML Template Support** for responsive email design
- **HTML and Plain Text** rendering with automatic fallbacks
- **Attachment Support** with multiple file formats
- **Email Tracking** with open and click analytics
- **Bounce and Complaint** handling with automatic list management
- **DKIM and SPF** authentication for deliverability
- **A/B Testing** for email campaigns and optimization

### 📱 Push Notification Management
- **Firebase Cloud Messaging (FCM)** for Android and iOS
- **Apple Push Notification Service (APNs)** native support
- **Web Push Notifications** with service worker integration
- **Device Token Management** with automatic cleanup
- **Rich Notifications** with images, actions, and custom data
- **Silent Notifications** for background updates
- **Notification Grouping** and threading support

### 🎨 Template Management System
- **Dynamic Template Engine** with Handlebars support
- **Variable Substitution** with type validation
- **Multi-Language Support** with localization
- **Template Versioning** and rollback capabilities
- **Visual Template Editor** with drag-and-drop interface
- **Template Testing** and preview functionality
- **Conditional Content** based on user attributes

### 👤 User Preference Management
- **Granular Channel Control** (email, SMS, push, etc.)
- **Category-Based Preferences** (security, marketing, transactions)
- **Quiet Hours Configuration** with timezone support
- **Frequency Controls** (immediate, digest, scheduled)
- **Opt-out Management** with compliance tracking
- **Preference Inheritance** from account settings
- **Bulk Preference Updates** for administrative control

### 📊 Analytics & Reporting
- **Real-Time Delivery Metrics** with success/failure rates
- **Channel Performance Analysis** with comparative insights
- **User Engagement Tracking** (opens, clicks, conversions)
- **Template Usage Statistics** with optimization recommendations
- **Delivery Time Analysis** with optimal send time suggestions
- **Geographic Distribution** of notification delivery
- **Custom Report Generation** with scheduled delivery

### 🔄 Queue Management & Processing
- **Bull Queue Integration** with Redis backend
- **Priority-Based Processing** with configurable concurrency
- **Retry Logic** with exponential backoff
- **Dead Letter Queue** handling for failed notifications
- **Rate Limiting** per channel and provider
- **Load Balancing** across multiple workers
- **Queue Monitoring** with real-time dashboards

### 🔐 Security & Compliance
- **JWT Authentication** for API access
- **Webhook Signature Verification** with HMAC
- **Rate Limiting** with Redis-based storage
- **Input Validation** with comprehensive schemas
- **Audit Logging** for all notification activities
- **GDPR Compliance** with data retention policies
- **Encryption** for sensitive notification data

### 🌐 Real-Time Communication
- **Socket.IO Integration** for WebSocket connections
- **Room-Based Broadcasting** for targeted delivery
- **Connection Management** with automatic reconnection
- **Event-Driven Architecture** with custom event handling
- **Presence Detection** for online/offline status
- **Message Acknowledgment** with delivery confirmation
- **Scalable Architecture** with Redis adapter support

### 🔧 Integration & Extensibility
- **RESTful API** with comprehensive documentation
- **Webhook System** for external integrations
- **Plugin Architecture** for custom channel providers
- **Event Bus Integration** with other microservices
- **Health Checks** and monitoring endpoints
- **Metrics Export** for Prometheus and Grafana
- **Configuration Management** with environment-based settings

## Architecture

### Service Design
- **Microservice Architecture** with clear separation of concerns
- **Event-Driven Communication** with other SwiftPayMe services
- **Asynchronous Processing** with queue-based delivery
- **Horizontal Scalability** with stateless design
- **Circuit Breaker Pattern** for external service resilience
- **Bulkhead Pattern** for resource isolation

### Technology Stack
- **Node.js & TypeScript** for robust backend development
- **Express.js** for HTTP server and API routing
- **Socket.IO** for real-time WebSocket communication
- **Bull** for queue management and job processing
- **MongoDB** for persistent data storage
- **Redis** for caching, sessions, and queue backend
- **Handlebars** for template rendering
- **MJML** for responsive email templates

### External Integrations
- **Twilio** for SMS delivery
- **Firebase** for push notifications
- **SendGrid/Mailgun** for email delivery
- **Slack API** for team notifications
- **Discord API** for community notifications
- **Telegram Bot API** for messaging
- **WhatsApp Business API** for customer communications

## API Endpoints

### Notification Management
- `POST /api/notifications/send` - Send single notification
- `POST /api/notifications/bulk` - Send bulk notifications
- `POST /api/notifications/template` - Send template-based notification
- `GET /api/notifications` - List notifications with filtering
- `GET /api/notifications/:id` - Get notification details
- `PUT /api/notifications/:id/acknowledge` - Acknowledge notification
- `DELETE /api/notifications/:id` - Cancel pending notification

### Template Management
- `GET /api/templates` - List notification templates
- `GET /api/templates/:id` - Get template details
- `POST /api/templates` - Create new template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template
- `POST /api/templates/:id/test` - Test template rendering
- `POST /api/templates/:id/preview` - Preview template output

### Channel Management
- `GET /api/channels` - List notification channels
- `GET /api/channels/:id` - Get channel details
- `POST /api/channels` - Create new channel
- `PUT /api/channels/:id` - Update channel configuration
- `DELETE /api/channels/:id` - Delete channel
- `POST /api/channels/:id/test` - Test channel connectivity
- `GET /api/channels/:id/health` - Check channel health

### User Preferences
- `GET /api/preferences/:userId` - Get user notification preferences
- `PUT /api/preferences/:userId` - Update user preferences
- `POST /api/preferences/bulk` - Bulk update preferences
- `GET /api/preferences/:userId/history` - Get preference change history
- `POST /api/preferences/:userId/reset` - Reset to default preferences

### Analytics & Reporting
- `GET /api/analytics/overview` - Get notification analytics overview
- `GET /api/analytics/channels` - Get channel performance metrics
- `GET /api/analytics/templates` - Get template usage statistics
- `GET /api/analytics/users` - Get user engagement metrics
- `POST /api/reports/generate` - Generate custom report
- `GET /api/reports/:id` - Get report details
- `GET /api/reports/:id/download` - Download report file

### Webhook Management
- `GET /api/webhooks` - List configured webhooks
- `POST /api/webhooks` - Create new webhook
- `PUT /api/webhooks/:id` - Update webhook configuration
- `DELETE /api/webhooks/:id` - Delete webhook
- `POST /api/webhooks/:id/test` - Test webhook delivery
- `GET /api/webhooks/:id/deliveries` - Get webhook delivery history

### System Management
- `GET /health` - Service health check
- `GET /ready` - Service readiness check
- `GET /metrics` - Prometheus metrics
- `GET /api/system/status` - Detailed system status
- `GET /api/system/queues` - Queue status and metrics
- `POST /api/system/queues/:name/pause` - Pause queue processing
- `POST /api/system/queues/:name/resume` - Resume queue processing

## Real-Time Events

### WebSocket Events
- `notification` - New notification for user
- `admin-notification` - Administrative notifications
- `channel-notification` - Channel-specific notifications
- `delivery-status` - Notification delivery status updates
- `delivery-failure` - Delivery failure alerts
- `system-alert` - System-wide alerts and warnings
- `queue-status` - Queue processing status updates
- `metrics-update` - Real-time metrics updates

### Event Subscriptions
- `authenticate` - Authenticate WebSocket connection
- `subscribe-channels` - Subscribe to notification channels
- `update-preferences` - Update notification preferences
- `acknowledge-notification` - Acknowledge received notification
- `get-history` - Request notification history
- `get-metrics` - Request real-time metrics

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3009
NODE_ENV=production
SERVICE_VERSION=1.0.0
LOG_LEVEL=info

# Database Configuration
MONGODB_URI=mongodb://admin:password@mongodb:27017/swiftpay_notifications
REDIS_URL=redis://redis:6379

# Authentication
JWT_SECRET=your-super-secure-jwt-secret
JWT_EXPIRES_IN=24h

# External Services
USER_SERVICE_URL=http://user-service:3002
ADMIN_SERVICE_URL=http://admin-service:3008
ASSET_SERVICE_URL=http://asset-service:3005
PAYMENT_SERVICE_URL=http://payment-service:3004
CRYPTO_SERVICE_URL=http://crypto-service:3007
CURRENCY_SERVICE_URL=http://currency-conversion-service:3006

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notifications@swiftpayme.com
SMTP_PASS=your-email-password
EMAIL_FROM=SwiftPayMe <notifications@swiftpayme.com>

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Push Notification Configuration
FCM_SERVER_KEY=your-fcm-server-key
FCM_PROJECT_ID=your-firebase-project-id
APNS_KEY_ID=your-apns-key-id
APNS_TEAM_ID=your-apns-team-id
APNS_BUNDLE_ID=com.swiftpayme.app

# Webhook Configuration
WEBHOOK_SECRET=your-webhook-secret
WEBHOOK_TIMEOUT=30000
WEBHOOK_MAX_RETRIES=3

# Slack Integration
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url

# Discord Integration
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your/webhook

# Telegram Integration
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# WhatsApp Integration
WHATSAPP_API_URL=https://api.whatsapp.com
WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id

# Queue Configuration
QUEUE_CONCURRENCY_EMAIL=5
QUEUE_CONCURRENCY_SMS=3
QUEUE_CONCURRENCY_PUSH=10
QUEUE_CONCURRENCY_WEBHOOK=5

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
RATE_LIMIT_EMAIL_PER_HOUR=1000
RATE_LIMIT_SMS_PER_HOUR=100

# Security
ALLOWED_ORIGINS=http://localhost:3000,https://app.swiftpayme.com
MAX_REQUEST_SIZE=10mb
CORS_CREDENTIALS=true

# Notification Configuration
NOTIFICATION_RETENTION_DAYS=90
MAX_RETRIES=3
BULK_NOTIFICATION_BATCH_SIZE=100
TEMPLATE_CACHE_TTL=3600

# Monitoring
HEALTH_CHECK_INTERVAL=30000
METRICS_COLLECTION_INTERVAL=60000
ALERT_WEBHOOK_URL=https://alerts.swiftpayme.com/webhook

# File Upload
UPLOAD_MAX_SIZE=50mb
UPLOAD_ALLOWED_TYPES=image/*,application/pdf,text/*
UPLOAD_STORAGE_PATH=/app/uploads
```

### Docker Configuration

```yaml
notification-service:
  build: ./services/notification-service
  ports:
    - "3009:3009"
  environment:
    - NODE_ENV=production
    - MONGODB_URI=mongodb://admin:password@mongodb:27017/swiftpay_notifications
    - REDIS_URL=redis://redis:6379
    - JWT_SECRET=${JWT_SECRET}
    - SMTP_HOST=${SMTP_HOST}
    - SMTP_USER=${SMTP_USER}
    - SMTP_PASS=${SMTP_PASS}
    - TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
    - TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
    - FCM_SERVER_KEY=${FCM_SERVER_KEY}
  depends_on:
    - mongodb
    - redis
    - user-service
    - admin-service
  networks:
    - swiftpayme-network
  volumes:
    - notification-logs:/app/logs
    - notification-uploads:/app/uploads
    - notification-templates:/app/templates
  restart: unless-stopped
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3009/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 60s
```

## Development

### Prerequisites
- Node.js 18+ and npm
- MongoDB 5.0+
- Redis 6.0+
- Docker and Docker Compose (for containerized development)

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/swiftpayme/notification-service.git
cd notification-service

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Development Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server
npm test             # Run test suite
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format code with Prettier
npm run docker:build # Build Docker image
npm run docker:run   # Run Docker container
```

## Deployment

### Docker Deployment

```bash
# Build Docker image
docker build -t swiftpayme-notification-service .

# Run container
docker run -d \
  --name notification-service \
  -p 3009:3009 \
  -e MONGODB_URI=mongodb://localhost:27017/swiftpay_notifications \
  -e REDIS_URL=redis://localhost:6379 \
  -e JWT_SECRET=your-secret \
  swiftpayme-notification-service
```

### Production Deployment

```bash
# Using Docker Compose
docker-compose up -d notification-service

# Using Kubernetes
kubectl apply -f k8s/notification-service.yaml

# Health check
curl http://localhost:3009/health
```

## Monitoring & Observability

### Health Checks
- **Liveness probe**: `/health` - Basic service health
- **Readiness probe**: `/ready` - Service readiness for traffic
- **Metrics endpoint**: `/metrics` - Prometheus-compatible metrics

### Logging
- **Structured logging** with Winston
- **Request/response logging** with correlation IDs
- **Error tracking** with stack traces
- **Performance logging** for slow operations
- **Audit logging** for notification activities

### Metrics
- **HTTP request metrics** (count, duration, status codes)
- **Notification metrics** (sent, delivered, failed, pending)
- **Queue metrics** (waiting, active, completed, failed)
- **Channel metrics** (delivery rates, response times)
- **Database metrics** (queries, connections, response time)
- **Cache metrics** (hit rate, memory usage, operations)

### Alerts
- **High failure rates** for notification delivery
- **Queue backlog** exceeding thresholds
- **Service unavailability** for external providers
- **Database connection** issues
- **Memory/CPU usage** exceeding limits
- **Error rate** spikes

## Security Considerations

### Authentication & Authorization
- **JWT token validation** for all API endpoints
- **API key authentication** for webhook endpoints
- **Role-based access control** for administrative functions
- **Rate limiting** to prevent abuse
- **Input validation** to prevent injection attacks

### Data Protection
- **Encryption at rest** for sensitive notification data
- **Encryption in transit** with TLS 1.3
- **PII data handling** with privacy controls
- **Audit trail protection** with tamper detection
- **Secure file uploads** with virus scanning

### Webhook Security
- **HMAC signature verification** for webhook authenticity
- **Timestamp validation** to prevent replay attacks
- **IP whitelisting** for trusted sources
- **Rate limiting** for webhook endpoints
- **Payload size limits** to prevent DoS attacks

## Performance Optimization

### Caching Strategy
- **Template caching** with Redis for faster rendering
- **User preference caching** with TTL-based expiration
- **Channel configuration caching** for quick access
- **Metrics caching** for dashboard performance
- **Database query caching** for frequently accessed data

### Queue Optimization
- **Priority-based processing** for urgent notifications
- **Batch processing** for bulk operations
- **Connection pooling** for external services
- **Retry strategies** with exponential backoff
- **Dead letter queues** for failed message handling

### Database Optimization
- **Indexing strategy** for query performance
- **Connection pooling** for efficient resource usage
- **Read replicas** for analytics queries
- **Data archiving** for old notifications
- **Query optimization** with explain plans

## Troubleshooting

### Common Issues

**Service won't start**
```bash
# Check logs
docker logs notification-service

# Verify environment variables
docker exec notification-service env | grep -E "(MONGODB|REDIS|JWT)"

# Test database connectivity
docker exec notification-service node -e "require('mongoose').connect(process.env.MONGODB_URI)"
```

**Notifications not being delivered**
```bash
# Check queue status
curl http://localhost:3009/api/system/queues

# Check channel health
curl http://localhost:3009/api/channels/email/health

# Check external service connectivity
docker exec notification-service npm run test:connectivity
```

**High memory usage**
```bash
# Check memory metrics
curl http://localhost:3009/metrics

# Monitor queue sizes
curl http://localhost:3009/api/system/status

# Check for memory leaks
docker exec notification-service node --inspect dist/index.js
```

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug

# Start with debugging
npm run dev -- --inspect

# Connect debugger
chrome://inspect
```

## Testing

### Test Types
- **Unit Tests** for individual components
- **Integration Tests** for service interactions
- **End-to-End Tests** for complete workflows
- **Load Tests** for performance validation
- **Security Tests** for vulnerability assessment

### Test Configuration

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --grep "NotificationService"

# Run tests with coverage
npm run test:coverage

# Run load tests
npm run test:load

# Run security tests
npm run test:security
```

## Contributing

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests for new features
- Update documentation for API changes
- Follow semantic versioning for releases
- Use conventional commits for git messages

### Code Quality
- **ESLint** for code linting
- **Prettier** for code formatting
- **Jest** for unit and integration testing
- **Husky** for pre-commit hooks
- **SonarQube** for code quality analysis

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For technical support and questions:
- **Documentation**: https://docs.swiftpayme.com/notification-service
- **Issues**: https://github.com/swiftpayme/notification-service/issues
- **Email**: dev@swiftpayme.com
- **Slack**: #notification-service channel

---

**SwiftPayMe Notification Service** - Comprehensive real-time notification system providing multi-channel delivery, template management, analytics, and seamless integration with the SwiftPayMe payment ecosystem.

