# Multi-stage Dockerfile for Swiftpay Crypto Service
# This service requires Bitcoin Core and Lightning Network (LND) integration

# Stage 1: Bitcoin Core build
FROM ubuntu:22.04 AS bitcoin-builder

# Install dependencies for Bitcoin Core
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

# Download and verify Bitcoin Core
ARG BITCOIN_VERSION=25.0
RUN wget https://bitcoincore.org/bin/bitcoin-core-${BITCOIN_VERSION}/bitcoin-${BITCOIN_VERSION}-x86_64-linux-gnu.tar.gz \
    && wget https://bitcoincore.org/bin/bitcoin-core-${BITCOIN_VERSION}/SHA256SUMS \
    && sha256sum --check --ignore-missing SHA256SUMS \
    && tar -xzf bitcoin-${BITCOIN_VERSION}-x86_64-linux-gnu.tar.gz \
    && mv bitcoin-${BITCOIN_VERSION} /opt/bitcoin

# Stage 2: Lightning Network (LND) build
FROM golang:1.21-alpine AS lnd-builder

# Install dependencies for LND
RUN apk add --no-cache \
    git \
    make \
    gcc \
    musl-dev

# Clone and build LND
ARG LND_VERSION=v0.17.0-beta
RUN git clone --branch ${LND_VERSION} https://github.com/lightningnetwork/lnd.git /go/src/github.com/lightningnetwork/lnd
WORKDIR /go/src/github.com/lightningnetwork/lnd
RUN make install

# Stage 3: Node.js application build
FROM node:18-alpine AS node-builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Stage 4: Final production image
FROM ubuntu:22.04 AS production

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    dumb-init \
    supervisor \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Create application user
RUN groupadd -r swiftpay && useradd -r -g swiftpay swiftpay

# Create directories
RUN mkdir -p /app /data /lnd /var/log /etc/supervisor/conf.d \
    && chown -R swiftpay:swiftpay /app /data /lnd /var/log

# Copy Bitcoin Core binaries
COPY --from=bitcoin-builder /opt/bitcoin/bin/* /usr/local/bin/

# Copy LND binaries
COPY --from=lnd-builder /go/bin/lnd /go/bin/lncli /usr/local/bin/

# Copy Node.js application
COPY --from=node-builder --chown=swiftpay:swiftpay /app/dist /app/dist
COPY --from=node-builder --chown=swiftpay:swiftpay /app/node_modules /app/node_modules
COPY --from=node-builder --chown=swiftpay:swiftpay /app/package.json /app/package.json

# Copy entrypoint script
COPY --chown=swiftpay:swiftpay docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Create supervisor configuration
RUN cat > /etc/supervisor/conf.d/supervisord.conf << 'EOF'
[supervisord]
nodaemon=true
user=root
logfile=/var/log/supervisord.log
pidfile=/var/run/supervisord.pid

[program:bitcoind]
command=/usr/local/bin/bitcoind -conf=/data/bitcoin.conf -printtoconsole
user=swiftpay
autostart=false
autorestart=true
stdout_logfile=/var/log/bitcoind.log
stderr_logfile=/var/log/bitcoind.log
priority=100

[program:lnd]
command=/usr/local/bin/lnd --configfile=/lnd/lnd.conf
user=swiftpay
autostart=false
autorestart=true
stdout_logfile=/var/log/lnd.log
stderr_logfile=/var/log/lnd.log
priority=200

[program:crypto-service]
command=/usr/bin/node /app/dist/index.js
user=swiftpay
directory=/app
autostart=false
autorestart=true
stdout_logfile=/var/log/crypto-service.log
stderr_logfile=/var/log/crypto-service.log
priority=300
environment=NODE_ENV=production,PORT=3008
EOF

# Set working directory
WORKDIR /app

# Environment variables
ENV NODE_ENV=production
ENV PORT=3008
ENV BITCOIN_DATA_DIR=/data
ENV LND_DATA_DIR=/lnd

# Default configuration
ENV BITCOIN_NETWORK=testnet
ENV BITCOIN_RPC_PORT=18332
ENV BITCOIN_RPC_BIND=0.0.0.0
ENV BITCOIN_RPC_ALLOW_IP=0.0.0.0/0
ENV BITCOIN_LISTEN=1
ENV BITCOIN_TXINDEX=1
ENV BITCOIN_PRUNE=0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3008/health || exit 1

# Expose ports
EXPOSE 3008 8332 18332 9735 8080

# Create log file
RUN touch /var/log/crypto-service.log && chown swiftpay:swiftpay /var/log/crypto-service.log

# Switch to application user for security
USER swiftpay

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start with entrypoint script
CMD ["/usr/local/bin/entrypoint.sh", "node", "/app/dist/index.js"]

# Labels for better container management
LABEL maintainer="Swiftpay Team <dev@swiftpay.com>"
LABEL version="1.0.0"
LABEL description="Swiftpay Crypto Service with Bitcoin Core and Lightning Network"
LABEL org.opencontainers.image.source="https://github.com/swiftpay/crypto-service"
LABEL org.opencontainers.image.documentation="https://docs.swiftpay.com/services/crypto"
LABEL org.opencontainers.image.licenses="MIT"

# Security labels
LABEL security.non-root="true"
LABEL security.capabilities="none"
LABEL security.no-new-privileges="true"

