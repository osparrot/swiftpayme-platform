# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl

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

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S apigateway -u 1001

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
COPY --from=builder /app/dist ./dist

# Create necessary directories
RUN mkdir -p logs && \
    chown -R apigateway:nodejs /app

# Switch to non-root user
USER apigateway

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]

# Metadata
LABEL maintainer="SwiftPayMe Team <team@swiftpayme.com>"
LABEL version="1.0.0"
LABEL description="SwiftPayMe Api Gateway - Part of the SwiftPayMe payment processing system"
LABEL org.opencontainers.image.title="SwiftPayMe Api Gateway"
LABEL org.opencontainers.image.description="Api Gateway for the SwiftPayMe payment processing system"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.vendor="SwiftPayMe"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.source="https://github.com/osparrot/swiftpayme-platform"
LABEL org.opencontainers.image.documentation="https://docs.swiftpayme.com/api-gateway"
