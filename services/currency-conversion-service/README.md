# SwiftPayMe Currency Conversion Service

The Currency Conversion Service is a critical microservice in the SwiftPayMe payment system that provides real-time currency conversion, precious metals pricing, and cryptocurrency rates. It supports the asset valuation system and multi-currency operations throughout the platform.

## Features

### Real-Time Currency Conversion
- **150+ Fiat Currencies**: Support for major and minor global currencies
- **Live Exchange Rates**: Real-time rates from multiple reliable sources
- **Batch Conversions**: Efficient processing of multiple currency conversions
- **Historical Rates**: Access to historical exchange rate data
- **Rate Caching**: Intelligent caching for optimal performance

### Precious Metals Pricing
- **Gold (XAU)**: Real-time gold prices per ounce
- **Silver (XAG)**: Live silver market pricing
- **Platinum (XPT)**: Current platinum rates
- **Palladium (XPD)**: Real-time palladium pricing
- **Multiple Units**: Support for ounce, gram, and kilogram pricing
- **Market Data**: Bid/ask spreads, volume, and market trends

### Cryptocurrency Support
- **Major Cryptocurrencies**: Bitcoin, Ethereum, Litecoin, Bitcoin Cash, XRP
- **Real-Time Prices**: Live cryptocurrency market data
- **Market Metrics**: Market cap, volume, 24h changes
- **Multiple Sources**: Redundant price feeds for reliability

### Advanced Features
- **Circuit Breaker Protection**: Automatic failover for API reliability
- **Multi-Source Aggregation**: Primary and fallback price sources
- **Data Validation**: Comprehensive price data validation
- **Rate Limiting**: API protection and fair usage
- **Comprehensive Monitoring**: Health checks and performance metrics

## API Endpoints

### Currency Conversion
- `POST /api/currency/convert` - Convert between currencies
- `POST /api/currency/convert/batch` - Batch currency conversions
- `GET /api/currency/rates` - Get current exchange rates
- `GET /api/currency/rates/:from/:to` - Get specific currency pair rate
- `GET /api/currency/supported` - List supported currencies

### Precious Metals
- `GET /api/currency/precious-metals` - Get all precious metals prices
- `GET /api/currency/precious-metals/:metal` - Get specific metal price
- `GET /api/currency/precious-metals/:metal/history` - Historical metal prices
- `POST /api/currency/precious-metals/convert` - Convert metal values

### Cryptocurrency
- `GET /api/currency/crypto` - Get all cryptocurrency prices
- `GET /api/currency/crypto/:symbol` - Get specific crypto price
- `GET /api/currency/crypto/:symbol/history` - Historical crypto prices
- `POST /api/currency/crypto/convert` - Convert crypto values

### Historical Data
- `GET /api/currency/historical/:from/:to` - Historical exchange rates
- `GET /api/currency/historical/precious-metals/:metal` - Historical metal prices
- `GET /api/currency/historical/crypto/:symbol` - Historical crypto prices

### Admin & Analytics
- `GET /api/currency/admin/sources` - Price source status
- `GET /api/currency/admin/health` - Detailed health information
- `GET /api/currency/analytics` - Conversion analytics
- `POST /api/currency/admin/refresh` - Force price refresh

## Environment Variables

```env
# Server Configuration
PORT=3006
NODE_ENV=production
HOST=0.0.0.0
SERVICE_VERSION=1.0.0

# Database
MONGODB_URI=mongodb://admin:password@mongodb:27017/swiftpay_currency?authSource=admin
DB_POOL_SIZE=10
DB_TIMEOUT=5000
DB_SOCKET_TIMEOUT=45000

# Redis Cache
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=your-redis-password

# External Services
ASSET_SERVICE_URL=http://asset-service:3005
USER_SERVICE_URL=http://user-service:3002
NOTIFICATION_SERVICE_URL=http://notification-service:3009

# API Keys for Price Feeds
EXCHANGE_RATES_API_KEY=your-exchange-rates-api-key
FIXER_API_KEY=your-fixer-api-key
CURRENCY_LAYER_API_KEY=your-currency-layer-api-key
METALS_API_KEY=your-metals-api-key
PRECIOUS_METALS_API_KEY=your-precious-metals-api-key
COINGECKO_API_KEY=your-coingecko-api-key
COINMARKETCAP_API_KEY=your-coinmarketcap-api-key

# Security
JWT_SECRET=your-super-secret-jwt-key
API_KEY_SECRET=your-api-key-secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false

# Caching
CACHE_TTL_FIAT=900
CACHE_TTL_PRECIOUS_METALS=300
CACHE_TTL_CRYPTO=120

# Circuit Breaker
CIRCUIT_BREAKER_TIMEOUT=15000
CIRCUIT_BREAKER_ERROR_THRESHOLD=50
CIRCUIT_BREAKER_RESET_TIMEOUT=30000

# Update Intervals (in milliseconds)
FIAT_UPDATE_INTERVAL=900000
PRECIOUS_METALS_UPDATE_INTERVAL=300000
CRYPTO_UPDATE_INTERVAL=120000

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3011,http://localhost:8080

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
HEALTH_CHECK_INTERVAL=30000
```

## Data Models

