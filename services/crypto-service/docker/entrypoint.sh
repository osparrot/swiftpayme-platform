#!/bin/bash
set -eo pipefail

# -------- Logging Function --------
log() {
  echo "$(date +'%Y-%m-%d %H:%M:%S') - $*" | tee -a /var/log/crypto-service.log
}

# -------- Configuration Validation --------
validate_env() {
  local required_vars=(
    "BITCOIN_RPC_USER"
    "BITCOIN_RPC_PASSWORD"
    "BITCOIN_WALLET_NAME"
    "BITCOIN_NETWORK"
    "LND_TLS_CERT"
    "LND_ADMIN_MACAROON"
  )
  for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
      log "ERROR: $var must be set"
      exit 1
    fi
  done

  if [[ "$BITCOIN_NETWORK" != "mainnet" && "$BITCOIN_NETWORK" != "testnet" ]]; then
    log "ERROR: BITCOIN_NETWORK must be 'mainnet' or 'testnet'"
    exit 1
  fi
}

validate_dependencies() {
  local deps=("jq" "bitcoind" "bitcoin-cli" "lnd" "lncli")
  for dep in "${deps[@]}"; do
    if ! command -v "$dep" >/dev/null; then
      log "ERROR: $dep required but not found"
      exit 1
    fi
  done
}

# -------- Configuration Setup --------
setup_bitcoin_config() {
  local DATA_DIR=${BITCOIN_DATA_DIR:-/data}
  local CONFIG_FILE="$DATA_DIR/bitcoin.conf"
  local RPC_PORT=${BITCOIN_RPC_PORT:-8332}
  [[ "$BITCOIN_NETWORK" == "testnet" ]] && RPC_PORT=${BITCOIN_RPC_PORT:-18332}

  mkdir -p "$DATA_DIR"
  touch "$CONFIG_FILE"
  chmod 600 "$CONFIG_FILE"

  cat <<EOF > "$CONFIG_FILE"
server=1
rpcuser=${BITCOIN_RPC_USER}
rpcpassword=${BITCOIN_RPC_PASSWORD}
rpcallowip=${BITCOIN_RPC_ALLOW_IP:-127.0.0.1/32}
rpcbind=${BITCOIN_RPC_BIND:-0.0.0.0}
rpcport=${RPC_PORT}
descriptors=1
zmqpubrawblock=tcp://127.0.0.1:28332
zmqpubrawtx=tcp://127.0.0.1:28333

listen=${BITCOIN_LISTEN:-1}
maxconnections=${BITCOIN_MAX_CONNECTIONS:-100}
dnsseed=${BITCOIN_DNS_SEED:-1}
seednode=${BITCOIN_SEED_NODE:-}
txindex=${BITCOIN_TXINDEX:-1}
prune=${BITCOIN_PRUNE:-0}
datadir=$DATA_DIR
${BITCOIN_NETWORK}=1
wallet=${BITCOIN_WALLET_NAME}
walletbroadcast=1
walletrbf=1
EOF

  if [[ -n "$BITCOIN_CONFIG_EXTRA" ]]; then
    echo "$BITCOIN_CONFIG_EXTRA" >> "$CONFIG_FILE"
  fi

  log "Bitcoin configuration file created at $CONFIG_FILE"
}

setup_lnd_config() {
  local LND_DIR=${LND_DATA_DIR:-/lnd}
  local CONFIG_FILE="$LND_DIR/lnd.conf"
  local BITCOIN_RPC_HOST=${BITCOIN_RPC_HOST:-localhost}
  local RPC_PORT=${BITCOIN_RPC_PORT:-8332}
  [[ "$BITCOIN_NETWORK" == "testnet" ]] && RPC_PORT=${BITCOIN_RPC_PORT:-18332}

  mkdir -p "$LND_DIR"
  touch "$CONFIG_FILE"
  chmod 600 "$CONFIG_FILE"

  cat <<EOF > "$CONFIG_FILE"
[Application Options]
listen=0.0.0.0:9735
restlisten=0.0.0.0:8080
tlscertpath=$LND_DIR/tls.cert
tlskeypath=$LND_DIR/tls.key
adminmacaroonpath=$LND_DIR/admin.macaroon
logdir=$LND_DIR/logs
maxpendingchannels=10

[Bitcoin]
bitcoin.active=1
bitcoin.${BITCOIN_NETWORK}=1
bitcoin.node=bitcoind

[Bitcoind]
bitcoind.rpchost=$BITCOIN_RPC_HOST:$RPC_PORT
bitcoind.rpcuser=${BITCOIN_RPC_USER}
bitcoind.rpcpass=${BITCOIN_RPC_PASSWORD}
bitcoind.zmqpubrawblock=tcp://$BITCOIN_RPC_HOST:28332
bitcoind.zmqpubrawtx=tcp://$BITCOIN_RPC_HOST:28333
EOF

  log "LND configuration file created at $CONFIG_FILE"

  # Write TLS cert and macaroon
  echo "${LND_TLS_CERT}" > "$LND_DIR/tls.cert"
  echo "${LND_ADMIN_MACAROON}" > "$LND_DIR/admin.macaroon"
  chmod 600 "$LND_DIR/tls.cert" "$LND_DIR/admin.macaroon"
}

