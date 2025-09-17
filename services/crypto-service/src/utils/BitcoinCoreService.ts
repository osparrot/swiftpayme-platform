import { Logger } from './Logger';
import { InternalServerError, ServiceUnavailableError, NotFoundError, BadRequestError } from './Errors';
import { BitcoinNetwork, BitcoinTransaction, BitcoinAddressInfo, BitcoinWalletInfo, BitcoinBlockInfo, BitcoinMempoolInfo, BitcoinFeeEstimate, BitcoinRawTransaction, BitcoinUtxo, BitcoinScriptPubKey, BitcoinVin, BitcoinVout, BitcoinRpcError } from '../types';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { Counter, Gauge, Histogram, register } from 'prom-client';
import CircuitBreaker from 'opossum';
import retry from 'async-retry';
import { FluentClient } from '@fluent-org/logger';

// Prometheus Metrics
const rpcCallCounter = new Counter({
  name: 'bitcoin_rpc_calls_total',
  help: 'Total number of Bitcoin Core RPC calls',
  labelNames: ['method', 'status'],
});

const rpcLatencyHistogram = new Histogram({
  name: 'bitcoin_rpc_latency_seconds',
  help: 'Latency of Bitcoin Core RPC calls in seconds',
  labelNames: ['method'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const walletBalanceGauge = new Gauge({
  name: 'bitcoin_wallet_balance_btc',
  help: 'Current balance of the Bitcoin Core wallet in BTC',
  labelNames: ['wallet_name'],
});

const blockHeightGauge = new Gauge({
  name: 'bitcoin_block_height',
  help: 'Current Bitcoin blockchain height',
});

const mempoolSizeGauge = new Gauge({
  name: 'bitcoin_mempool_size_bytes',
  help: 'Current size of the Bitcoin mempool in bytes',
});

const fluentd = new FluentClient('bitcoin-core-service', {
  socket: {
    host: process.env.FLUENTD_HOST || 'localhost',
    port: parseInt(process.env.FLUENTD_PORT || '24224'),
  },
});

export class BitcoinCoreService {
  private readonly logger = new Logger('BitcoinCoreService');
  private readonly client: AxiosInstance;
  private readonly RPC_USERNAME = process.env.BITCOIN_RPC_USERNAME || 'bitcoin';
  private readonly RPC_PASSWORD = process.env.BITCOIN_RPC_PASSWORD || 'password';
  private readonly RPC_HOST = process.env.BITCOIN_RPC_HOST || 'localhost';
  private readonly RPC_PORT = process.env.BITCOIN_RPC_PORT || '8332';
  private readonly RPC_TIMEOUT = parseInt(process.env.BITCOIN_RPC_TIMEOUT || '10000', 10);
  private readonly RPC_RETRIES = parseInt(process.env.BITCOIN_RPC_RETRIES || '3', 10);
  private readonly RPC_RETRY_DELAY = parseInt(process.env.BITCOIN_RPC_RETRY_DELAY || '1000', 10);

  private readonly circuitBreaker: CircuitBreaker;

  constructor() {
    const rpcUrl = `http://${this.RPC_HOST}:${this.RPC_PORT}`;
    this.client = axios.create({
      baseURL: rpcUrl,
      timeout: this.RPC_TIMEOUT,
      headers: {
        'Content-Type': 'text/plain',
        'Authorization': `Basic ${Buffer.from(`${this.RPC_USERNAME}:${this.RPC_PASSWORD}`).toString('base64')}`,
      },
    });

    this.circuitBreaker = new CircuitBreaker(this.callRpc.bind(this), {
      timeout: this.RPC_TIMEOUT, // If our function takes longer than 10 seconds, trigger a failure
      errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
      resetTimeout: 30000, // After 30 seconds, try again.
      volumeThreshold: 10, // Minimum 10 requests in a rolling window to trip the circuit
    });

    this.circuitBreaker.on('open', () => {
      this.logger.warn('Bitcoin Core RPC circuit breaker opened');
      fluentd.emit('bitcoin.rpc.circuit_breaker_open', { host: this.RPC_HOST, port: this.RPC_PORT });
    });
    this.circuitBreaker.on('halfOpen', () => {
      this.logger.info('Bitcoin Core RPC circuit breaker half-opened');
      fluentd.emit('bitcoin.rpc.circuit_breaker_half_open', { host: this.RPC_HOST, port: this.RPC_PORT });
    });
    this.circuitBreaker.on('close', () => {
      this.logger.info('Bitcoin Core RPC circuit breaker closed');
      fluentd.emit('bitcoin.rpc.circuit_breaker_close', { host: this.RPC_HOST, port: this.RPC_PORT });
    });
    this.circuitBreaker.on('fallback', (err) => {
      this.logger.error('Bitcoin Core RPC circuit breaker fallback executed', { error: err.message });
      fluentd.emit('bitcoin.rpc.circuit_breaker_fallback', { error: err.message });
    });

    this.logger.info('BitcoinCoreService initialized', { host: this.RPC_HOST, port: this.RPC_PORT });
  }

  private async callRpc<T>(method: string, params: any[] = []): Promise<T> {
    const startTime = Date.now();
    try {
      const response = await retry(
        async () => {
          const res = await this.client.post('/', {
            jsonrpc: '1.0',
            id: new Date().getTime(),
            method,
            params,
          });
          if (res.data.error) {
            throw new InternalServerError(`RPC Error: ${res.data.error.message || res.data.error.code}`);
          }
          return res.data.result;
        },
        {
          retries: this.RPC_RETRIES,
          factor: 2,
          minTimeout: this.RPC_RETRY_DELAY,
          maxTimeout: this.RPC_RETRY_DELAY * 4,
          onRetry: (error, attempt) => {
            this.logger.warn(`RPC call retry attempt ${attempt} for method ${method}`, { error: error.message });
            fluentd.emit('bitcoin.rpc.retry', { method, attempt, error: error.message });
          },
        }
      );
      rpcCallCounter.inc({ method, status: 'success' });
      rpcLatencyHistogram.observe({ method }, (Date.now() - startTime) / 1000);
      return response as T;
    } catch (error: any) {
      rpcCallCounter.inc({ method, status: 'failure' });
      rpcLatencyHistogram.observe({ method }, (Date.now() - startTime) / 1000);
      this.logger.error(`Bitcoin RPC call failed for method ${method}`, { error: error.message, params });
      fluentd.emit('bitcoin.rpc.failure', { method, error: error.message, params });

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          throw new ServiceUnavailableError(`Bitcoin Core RPC server is unreachable: ${error.message}`);
        }
        if (error.response) {
          const rpcError: BitcoinRpcError = error.response.data?.error;
          if (rpcError) {
            throw new InternalServerError(`Bitcoin RPC Error (${rpcError.code}): ${rpcError.message}`);
          }
          throw new InternalServerError(`Bitcoin RPC call failed with status ${error.response.status}: ${error.response.statusText}`);
        }
      }
      throw new InternalServerError(`An unexpected error occurred during RPC call: ${error.message}`);
    }
  }

  /**
   * Get information about the Bitcoin Core node.
   * @returns {Promise<any>} Node information.
   */
  public async getBlockchainInfo(): Promise<any> {
    return this.circuitBreaker.fire('getblockchaininfo');
  }

  /**
   * Get the current block count.
   * @returns {Promise<number>} Block count.
   */
  public async getBlockCount(): Promise<number> {
    const info = await this.circuitBreaker.fire('getblockchaininfo');
    blockHeightGauge.set(info.blocks);
    return info.blocks;
  }

  /**
   * Get a block by its hash or height.
   * @param {string} blockHashOrHeight Block hash or height.
   * @returns {Promise<BitcoinBlockInfo>} Block information.
   */
  public async getBlock(blockHashOrHeight: string | number): Promise<BitcoinBlockInfo> {
    let blockHash: string;
    if (typeof blockHashOrHeight === 'number') {
      blockHash = await this.circuitBreaker.fire('getblockhash', [blockHashOrHeight]);
    } else {
      blockHash = blockHashOrHeight;
    }
    return this.circuitBreaker.fire('getblock', [blockHash, 2]); // Verbosity 2 for full transaction details
  }

  /**
   * Get a raw transaction by its ID.
   * @param {string} txid Transaction ID.
   * @returns {Promise<BitcoinRawTransaction>} Raw transaction details.
   */
  public async getRawTransaction(txid: string): Promise<BitcoinRawTransaction> {
    return this.circuitBreaker.fire('getrawtransaction', [txid, true]); // true for verbose output
  }

  /**
   * Decode a raw transaction hex.
   * @param {string} hex Raw transaction hex.
   * @returns {Promise<BitcoinTransaction>} Decoded transaction.
   */
  public async decodeRawTransaction(hex: string): Promise<BitcoinTransaction> {
    return this.circuitBreaker.fire('decoderawtransaction', [hex]);
  }

  /**
   * Send a raw transaction.
   * @param {string} hex Raw transaction hex.
   * @returns {Promise<string>} Transaction ID.
   */
  public async sendRawTransaction(hex: string): Promise<string> {
    try {
      const txid = await this.circuitBreaker.fire('sendrawtransaction', [hex]);
      this.logger.info('Raw transaction sent successfully', { txid });
      fluentd.emit('bitcoin.transaction.sent', { txid });
      return txid;
    } catch (error: any) {
      this.logger.error('Failed to send raw transaction', { error: error.message, hex });
      fluentd.emit('bitcoin.transaction.send_failure', { error: error.message, hex });
      throw error;
    }
  }

  /**
   * Get the current mempool information.
   * @returns {Promise<BitcoinMempoolInfo>} Mempool information.
   */
  public async getMempoolInfo(): Promise<BitcoinMempoolInfo> {
    const info = await this.circuitBreaker.fire('getmempoolinfo');
    mempoolSizeGauge.set(info.bytes);
    return info;
  }

  /**
   * Get the estimated transaction fee.
   * @param {number} blocks Number of blocks for confirmation target.
   * @returns {Promise<BitcoinFeeEstimate>} Fee estimate in BTC/kB.
   */
  public async estimateSmartFee(blocks: number): Promise<BitcoinFeeEstimate> {
    return this.circuitBreaker.fire('estimatesmartfee', [blocks]);
  }

  /**
   * Get new Bitcoin address.
   * @param {string} label Label for the address.
   * @param {string} type Address type (e.g., 'bech32', 'p2sh-segwit', 'legacy').
   * @returns {Promise<string>} New Bitcoin address.
   */
  public async getNewAddress(label: string = '', type: 'bech32' | 'p2sh-segwit' | 'legacy' = 'bech32'): Promise<string> {
    try {
      const address = await this.circuitBreaker.fire('getnewaddress', [label, type]);
      this.logger.info('Generated new Bitcoin address', { address, label, type });
      fluentd.emit('bitcoin.address.new', { address, label, type });
      return address;
    } catch (error: any) {
      this.logger.error('Failed to generate new Bitcoin address', { error: error.message, label, type });
      fluentd.emit('bitcoin.address.new_failure', { error: error.message, label, type });
      throw error;
    }
  }

  /**
   * Get information about a Bitcoin address.
   * @param {string} address Bitcoin address.
   * @returns {Promise<BitcoinAddressInfo>} Address information.
   */
  public async getAddressInfo(address: string): Promise<BitcoinAddressInfo> {
    return this.circuitBreaker.fire('getaddressinfo', [address]);
  }

  /**
   * Get the total balance of the wallet.
   * @param {string} walletName Optional: specific wallet name.
   * @returns {Promise<number>} Wallet balance in BTC.
   */
  public async getWalletBalance(walletName?: string): Promise<number> {
    let balance: number;
    if (walletName) {
      // Load wallet if not loaded, then get balance
      try {
        await this.circuitBreaker.fire('loadwallet', [walletName]);
      } catch (e: any) {
        if (!e.message.includes('Wallet already loaded')) {
          this.logger.warn(`Wallet ${walletName} not loaded, attempting to load.`, { error: e.message });
          // If load fails for other reasons, re-throw
          if (!e.message.includes('Wallet already loaded')) throw e;
        }
      }
      balance = await this.circuitBreaker.fire('getwalletinfo', [walletName]).then((info: BitcoinWalletInfo) => info.balance);
    } else {
      balance = await this.circuitBreaker.fire('getbalance');
    }
    walletBalanceGauge.set({ wallet_name: walletName || 'default' }, balance);
    return balance;
  }

  /**
   * List unspent transaction outputs (UTXOs).
   * @param {number} minConfirmations Minimum confirmations.
   * @param {number} maxConfirmations Maximum confirmations.
   * @param {string[]} addresses Specific addresses to filter by.
   * @returns {Promise<BitcoinUtxo[]>} List of UTXOs.
   */
  public async listUnspent(minConfirmations: number = 1, maxConfirmations: number = 9999999, addresses: string[] = []): Promise<BitcoinUtxo[]> {
    return this.circuitBreaker.fire('listunspent', [minConfirmations, maxConfirmations, addresses]);
  }

  /**
   * Create a raw transaction.
   * @param {BitcoinVin[]} inputs Array of transaction inputs.
   * @param {BitcoinVout[]} outputs Object with outputs (address:amount).
   * @returns {Promise<string>} Raw transaction hex.
   */
  public async createRawTransaction(inputs: BitcoinVin[], outputs: { [address: string]: number }): Promise<string> {
    return this.circuitBreaker.fire('createrawtransaction', [inputs, outputs]);
  }

  /**
   * Sign a raw transaction.
   * @param {string} hex Raw transaction hex.
   * @param {BitcoinUtxo[]} prevTxs Previous transaction outputs (UTXOs) for signing.
   * @param {string[]} privateKeys Private keys to sign with.
   * @returns {Promise<{ hex: string, complete: boolean }>} Signed transaction hex and completion status.
   */
  public async signRawTransactionWithKey(hex: string, prevTxs: BitcoinUtxo[], privateKeys: string[]): Promise<{ hex: string, complete: boolean }> {
    return this.circuitBreaker.fire('signrawtransactionwithkey', [hex, privateKeys, prevTxs]);
  }

  /**
   * Import a private key into the wallet.
   * @param {string} privateKey The private key (WIF or hex).
   * @param {string} label An optional label.
   * @param {boolean} rescan Whether to rescan the blockchain for transactions.
   * @returns {Promise<void>}
   */
  public async importPrivateKey(privateKey: string, label: string = '', rescan: boolean = false): Promise<void> {
    try {
      await this.circuitBreaker.fire('importprivkey', [privateKey, label, rescan]);
      this.logger.info('Private key imported successfully', { label, rescan });
      fluentd.emit('bitcoin.wallet.import_privkey', { label, rescan });
    } catch (error: any) {
      this.logger.error('Failed to import private key', { error: error.message, label });
      fluentd.emit('bitcoin.wallet.import_privkey_failure', { error: error.message, label });
      throw error;
    }
  }

  /**
   * Validate a Bitcoin address.
   * @param {string} address The Bitcoin address.
   * @returns {Promise<any>} Validation result.
   */
  public async validateAddress(address: string): Promise<any> {
    return this.circuitBreaker.fire('validateaddress', [address]);
  }

  /**
   * Get the network information.
   * @returns {Promise<BitcoinNetwork>} Network information.
   */
  public async getNetworkInfo(): Promise<BitcoinNetwork> {
    return this.circuitBreaker.fire('getnetworkinfo');
  }

  /**
   * Health check for Bitcoin Core service.
   * @returns {Promise<{ status: string, details: any }>}
   */
  public async healthCheck(): Promise<{ status: string, details: any }> {
    try {
      const blockchainInfo = await this.getBlockchainInfo();
      const mempoolInfo = await this.getMempoolInfo();
      const networkInfo = await this.getNetworkInfo();

      const isSynced = blockchainInfo.blocks === blockchainInfo.headers && !blockchainInfo.initialblockdownload;
      const status = isSynced ? 'healthy' : 'degraded';

      return {
        status,
        details: {
          blockchain: {
            blocks: blockchainInfo.blocks,
            headers: blockchainInfo.headers,
            initialBlockDownload: blockchainInfo.initialblockdownload,
            chain: blockchainInfo.chain,
            isSynced,
          },
          mempool: {
            size: mempoolInfo.size,
            bytes: mempoolInfo.bytes,
          },
          network: {
            version: networkInfo.version,
            subversion: networkInfo.subversion,
            connections: networkInfo.connections,
          },
          rpcConnection: 'ok',
          circuitBreaker: this.circuitBreaker.isOpen() ? 'open' : 'closed',
        },
      };
    } catch (error: any) {
      this.logger.error('Bitcoin Core health check failed', { error: error.message });
      return {
        status: 'unhealthy',
        details: { error: error.message, rpcConnection: 'failed' },
      };
    }
  }
}

export default new BitcoinCoreService();


