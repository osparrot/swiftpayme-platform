#!/bin/bash

# SwiftPayMe Platform - Enhanced Production Deployment Script
# Includes Bitcoin Core and Lightning Network setup

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.production.yml"
ENV_FILE="$PROJECT_ROOT/.env.production"
BACKUP_DIR="$PROJECT_ROOT/backups"
LOG_FILE="$PROJECT_ROOT/deployment.log"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker is not running. Please start Docker first."
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not available. Please install Docker Compose."
    fi
    
    # Check available disk space (minimum 100GB recommended)
    available_space=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
    required_space=$((100 * 1024 * 1024)) # 100GB in KB
    
    if [ "$available_space" -lt "$required_space" ]; then
        warn "Available disk space is less than 100GB. Bitcoin blockchain requires significant storage."
    fi
    
    # Check available memory (minimum 8GB recommended)
    available_memory=$(free -m | awk 'NR==2{print $7}')
    required_memory=8192 # 8GB in MB
    
    if [ "$available_memory" -lt "$required_memory" ]; then
        warn "Available memory is less than 8GB. Consider upgrading for optimal performance."
    fi
    
    log "Prerequisites check completed."
}

# Setup environment
setup_environment() {
    log "Setting up environment..."
    
    # Create necessary directories
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$PROJECT_ROOT/ssl"
    mkdir -p "$PROJECT_ROOT/docker/bitcoin"
    mkdir -p "$PROJECT_ROOT/docker/lnd"
    mkdir -p "$PROJECT_ROOT/docker/redis"
    mkdir -p "$PROJECT_ROOT/docker/mongodb"
    mkdir -p "$PROJECT_ROOT/docker/prometheus"
    mkdir -p "$PROJECT_ROOT/docker/grafana/dashboards"
    mkdir -p "$PROJECT_ROOT/docker/grafana/datasources"
    mkdir -p "$PROJECT_ROOT/docker/fluentd/conf"
    
    # Check if production environment file exists
    if [ ! -f "$ENV_FILE" ]; then
        if [ -f "$PROJECT_ROOT/.env.production.template" ]; then
            cp "$PROJECT_ROOT/.env.production.template" "$ENV_FILE"
            warn "Created .env.production from template. Please update with your actual values."
        else
            error "Production environment file not found. Please create .env.production"
        fi
    fi
    
    # Generate secure passwords if not set
    if ! grep -q "MONGODB_PASSWORD=" "$ENV_FILE" || grep -q "your-secure-mongodb-password" "$ENV_FILE"; then
        mongodb_password=$(openssl rand -base64 32)
        sed -i "s/your-secure-mongodb-password/$mongodb_password/g" "$ENV_FILE"
        log "Generated secure MongoDB password"
    fi
    
    if ! grep -q "REDIS_PASSWORD=" "$ENV_FILE" || grep -q "your-secure-redis-password" "$ENV_FILE"; then
        redis_password=$(openssl rand -base64 32)
        sed -i "s/your-secure-redis-password/$redis_password/g" "$ENV_FILE"
        log "Generated secure Redis password"
    fi
    
    if ! grep -q "BITCOIN_RPC_PASSWORD=" "$ENV_FILE" || grep -q "your-secure-bitcoin-rpc-password" "$ENV_FILE"; then
        bitcoin_password=$(openssl rand -base64 32)
        sed -i "s/your-secure-bitcoin-rpc-password/$bitcoin_password/g" "$ENV_FILE"
        log "Generated secure Bitcoin RPC password"
    fi
    
    log "Environment setup completed."
}

