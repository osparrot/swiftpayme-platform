import { createHttpClient } from './HttpClient';
import { Logger } from './Logger';
import { ServiceUnavailableError, BadRequestError, InternalServerError } from './Errors';
import { Counter, Gauge, Histogram } from 'prom-client';
import CircuitBreaker from 'opossum';
import { FluentClient } from '@fluent-org/logger';

interface LightningNodeConfig {
  url: string;
  priority: number;
  timeout: number;
}

interface PayInvoiceResponse {
  payment_hash: string;
  payment_preimage: string;
  status: string;
  amount_msat: number;
}

interface CreateInvoiceResponse {
  payment_request: string;
  payment_hash: string;
}

interface NodeInfo {
  identity_pubkey: string;
  alias: string;
  num_active_channels: number;
  num_peers: number;
  block_height: number;
  synced_to_chain: boolean;
  version: string;
}

interface ChannelBalance {
  balance: string;
  pending_open_balance: string;
}

// Prometheus Metrics
const lightningOperationCounter = new Counter({
  name: 'lightning_operations_total',
  help: 'Total number of Lightning operations',
  labelNames: ['operation', 'status'],
});

const lightningLatencyHistogram = new Histogram({
  name: 'lightning_operation_latency_seconds',
  help: 'Lightning operation latency in seconds',
  labelNames: ['operation', 'node'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const lightningLiquidityGauge = new Gauge({
  name: 'lightning_liquidity_msat',
  help: 'Current Lightning liquidity in millisatoshis',
});

const lightningActiveNodesGauge = new Gauge({
  name: 'lightning_active_nodes',
  help: 'Number of active Lightning nodes',
});

const fluentd = new FluentClient('lightning-client', {
  socket: {
    host: process.env.FLUENTD_HOST || 'localhost',
    port: parseInt(process.env.FLUENTD_PORT || '24224'),
  },
});

export class LightningClient {
  private static instance: LightningClient;
  private nodes: LightningNodeConfig[];
  private activeNodes: LightningNodeConfig[];
  private clients: Map<string, any>;
  private logger = new Logger('LightningClient');
  private currentNodeIndex = 0;
  private healthMonitorInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.nodes = this.loadNodeConfig();
    this.activeNodes = [...this.nodes];
    this.clients = new Map();
    this.initializeClients();
    this.startHealthMonitoring();
    
    this.logger.info('LightningClient initialized', { 
      totalNodes: this.nodes.length,
      activeNodes: this.activeNodes.length 
    });
  }

  public static getInstance(): LightningClient {
    if (!LightningClient.instance) {
      LightningClient.instance = new LightningClient();
    }
    return LightningClient.instance;
  }

  private loadNodeConfig(): LightningNodeConfig[] {
    const nodesConfig = process.env.LIGHTNING_NODES || '[{"url":"http://localhost:8080","priority":1}]';
    const timeout = parseInt(process.env.LIGHTNING_TIMEOUT_MS || '5000', 10);

    try {
      const nodes = JSON.parse(nodesConfig);
      return nodes.map((node: any) => ({
        url: node.url,
        priority: node.priority || 100,
        timeout: node.timeout || timeout,
      }));
    } catch (error: any) {
      this.logger.error('Invalid LIGHTNING_NODES configuration', { error: error.message });
      throw new InternalServerError('Invalid Lightning node configuration');
    }
  }

  private initializeClients(): void {
    this.nodes.forEach(node => {
      const client = createHttpClient(node.url, {
        timeout: node.timeout,
        retries: 3,
        circuitBreaker: {
          threshold: 0.3,
          interval: 60000,
          timeout: node.timeout,
          enabled: true
        },
        headers: {
          'Grpc-Metadata-macaroon': process.env.LND_ADMIN_MACAROON || '',
          'Content-Type': 'application/json'
        }
      });
      this.clients.set(node.url, client);
    });
  }

  private getNextNode(): LightningNodeConfig {
    if (!this.activeNodes.length) {
      lightningOperationCounter.inc({ operation: 'getNextNode', status: 'no_active_nodes' });
      throw new ServiceUnavailableError('No active Lightning nodes');
    }
    
    // Sort by priority and select the best node
    this.activeNodes.sort((a, b) => b.priority - a.priority);
    this.currentNodeIndex = (this.currentNodeIndex + 1) % this.activeNodes.length;
    return this.activeNodes[this.currentNodeIndex];
  }

  private async tryNodes<T>(operation: (client: any) => Promise<T>, operationName: string): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt < this.activeNodes.length; attempt++) {
      const node = this.getNextNode();
      const client = this.clients.get(node.url);
      
      if (!client) {
        continue;
      }

      try {
        const start = Date.now();
        const result = await operation(client);
        const latency = (Date.now() - start) / 1000;
        
        lightningLatencyHistogram.observe({ operation: operationName, node: node.url }, latency);
        lightningOperationCounter.inc({ operation: operationName, status: 'success' });
        
        this.logger.debug(`Lightning operation successful`, { 
          operation: operationName, 
          node: node.url, 
          latency 
        });
        
        return result;
      } catch (error: any) {
        lastError = error;
        this.handleNodeError(node, operationName, error);
        
        if (attempt === this.activeNodes.length - 1) {
          lightningOperationCounter.inc({ operation: operationName, status: 'failure' });
          break;
        }
      }
    }
    
    throw lastError || new ServiceUnavailableError(`All Lightning nodes failed for ${operationName}`);
  }

  private handleNodeError(node: LightningNodeConfig, operation: string, error: any): void {
    this.activeNodes = this.activeNodes.filter(n => n.url !== node.url);
    lightningActiveNodesGauge.set(this.activeNodes.length);
    
    this.logger.warn(`Lightning node marked unhealthy`, { 
      node: node.url, 
      operation, 
      error: error.message 
    });
    
    fluentd.emit('lightning.node.unhealthy', { 
      node: node.url, 
      operation, 
      error: error.message 
    });
    
    // Reactivate node after 60 seconds
    setTimeout(() => this.reactivateNode(node), 60000);
  }

  private reactivateNode(node: LightningNodeConfig): void {
    if (!this.activeNodes.some(n => n.url === node.url)) {
      this.activeNodes.push(node);
      lightningActiveNodesGauge.set(this.activeNodes.length);
      
      this.logger.info(`Lightning node reactivated`, { node: node.url });
      fluentd.emit('lightning.node.reactivated', { node: node.url });
    }
  }

  private startHealthMonitoring(): void {
    this.healthMonitorInterval = setInterval(() => this.checkNodeHealth(), 30000);
  }

  private async checkNodeHealth(): Promise<void> {
    await Promise.all(
      this.nodes.map(async node => {
        const client = this.clients.get(node.url);
        if (!client) return;

        try {
          await client.get('/v1/getinfo');
          this.reactivateNode(node);
          
          fluentd.emit('lightning.node.healthy', { node: node.url });
        } catch (error: any) {
          this.logger.debug(`Lightning node health check failed`, { 
            node: node.url, 
            error: error.message 
          });
          
          fluentd.emit('lightning.node.health_failure', { 
            node: node.url, 
            error: error.message 
          });
        }
      })
    );
  }

  public async payInvoice(userId: string, invoice: string, amount_msat?: number): Promise<PayInvoiceResponse> {
    if (!invoice) {
      throw new BadRequestError('Invoice is required');
    }

    return this.tryNodes(async client => {
      const payload = amount_msat 
        ? { payment_request: invoice, amt_msat: amount_msat } 
        : { payment_request: invoice };
      
      const response = await client.post('/v1/channels/transactions', payload);
      
      if (response.status !== 'SUCCEEDED') {
        throw new ServiceUnavailableError(`Payment failed: ${response.status}`);
      }

      const result: PayInvoiceResponse = {
        payment_hash: response.payment_hash,
        payment_preimage: response.payment_preimage,
        status: response.status,
        amount_msat: response.amount_msat || amount_msat || 0,
      };

      this.logger.info('Lightning payment successful', { 
        userId, 
        payment_hash: result.payment_hash,
        amount_msat: result.amount_msat 
      });
      
      fluentd.emit('lightning.payment.success', { 
        userId, 
        payment_hash: result.payment_hash,
        amount_msat: result.amount_msat 
      });

      return result;
    }, 'payInvoice');
  }

  public async createInvoice(userId: string, amount_msat: number, memo?: string): Promise<CreateInvoiceResponse> {
    if (amount_msat <= 0) {
      throw new BadRequestError('Amount must be positive');
    }

    return this.tryNodes(async client => {
      const response = await client.post('/v1/invoices', {
        value_msat: amount_msat,
        memo: memo || `Swiftpay Crypto Service Invoice for ${userId}`,
      });

      const result: CreateInvoiceResponse = {
        payment_request: response.payment_request,
        payment_hash: response.r_hash,
      };

      this.logger.info('Lightning invoice created', { 
        userId, 
        payment_hash: result.payment_hash,
        amount_msat 
      });
      
      fluentd.emit('lightning.invoice.created', { 
        userId, 
        payment_hash: result.payment_hash,
        amount_msat 
      });

      return result;
    }, 'createInvoice');
  }

  public async getLiquidity(): Promise<number> {
    return this.tryNodes(async client => {
      const response = await client.get('/v1/balance/channels');
      const balance_msat = parseInt(response.balance, 10);
      
      lightningLiquidityGauge.set(balance_msat);
      
      this.logger.debug('Lightning liquidity retrieved', { balance_msat });
      
      return balance_msat;
    }, 'getLiquidity');
  }

  public async getNodeInfo(): Promise<NodeInfo> {
    return this.tryNodes(async client => {
      const response = await client.get('/v1/getinfo');
      
      this.logger.debug('Lightning node info retrieved', { 
        pubkey: response.identity_pubkey,
        alias: response.alias 
      });
      
      return response;
    }, 'getNodeInfo');
  }

  public async getChannelBalance(): Promise<ChannelBalance> {
    return this.tryNodes(async client => {
      const response = await client.get('/v1/balance/channels');
      
      this.logger.debug('Lightning channel balance retrieved', { 
        balance: response.balance 
      });
      
      return response;
    }, 'getChannelBalance');
  }

  public async healthCheck(): Promise<any> {
    const checks = await Promise.all(
      this.nodes.map(async node => {
        const client = this.clients.get(node.url);
        let status = 'unhealthy';
        
        try {
          await client.get('/v1/getinfo');
          status = 'healthy';
        } catch (error) {
          // Node is unhealthy
        }
        
        return {
          node: node.url,
          status,
          priority: node.priority
        };
      })
    );

    const healthyNodes = checks.filter(c => c.status === 'healthy').length;
    const overallStatus = healthyNodes > 0 ? 'healthy' : 'unhealthy';

    return {
      service: 'lightning-client',
      status: overallStatus,
      nodes: checks,
      metrics: {
        activeNodes: this.activeNodes.length,
        totalNodes: this.nodes.length,
        healthyNodes
      },
    };
  }

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down LightningClient');
    
    if (this.healthMonitorInterval) {
      clearInterval(this.healthMonitorInterval);
      this.healthMonitorInterval = null;
    }
    
    // Close all client connections
    this.clients.forEach((client, url) => {
      try {
        if (client.destroy) {
          client.destroy();
        }
      } catch (error: any) {
        this.logger.warn(`Error closing Lightning client connection`, { url, error: error.message });
      }
    });
    
    this.clients.clear();
    this.activeNodes = [];
    lightningActiveNodesGauge.set(0);
    
    fluentd.emit('lightning.client.shutdown', {});
    this.logger.info('LightningClient shutdown complete');
  }
}

export default LightningClient.getInstance();

