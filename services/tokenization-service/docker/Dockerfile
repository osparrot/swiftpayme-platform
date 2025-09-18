# Multi-stage build for production optimization
FROM node:18-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /usr/src/app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S tokenization -u 1001

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Development stage
FROM base AS development

# Install all dependencies (including dev dependencies)
RUN npm ci --only=development

# Copy source code
COPY src/ ./src/

# Expose port
EXPOSE 3000

# Set user
USER tokenization

# Start development server
CMD ["dumb-init", "npm", "run", "dev"]

# Build stage
FROM base AS build

# Install all dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Production dependencies stage
FROM base AS production-deps

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Install dumb-init
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /usr/src/app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S tokenization -u 1001

# Copy production dependencies
COPY --from=production-deps /usr/src/app/node_modules ./node_modules

# Copy built application
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/package*.json ./

# Create necessary directories
RUN mkdir -p logs uploads temp && \
    chown -R tokenization:nodejs logs uploads temp

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { \
        if (res.statusCode === 200) process.exit(0); else process.exit(1); \
    }).on('error', () => process.exit(1));"

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Expose port
EXPOSE 3000

# Set user
USER tokenization

# Start the application
CMD ["dumb-init", "node", "dist/index.js"]

# Labels for metadata
LABEL maintainer="SwiftPay Team <dev@swiftpay.com>"
LABEL version="1.0.0"
LABEL description="SwiftPay Tokenization Service"
LABEL org.opencontainers.image.title="SwiftPay Tokenization Service"
LABEL org.opencontainers.image.description="Mints and burns asset tokens backed by real-world deposits"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.vendor="SwiftPay"
LABEL org.opencontainers.image.licenses="MIT"