# Setup Bitcoin Core configuration
setup_bitcoin_core() {
    log "Setting up Bitcoin Core configuration..."
    
    # Copy production Bitcoin configuration
    if [ -f "$PROJECT_ROOT/docker/bitcoin/bitcoin.production.conf" ]; then
        cp "$PROJECT_ROOT/docker/bitcoin/bitcoin.production.conf" "$PROJECT_ROOT/docker/bitcoin/bitcoin.conf"
        log "Bitcoin Core production configuration applied"
    else
        warn "Bitcoin Core production configuration not found, using default"
    fi
    
    # Update Bitcoin RPC credentials in configuration
    bitcoin_rpc_password=$(grep "BITCOIN_RPC_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2)
    if [ -n "$bitcoin_rpc_password" ]; then
        sed -i "s/rpcpassword=.*/rpcpassword=$bitcoin_rpc_password/" "$PROJECT_ROOT/docker/bitcoin/bitcoin.conf"
    fi
    
    log "Bitcoin Core configuration completed."
}

# Setup Lightning Network configuration
setup_lightning_network() {
    log "Setting up Lightning Network configuration..."
    
    # Copy production LND configuration
    if [ -f "$PROJECT_ROOT/docker/lnd/lnd.production.conf" ]; then
        cp "$PROJECT_ROOT/docker/lnd/lnd.production.conf" "$PROJECT_ROOT/docker/lnd/lnd.conf"
        log "Lightning Network production configuration applied"
    else
        warn "Lightning Network production configuration not found, using default"
    fi
    
    # Update Bitcoin RPC credentials in LND configuration
    bitcoin_rpc_password=$(grep "BITCOIN_RPC_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2)
    if [ -n "$bitcoin_rpc_password" ]; then
        sed -i "s/bitcoind.rpcpass=.*/bitcoind.rpcpass=$bitcoin_rpc_password/" "$PROJECT_ROOT/docker/lnd/lnd.conf"
    fi
    
    log "Lightning Network configuration completed."
}

# Setup Redis cluster
setup_redis_cluster() {
    log "Setting up Redis cluster configuration..."
    
    # Update Redis password in configuration
    redis_password=$(grep "REDIS_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2)
    if [ -n "$redis_password" ]; then
        sed -i "s/requirepass changeme/requirepass $redis_password/" "$PROJECT_ROOT/docker/redis/redis-cluster.conf"
    fi
    
    log "Redis cluster configuration completed."
}

# Setup MongoDB replica set
setup_mongodb_replica() {
    log "Setting up MongoDB replica set configuration..."
    
    # Create MongoDB keyfile for replica set authentication
    openssl rand -base64 756 > "$PROJECT_ROOT/docker/mongodb/mongodb-keyfile"
    chmod 400 "$PROJECT_ROOT/docker/mongodb/mongodb-keyfile"
    
    # Create replica set initialization script
    cat > "$PROJECT_ROOT/docker/mongodb/init-replica.js" << 'EOF'
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongodb-primary:27017", priority: 2 },
    { _id: 1, host: "mongodb-secondary:27017", priority: 1 }
  ]
});
EOF
    
    log "MongoDB replica set configuration completed."
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring configuration..."
    
    # Create Prometheus configuration
    cat > "$PROJECT_ROOT/docker/prometheus/prometheus.yml" << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'api-gateway'
    static_configs:
      - targets: ['api-gateway:3000']
    metrics_path: '/metrics'

  - job_name: 'crypto-service'
    static_configs:
      - targets: ['crypto-service:3005']
    metrics_path: '/metrics'

  - job_name: 'bitcoin-core'
    static_configs:
      - targets: ['bitcoin-core:8332']

  - job_name: 'lnd'
    static_configs:
      - targets: ['lnd:8989']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-node-1:6379', 'redis-node-2:6379', 'redis-node-3:6379']

  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb-primary:27017', 'mongodb-secondary:27017']
EOF
    
    # Create Grafana datasource configuration
    cat > "$PROJECT_ROOT/docker/grafana/datasources/prometheus.yml" << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF
    
    log "Monitoring configuration completed."
}

# Build and deploy services
deploy_services() {
    log "Building and deploying services..."
    
    cd "$PROJECT_ROOT"
    
    # Pull latest images
    info "Pulling latest base images..."
    docker-compose -f "$COMPOSE_FILE" pull
    
    # Build custom images
    info "Building custom images..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    
    # Start infrastructure services first
    info "Starting infrastructure services..."
    docker-compose -f "$COMPOSE_FILE" up -d mongodb-primary mongodb-secondary redis-node-1 redis-node-2 redis-node-3
    
    # Wait for databases to be ready
    info "Waiting for databases to be ready..."
    sleep 30
    
    # Initialize MongoDB replica set
    info "Initializing MongoDB replica set..."
    docker-compose -f "$COMPOSE_FILE" exec -T mongodb-primary mongosh --eval "
        rs.initiate({
            _id: 'rs0',
            members: [
                { _id: 0, host: 'mongodb-primary:27017', priority: 2 },
                { _id: 1, host: 'mongodb-secondary:27017', priority: 1 }
            ]
        });
    " || warn "MongoDB replica set may already be initialized"
    
    # Initialize Redis cluster
    info "Initializing Redis cluster..."
    sleep 10
    docker-compose -f "$COMPOSE_FILE" exec -T redis-node-1 redis-cli --cluster create \
        redis-node-1:6379 redis-node-2:6379 redis-node-3:6379 \
        --cluster-replicas 0 --cluster-yes || warn "Redis cluster may already be initialized"
    
    # Start Bitcoin and Lightning services
    info "Starting Bitcoin Core..."
    docker-compose -f "$COMPOSE_FILE" up -d bitcoin-core
    
    # Wait for Bitcoin Core to start
    info "Waiting for Bitcoin Core to start..."
    sleep 60
    
    info "Starting Lightning Network..."
    docker-compose -f "$COMPOSE_FILE" up -d lnd
    
    # Wait for Lightning Network to start
    info "Waiting for Lightning Network to start..."
    sleep 60
    
    # Start application services
    info "Starting application services..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for all services to be ready
    info "Waiting for all services to be ready..."
    sleep 30
    
    log "Services deployment completed."
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Check service health
    info "Checking service health..."
    
    services=(
        "nginx:80"
        "api-gateway:3000"
        "crypto-service:3005"
        "user-service:3002"
        "mongodb-primary:27017"
        "redis-node-1:6379"
        "bitcoin-core:8332"
        "lnd:10009"
    )
    
    for service in "${services[@]}"; do
        service_name=$(echo "$service" | cut -d':' -f1)
        service_port=$(echo "$service" | cut -d':' -f2)
        
        if docker-compose -f "$COMPOSE_FILE" exec -T "$service_name" timeout 5 bash -c "echo > /dev/tcp/localhost/$service_port" 2>/dev/null; then
            info "✓ $service_name is responding on port $service_port"
        else
            warn "✗ $service_name is not responding on port $service_port"
        fi
    done
    
    # Check Bitcoin Core sync status
    info "Checking Bitcoin Core sync status..."
    bitcoin_info=$(docker-compose -f "$COMPOSE_FILE" exec -T bitcoin-core bitcoin-cli -rpcuser=bitcoin -rpcpassword="$(grep BITCOIN_RPC_PASSWORD= "$ENV_FILE" | cut -d'=' -f2)" getblockchaininfo 2>/dev/null || echo "")
    if [ -n "$bitcoin_info" ]; then
        blocks=$(echo "$bitcoin_info" | grep '"blocks"' | cut -d':' -f2 | tr -d ' ,')
        headers=$(echo "$bitcoin_info" | grep '"headers"' | cut -d':' -f2 | tr -d ' ,')
        info "Bitcoin Core: $blocks blocks / $headers headers"
    else
        warn "Could not retrieve Bitcoin Core status"
    fi
    
    # Check Lightning Network status
    info "Checking Lightning Network status..."
    lnd_info=$(docker-compose -f "$COMPOSE_FILE" exec -T lnd lncli getinfo 2>/dev/null || echo "")
    if [ -n "$lnd_info" ]; then
        synced=$(echo "$lnd_info" | grep '"synced_to_chain"' | cut -d':' -f2 | tr -d ' ,')
        info "Lightning Network synced to chain: $synced"
    else
        warn "Could not retrieve Lightning Network status"
    fi
    
    log "Deployment verification completed."
}

