# Use Node.js 18 Alpine as base image for smaller size and better security
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S swiftpay -u 1001

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 3005
USER swiftpay
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build && \
    npm prune --production

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S swiftpay -u 1001

# Copy built application
COPY --from=build --chown=swiftpay:nodejs /app/dist ./dist
COPY --from=build --chown=swiftpay:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=swiftpay:nodejs /app/package.json ./package.json

# Create logs directory
RUN mkdir -p logs && chown swiftpay:nodejs logs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3005/health || exit 1

# Expose port
EXPOSE 3005

# Switch to non-root user
USER swiftpay

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]

# Labels for better container management
LABEL maintainer="Swiftpay Team <dev@swiftpay.com>"
LABEL version="1.0.0"
LABEL description="Swiftpay Currency Conversion Service"
LABEL org.opencontainers.image.source="https://github.com/swiftpay/currency-conversion-service"
LABEL org.opencontainers.image.documentation="https://docs.swiftpay.com/services/currency-conversion"
LABEL org.opencontainers.image.licenses="MIT"