# -------- Node Management --------
start_bitcoin_node() {
  log "Starting bitcoind..."
  bitcoind -conf="$BITCOIN_DATA_DIR/bitcoin.conf" -printtoconsole &
  BITCOIND_PID=$!
}

start_lnd_node() {
  log "Starting LND..."
  lnd --configfile="$LND_DATA_DIR/lnd.conf" &
  LND_PID=$!
}

shutdown_nodes() {
  log "Initiating graceful shutdown..."
  if [[ -n "$LND_PID" ]]; then
    kill "$LND_PID" 2>/dev/null || true
    wait "$LND_PID" 2>/dev/null || true
  fi
  if [[ -n "$BITCOIND_PID" ]]; then
    bitcoin-cli -conf="$BITCOIN_DATA_DIR/bitcoin.conf" stop
    wait "$BITCOIND_PID" || true
  fi
  log "Shutdown complete."
  exit 0
}

# -------- Health Monitoring --------
check_bitcoin_sync_status() {
  local blockchain_info
  blockchain_info=$(bitcoin-cli -conf="$BITCOIN_DATA_DIR/bitcoin.conf" getblockchaininfo 2>/dev/null)
  if [[ -z "$blockchain_info" ]]; then
    return 1
  fi
  local blocks headers
  blocks=$(jq -r '.blocks' <<< "$blockchain_info")
  headers=$(jq -r '.headers' <<< "$blockchain_info")
  if [[ "$blocks" == "$headers" ]]; then
    echo "synced"
    return 0
  else
    echo "syncing $blocks/$headers"
    return 1
  fi
}

check_bitcoin_health() {
  if bitcoin-cli -conf="$BITCOIN_DATA_DIR/bitcoin.conf" ping >/dev/null 2>&1; then
    return 0
  else
    return 1
  fi
}

check_lnd_health() {
  if lncli --network ${BITCOIN_NETWORK} --tlscertpath "$LND_DATA_DIR/tls.cert" --macaroonpath "$LND_DATA_DIR/admin.macaroon" getinfo >/dev/null 2>&1; then
    return 0
  else
    return 1
  fi
}

# -------- Wallet Management --------
manage_bitcoin_wallet() {
  local wallet_name=${BITCOIN_WALLET_NAME}
  local wallet_passphrase=${BITCOIN_WALLET_PASSPHRASE:-}

  if ! bitcoin-cli -conf="$BITCOIN_DATA_DIR/bitcoin.conf" listwallets | jq -e ".[] | select(. == \"$wallet_name\")" >/dev/null; then
    log "Creating Bitcoin wallet: $wallet_name"
    bitcoin-cli -conf="$BITCOIN_DATA_DIR/bitcoin.conf" createwallet "$wallet_name" false true "$wallet_passphrase" false false false
  else
    log "Bitcoin wallet $wallet_name already exists"
  fi

  bitcoin-cli -conf="$BITCOIN_DATA_DIR/bitcoin.conf" loadwallet "$wallet_name" >/dev/null 2>&1 || true

  if [[ -n "$wallet_passphrase" ]]; then
    unlock_bitcoin_wallet
  fi
}