### ExchangeRate
Stores fiat currency exchange rates:
- Currency pair (from/to)
- Exchange rate value
- Source and timestamp
- Bid/ask spreads
- Historical tracking

### PreciousMetalPrice
Tracks precious metals pricing:
- Metal type (gold, silver, platinum, palladium)
- Price per unit (ounce, gram, kilogram)
- Currency denomination
- Market data (bid/ask, volume)
- Source attribution

### CryptocurrencyPrice
Cryptocurrency market data:
- Symbol and name
- Current price in multiple currencies
- Market metrics (cap, volume, changes)
- Historical price tracking
- Source and reliability data

## Price Sources

### Fiat Currency Sources
- **Primary**: ExchangeRatesAPI - Reliable, free tier available
- **Fallback**: Fixer.io - Professional grade exchange rates
- **Fallback**: CurrencyLayer - Real-time and historical rates

### Precious Metals Sources
- **Primary**: Metals-API - Comprehensive precious metals data
- **Fallback**: PreciousMetals-API - Alternative metals pricing

### Cryptocurrency Sources
- **Primary**: CoinGecko - Free, comprehensive crypto data
- **Fallback**: CoinMarketCap - Professional crypto market data

## Integration

The Currency Service integrates with:
- **Asset Service**: For real-time asset valuation and pricing
- **User Service**: For multi-currency account management
- **Payment Service**: For currency conversion in transactions
- **Admin Service**: For pricing analytics and management
- **Notification Service**: For price alerts and updates

## Conversion Workflow

1. **Rate Request**: Service receives conversion request
2. **Cache Check**: Check Redis cache for recent rates
3. **Database Lookup**: Query database for stored rates
4. **External API**: Fetch from external sources if needed
5. **Validation**: Validate rate data for accuracy
6. **Calculation**: Perform conversion calculation
7. **Caching**: Store result in cache for future use
8. **Response**: Return conversion result with metadata

## Circuit Breaker Protection

- **Timeout Protection**: 15-second timeout for external APIs
- **Error Threshold**: 50% error rate triggers circuit breaker
- **Automatic Recovery**: 30-second reset timeout
- **Fallback Sources**: Automatic failover to backup APIs
- **Health Monitoring**: Continuous monitoring of API health

## Caching Strategy

- **Fiat Rates**: 15-minute cache (900 seconds)
- **Precious Metals**: 5-minute cache (300 seconds)
- **Cryptocurrencies**: 2-minute cache (120 seconds)
- **Historical Data**: 1-hour cache for historical queries
- **Redis Clustering**: Support for Redis cluster deployment

## Security Features

- **API Key Management**: Secure storage and rotation of API keys
- **Rate Limiting**: Protection against abuse and overuse
- **Input Validation**: Comprehensive validation of all inputs
- **CORS Configuration**: Proper cross-origin request handling
- **JWT Authentication**: Token-based authentication for admin endpoints
- **Audit Logging**: Complete logging of all conversion requests

## Monitoring & Analytics

- **Conversion Metrics**: Track conversion volume and patterns
- **Source Reliability**: Monitor API source performance
- **Cache Performance**: Cache hit rates and efficiency
- **Error Tracking**: Comprehensive error monitoring
- **Performance Metrics**: Response times and throughput
- **Business Intelligence**: Conversion trends and insights

## Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Lint code
npm run lint
```

## Docker

```bash
# Build image
docker build -t swiftpayme-currency-service .

# Run container
docker run -p 3006:3006 swiftpayme-currency-service
```

## Health Checks

- `GET /health` - Basic health check with component status
- `GET /ready` - Readiness check for Kubernetes deployment
- `GET /metrics` - Prometheus-compatible metrics endpoint

## API Examples

### Convert Currency
```bash
curl -X POST http://localhost:3006/api/currency/convert \
  -H "Content-Type: application/json" \
  -d '{
    "from": "USD",
    "to": "EUR",
    "amount": 100
  }'
```

### Get Precious Metal Price
```bash
curl http://localhost:3006/api/currency/precious-metals/XAU
```

### Batch Conversion
```bash
curl -X POST http://localhost:3006/api/currency/convert/batch \
  -H "Content-Type: application/json" \
  -d '{
    "conversions": [
      {"from": "USD", "to": "EUR", "amount": 100},
      {"from": "GBP", "to": "JPY", "amount": 50}
    ]
  }'
```

## Error Handling

The service provides comprehensive error handling:
- **Validation Errors**: Invalid currency codes or amounts
- **Rate Unavailable**: When exchange rates cannot be fetched
- **Service Unavailable**: When external APIs are down
- **Timeout Errors**: When API calls exceed timeout limits
- **Authentication Errors**: Invalid or missing API keys

## Performance Optimization

- **Connection Pooling**: Efficient database connection management
- **Request Batching**: Batch multiple API requests when possible
- **Intelligent Caching**: Smart cache invalidation and refresh
- **Compression**: Response compression for large datasets
- **CDN Integration**: Static asset delivery optimization

## Compliance & Regulations

- **Financial Data Accuracy**: Ensures accurate financial data handling
- **Data Retention**: Configurable data retention policies
- **Audit Trails**: Complete audit logging for compliance
- **Privacy Protection**: GDPR-compliant data handling
- **Rate Transparency**: Clear source attribution for all rates

