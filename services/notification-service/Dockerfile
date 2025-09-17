# Multi-stage build for SwiftPayMe Notification Service
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S swiftpay -u 1001

# Set working directory
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates \
    tzdata

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force && \
    rm -rf /tmp/*

# Copy built application from builder stage
COPY --from=builder --chown=swiftpay:nodejs /app/dist ./dist

# Copy additional files
COPY --chown=swiftpay:nodejs src/templates ./src/templates
COPY --chown=swiftpay:nodejs src/assets ./src/assets

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads /app/temp && \
    chown -R swiftpay:nodejs /app/logs /app/uploads /app/temp

# Set environment variables
ENV NODE_ENV=production \
    PORT=3009 \
    SERVICE_VERSION=1.0.0 \
    LOG_LEVEL=info \
    TZ=UTC

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3009/health || exit 1

# Switch to non-root user
USER swiftpay

# Expose port
EXPOSE 3009

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]

# Labels for metadata
LABEL maintainer="SwiftPayMe Team <dev@swiftpayme.com>" \
      version="1.0.0" \
      description="SwiftPayMe Notification Service - Real-time notification system" \
      org.opencontainers.image.title="SwiftPayMe Notification Service" \
      org.opencontainers.image.description="Real-time notification system for user and admin communications" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.vendor="SwiftPayMe" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.source="https://github.com/swiftpayme/notification-service"

