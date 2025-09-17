# Use Node.js 18 Alpine as base image
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S swiftpay -u 1001

# Development stage
FROM base AS development

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Change ownership to non-root user
RUN chown -R swiftpay:nodejs /app
USER swiftpay

# Expose port
EXPOSE 3008

# Start development server
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production dependencies stage
FROM base AS production-deps

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM base AS production

# Set NODE_ENV
ENV NODE_ENV=production

# Copy production dependencies
COPY --from=production-deps /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy package.json for metadata
COPY package.json ./

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads /app/temp && \
    chown -R swiftpay:nodejs /app

# Switch to non-root user
USER swiftpay

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3008/health', (res) => { \
        if (res.statusCode === 200) { \
            process.exit(0); \
        } else { \
            process.exit(1); \
        } \
    }).on('error', () => process.exit(1));"

# Expose port
EXPOSE 3008

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]

# Labels for metadata
LABEL maintainer="SwiftPayMe Team <dev@swiftpayme.com>"
LABEL version="1.0.0"
LABEL description="SwiftPayMe Admin Service - Administrative interface for system management"
LABEL org.opencontainers.image.title="SwiftPayMe Admin Service"
LABEL org.opencontainers.image.description="Administrative interface for SwiftPayMe system management, asset verification, and user administration"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.vendor="SwiftPayMe"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.source="https://github.com/swiftpayme/admin-service"
LABEL org.opencontainers.image.documentation="https://docs.swiftpayme.com/admin-service"