unlock_bitcoin_wallet() {
  local wallet_passphrase=${BITCOIN_WALLET_PASSPHRASE}
  for attempt in {1..3}; do
    if bitcoin-cli -conf="$BITCOIN_DATA_DIR/bitcoin.conf" walletpassphrase "$wallet_passphrase" 600 >/dev/null 2>&1; then
      log "Bitcoin wallet unlocked successfully"
      return 0
    fi
    log "Failed to unlock Bitcoin wallet, attempt $attempt"
    sleep 5
  done
  log "ERROR: Failed to unlock Bitcoin wallet after 3 attempts"
  return 1
}

create_user_wallet() {
  local user_id=$1
  local wallet_name="user_${user_id}"
  local wallet_passphrase=${BITCOIN_WALLET_PASSPHRASE:-}

  if ! bitcoin-cli -conf="$BITCOIN_DATA_DIR/bitcoin.conf" listwallets | jq -e ".[] | select(. == \"$wallet_name\")" >/dev/null; then
    log "Creating user wallet: $wallet_name"
    bitcoin-cli -conf="$BITCOIN_DATA_DIR/bitcoin.conf" createwallet "$wallet_name" false true "$wallet_passphrase" false false false
  else
    log "User wallet $wallet_name already exists"
  fi

  bitcoin-cli -conf="$BITCOIN_DATA_DIR/bitcoin.conf" loadwallet "$wallet_name" >/dev/null 2>&1 || true
  log "User wallet $wallet_name loaded"
}

# -------- Metrics Reporting --------
report_metrics() {
  local sync_status
  sync_status=$(check_bitcoin_sync_status)
  if [[ "$sync_status" == "synced" ]]; then
    echo "bitcoin_node_sync_status 1" | curl -s --data-binary @- http://${METRICS_ENDPOINT:-localhost:9091}/metrics/job/crypto_service
  else
    echo "bitcoin_node_sync_status 0" | curl -s --data-binary @- http://${METRICS_ENDPOINT:-localhost:9091}/metrics/job/crypto_service
    echo "bitcoin_node_blocks $(echo "$sync_status" | cut -d' ' -f2 | cut -d'/' -f1)" | curl -s --data-binary @- http://${METRICS_ENDPOINT:-localhost:9091}/metrics/job/crypto_service
    echo "bitcoin_node_headers $(echo "$sync_status" | cut -d' ' -f2 | cut -d'/' -f2)" | curl -s --data-binary @- http://${METRICS_ENDPOINT:-localhost:9091}/metrics/job/crypto_service
  fi

  if check_bitcoin_health; then
    echo "bitcoin_node_health 1" | curl -s --data-binary @- http://${METRICS_ENDPOINT:-localhost:9091}/metrics/job/crypto_service
  else
    echo "bitcoin_node_health 0" | curl -s --data-binary @- http://${METRICS_ENDPOINT:-localhost:9091}/metrics/job/crypto_service
  fi

  if check_lnd_health; then
    echo "lnd_node_health 1" | curl -s --data-binary @- http://${METRICS_ENDPOINT:-localhost:9091}/metrics/job/crypto_service
  else
    echo "lnd_node_health 0" | curl -s --data-binary @- http://${METRICS_ENDPOINT:-localhost:9091}/metrics/job/crypto_service
  fi
}

# -------- Main Execution --------
main() {
  validate_env
  validate_dependencies
  setup_bitcoin_config
  setup_lnd_config

  while true; do
    start_bitcoin_node

    log "Waiting for bitcoind to initialize..."
    until check_bitcoin_health; do
      sleep 2
    done

    log "bitcoind is running. Waiting for blockchain sync..."
    while ! check_bitcoin_sync_status | grep -q "synced"; do
      log "Syncing blockchain: $(check_bitcoin_sync_status)"
      report_metrics
      sleep 30
    done

    log "Blockchain is synced."
    manage_bitcoin_wallet
    start_lnd_node

    log "Waiting for LND to initialize..."
    until check_lnd_health; do
      sleep 2
    done

    log "LND is running."
    report_metrics

    log "Starting Node.js application..."
    exec "$@" &

    log "Entering health monitoring loop..."
    while check_bitcoin_health && check_lnd_health; do
      report_metrics
      sleep 30
    done

    log "Health check failed, restarting services..."
    shutdown_nodes
    sleep 5
  done
}

# Signal handlers for graceful shutdown
trap shutdown_nodes SIGTERM SIGINT

main "$@"