# Create backup
create_backup() {
    log "Creating deployment backup..."
    
    backup_timestamp=$(date +"%Y%m%d_%H%M%S")
    backup_file="$BACKUP_DIR/swiftpayme_backup_$backup_timestamp.tar.gz"
    
    # Create backup of configuration files
    tar -czf "$backup_file" \
        -C "$PROJECT_ROOT" \
        .env.production \
        docker-compose.production.yml \
        docker/ \
        nginx/ \
        ssl/ \
        2>/dev/null || warn "Some files may not exist for backup"
    
    log "Backup created: $backup_file"
}

# Setup SSL certificates
setup_ssl() {
    log "Setting up SSL certificates..."
    
    if [ ! -f "$PROJECT_ROOT/ssl/swiftpayme.com.crt" ]; then
        warn "SSL certificates not found. Please obtain SSL certificates and place them in the ssl/ directory."
        warn "Required files:"
        warn "  - ssl/swiftpayme.com.crt"
        warn "  - ssl/swiftpayme.com.key"
        warn "  - ssl/swiftpayme.com.chain.crt"
        
        # Create self-signed certificates for testing (NOT for production)
        info "Creating self-signed certificates for testing..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$PROJECT_ROOT/ssl/swiftpayme.com.key" \
            -out "$PROJECT_ROOT/ssl/swiftpayme.com.crt" \
            -subj "/C=US/ST=State/L=City/O=SwiftPayMe/CN=swiftpayme.com"
        cp "$PROJECT_ROOT/ssl/swiftpayme.com.crt" "$PROJECT_ROOT/ssl/swiftpayme.com.chain.crt"
        warn "Self-signed certificates created. Replace with proper certificates for production."
    else
        log "SSL certificates found."
    fi
}

# Main deployment function
main() {
    log "Starting SwiftPayMe Platform Enhanced Production Deployment"
    log "=================================================="
    
    check_prerequisites
    setup_environment
    setup_ssl
    setup_bitcoin_core
    setup_lightning_network
    setup_redis_cluster
    setup_mongodb_replica
    setup_monitoring
    create_backup
    deploy_services
    verify_deployment
    
    log "=================================================="
    log "SwiftPayMe Platform Enhanced Production Deployment Completed!"
    log ""
    log "Access URLs:"
    log "  - Main Website: https://swiftpayme.com"
    log "  - Web Application: https://app.swiftpayme.com"
    log "  - Admin Dashboard: https://admin.swiftpayme.com"
    log "  - API Gateway: https://api.swiftpayme.com"
    log "  - Grafana Monitoring: https://monitor.swiftpayme.com"
    log ""
    log "Important Notes:"
    log "  - Bitcoin Core is syncing the blockchain (this may take several hours)"
    log "  - Lightning Network will be available after Bitcoin Core sync completes"
    log "  - Monitor the logs: docker-compose -f $COMPOSE_FILE logs -f"
    log "  - Check service status: docker-compose -f $COMPOSE_FILE ps"
    log ""
    log "Next Steps:"
    log "  1. Update DNS records to point to this server"
    log "  2. Replace self-signed SSL certificates with proper ones"
    log "  3. Configure external services (email, SMS, payment gateways)"
    log "  4. Set up monitoring alerts"
    log "  5. Configure backup schedules"
    log ""
    log "Deployment log saved to: $LOG_FILE"
}

# Run main function
main "$@"
