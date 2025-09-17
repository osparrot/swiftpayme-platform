import { Logger } from '../utils/Logger';
import { RedisClient } from '../utils/RedisClient';
import { ServiceClient } from '../utils/ServiceClient';
import { QueueManager } from './QueueManager';
import { NotificationService } from './NotificationService';
import {
  PaymentWorkflow,
  PaymentWorkflowStep,
  PaymentWorkflowStatus,
  AssetDepositWorkflow,
  BitcoinPurchaseWorkflow,
  FiatTransferWorkflow,
  WorkflowContext,
  PaymentEvent,
  PaymentMetrics
} from '../types/payment';
import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';

export class PaymentOrchestrator {
  private logger: Logger;
  private redisClient: RedisClient;
  private serviceClient: ServiceClient;
  private queueManager: QueueManager;
  private notificationService: NotificationService;
  private isInitialized: boolean = false;
  private activeWorkflows: Map<string, PaymentWorkflow> = new Map();

  constructor() {
    this.logger = new Logger('PaymentOrchestrator');
    this.redisClient = RedisClient.getInstance();
    this.serviceClient = new ServiceClient();
    this.queueManager = new QueueManager();
    this.notificationService = new NotificationService();
  }

  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Payment Orchestrator');
      
      // Load active workflows from Redis
      await this.loadActiveWorkflows();
      
      // Set up event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      this.logger.info('Payment Orchestrator initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Payment Orchestrator', { error });
      throw error;
    }
  }

  public async stop(): Promise<void> {
    this.logger.info('Stopping Payment Orchestrator');
    
    // Save active workflows
    await this.saveActiveWorkflows();
    
    this.isInitialized = false;
    this.logger.info('Payment Orchestrator stopped');
  }

  public isInitialized(): boolean {
    return this.isInitialized;
  }

  // Asset Deposit Workflow
  public async initiateAssetDepositWorkflow(
    userId: string,
    assetType: 'gold' | 'silver' | 'diamond',
    assetDetails: any,
    targetCurrency: string = 'USD'
  ): Promise<AssetDepositWorkflow> {
    try {
      const workflowId = uuidv4();
      
      const workflow: AssetDepositWorkflow = {
        id: workflowId,
        type: 'asset_deposit',
        userId,
        status: 'initiated',
        currentStep: 'asset_submission',
        steps: [
          {
            id: 'asset_submission',
            name: 'Asset Submission',
            status: 'in_progress',
            startedAt: new Date(),
            data: { assetType, assetDetails }
          },
          {
            id: 'asset_verification',
            name: 'Asset Verification',
            status: 'pending',
            data: {}
          },
          {
            id: 'asset_valuation',
            name: 'Asset Valuation',
            status: 'pending',
            data: { targetCurrency }
          },
          {
            id: 'fiat_crediting',
            name: 'Fiat Account Crediting',
            status: 'pending',
            data: {}
          }
        ],
        context: {
          userId,
          assetType,
          assetDetails,
          targetCurrency,
          estimatedValue: null,
          finalValue: null,
          assetDepositId: null,
          fiatTransactionId: null
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      };

      // Store workflow
      this.activeWorkflows.set(workflowId, workflow);
      await this.saveWorkflow(workflow);

      // Submit asset to Asset Service
      const assetSubmission = await this.serviceClient.post('/asset-service/api/assets/deposits', {
        userId,
        assetType,
        assetDetails,
        workflowId
      });

      // Update workflow context
      workflow.context.assetDepositId = assetSubmission.data.id;
      await this.updateWorkflow(workflow);

      // Queue for processing
      await this.queueManager.addJob('asset-processing', {
        workflowId,
        assetDepositId: assetSubmission.data.id,
        step: 'asset_verification'
      });

      // Send notification
      await this.notificationService.sendWorkflowNotification(userId, {
        type: 'workflow_initiated',
        workflowId,
        workflowType: 'asset_deposit',
        message: `Asset deposit workflow initiated for ${assetType}`
      });

      this.logger.info('Asset deposit workflow initiated', {
        workflowId,
        userId,
        assetType,
        assetDepositId: assetSubmission.data.id
      });

      return workflow;
    } catch (error) {
      this.logger.error('Failed to initiate asset deposit workflow', { error, userId, assetType });
      throw error;
    }
  }

  // Bitcoin Purchase Workflow
  public async initiateBitcoinPurchaseWorkflow(
    userId: string,
    amount: number,
    currency: string,
    destinationWallet?: string
  ): Promise<BitcoinPurchaseWorkflow> {
    try {
      const workflowId = uuidv4();
      
      const workflow: BitcoinPurchaseWorkflow = {
        id: workflowId,
        type: 'bitcoin_purchase',
        userId,
        status: 'initiated',
        currentStep: 'balance_check',
        steps: [
          {
            id: 'balance_check',
            name: 'Balance Verification',
            status: 'in_progress',
            startedAt: new Date(),
            data: { amount, currency }
          },
          {
            id: 'currency_conversion',
            name: 'Currency Conversion',
            status: 'pending',
            data: {}
          },
          {
            id: 'bitcoin_purchase',
            name: 'Bitcoin Purchase',
            status: 'pending',
            data: {}
          },
          {
            id: 'wallet_crediting',
            name: 'Wallet Crediting',
            status: 'pending',
            data: { destinationWallet }
          }
        ],
        context: {
          userId,
          purchaseAmount: amount,
          purchaseCurrency: currency,
          bitcoinAmount: null,
          exchangeRate: null,
          fiatTransactionId: null,
          bitcoinTransactionId: null,
          destinationWallet
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };

      // Store workflow
      this.activeWorkflows.set(workflowId, workflow);
      await this.saveWorkflow(workflow);

      // Check user balance
      const userBalance = await this.serviceClient.get(`/user-service/api/users/${userId}/balance`);
      
      if (!userBalance.data || userBalance.data[currency] < amount) {
        await this.failWorkflow(workflow, 'insufficient_balance', 'Insufficient balance for Bitcoin purchase');
        throw new Error('Insufficient balance');
      }

      // Get current Bitcoin price
      const bitcoinPrice = await this.serviceClient.get(`/currency-service/api/currency/crypto/BTC`);
      const exchangeRate = bitcoinPrice.data.price;
      const bitcoinAmount = new Decimal(amount).div(exchangeRate).toNumber();

      // Update workflow context
      workflow.context.exchangeRate = exchangeRate;
      workflow.context.bitcoinAmount = bitcoinAmount;
      await this.updateWorkflow(workflow);

      // Move to next step
      await this.completeWorkflowStep(workflow, 'balance_check');
      await this.startWorkflowStep(workflow, 'currency_conversion');

      // Queue for processing
      await this.queueManager.addJob('bitcoin-purchase', {
        workflowId,
        step: 'currency_conversion'
      });

      // Send notification
      await this.notificationService.sendWorkflowNotification(userId, {
        type: 'workflow_initiated',
        workflowId,
        workflowType: 'bitcoin_purchase',
        message: `Bitcoin purchase workflow initiated for ${amount} ${currency}`
      });

      this.logger.info('Bitcoin purchase workflow initiated', {
        workflowId,
        userId,
        amount,
        currency,
        bitcoinAmount,
        exchangeRate
      });

      return workflow;
    } catch (error) {
      this.logger.error('Failed to initiate Bitcoin purchase workflow', { error, userId, amount, currency });
      throw error;
    }
  }

  // Fiat Transfer Workflow
  public async initiateFiatTransferWorkflow(
    fromUserId: string,
    toUserId: string,
    amount: number,
    currency: string,
    memo?: string
  ): Promise<FiatTransferWorkflow> {
    try {
      const workflowId = uuidv4();
      
      const workflow: FiatTransferWorkflow = {
        id: workflowId,
        type: 'fiat_transfer',
        userId: fromUserId,
        status: 'initiated',
        currentStep: 'balance_check',
        steps: [
          {
            id: 'balance_check',
            name: 'Balance Verification',
            status: 'in_progress',
            startedAt: new Date(),
            data: { amount, currency }
          },
          {
            id: 'recipient_verification',
            name: 'Recipient Verification',
            status: 'pending',
            data: { toUserId }
          },
          {
            id: 'transfer_execution',
            name: 'Transfer Execution',
            status: 'pending',
            data: { memo }
          },
          {
            id: 'confirmation',
            name: 'Transfer Confirmation',
            status: 'pending',
            data: {}
          }
        ],
        context: {
          fromUserId,
          toUserId,
          amount,
          currency,
          memo,
          transferTransactionId: null
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };

      // Store workflow
      this.activeWorkflows.set(workflowId, workflow);
      await this.saveWorkflow(workflow);

      // Verify sender balance
      const senderBalance = await this.serviceClient.get(`/user-service/api/users/${fromUserId}/balance`);
      
      if (!senderBalance.data || senderBalance.data[currency] < amount) {
        await this.failWorkflow(workflow, 'insufficient_balance', 'Insufficient balance for transfer');
        throw new Error('Insufficient balance');
      }

      // Verify recipient exists
      const recipient = await this.serviceClient.get(`/user-service/api/users/${toUserId}`);
      
      if (!recipient.data) {
        await this.failWorkflow(workflow, 'invalid_recipient', 'Recipient user not found');
        throw new Error('Invalid recipient');
      }

      // Move to next step
      await this.completeWorkflowStep(workflow, 'balance_check');
      await this.startWorkflowStep(workflow, 'recipient_verification');
      await this.completeWorkflowStep(workflow, 'recipient_verification');
      await this.startWorkflowStep(workflow, 'transfer_execution');

      // Queue for processing
      await this.queueManager.addJob('fiat-transfer', {
        workflowId,
        step: 'transfer_execution'
      });

      // Send notifications
      await this.notificationService.sendWorkflowNotification(fromUserId, {
        type: 'workflow_initiated',
        workflowId,
        workflowType: 'fiat_transfer',
        message: `Fiat transfer initiated to user ${toUserId} for ${amount} ${currency}`
      });

      this.logger.info('Fiat transfer workflow initiated', {
        workflowId,
        fromUserId,
        toUserId,
        amount,
        currency
      });

      return workflow;
    } catch (error) {
      this.logger.error('Failed to initiate fiat transfer workflow', { error, fromUserId, toUserId, amount, currency });
      throw error;
    }
  }

  // Workflow Management
  public async getWorkflow(workflowId: string): Promise<PaymentWorkflow | null> {
    try {
      // Check active workflows first
      if (this.activeWorkflows.has(workflowId)) {
        return this.activeWorkflows.get(workflowId)!;
      }

      // Load from Redis
      const cached = await this.redisClient.get(`workflow:${workflowId}`);
      if (cached) {
        const workflow = JSON.parse(cached);
        this.activeWorkflows.set(workflowId, workflow);
        return workflow;
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to get workflow', { error, workflowId });
      return null;
    }
  }

  public async updateWorkflowStep(
    workflowId: string,
    stepId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
    data?: any,
    error?: string
  ): Promise<void> {
    try {
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const step = workflow.steps.find(s => s.id === stepId);
      if (!step) {
        throw new Error('Workflow step not found');
      }

      step.status = status;
      step.updatedAt = new Date();
      
      if (data) {
        step.data = { ...step.data, ...data };
      }
      
      if (error) {
        step.error = error;
      }

      if (status === 'in_progress' && !step.startedAt) {
        step.startedAt = new Date();
      }
      
      if (status === 'completed' || status === 'failed') {
        step.completedAt = new Date();
      }

      workflow.updatedAt = new Date();
      await this.updateWorkflow(workflow);

      // Emit event
      await this.emitWorkflowEvent(workflow, 'step_updated', { stepId, status, data, error });

      this.logger.info('Workflow step updated', {
        workflowId,
        stepId,
        status,
        data,
        error
      });
    } catch (error) {
      this.logger.error('Failed to update workflow step', { error, workflowId, stepId });
      throw error;
    }
  }

  public async completeWorkflow(workflowId: string, result?: any): Promise<void> {
    try {
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      workflow.status = 'completed';
      workflow.completedAt = new Date();
      workflow.updatedAt = new Date();
      
      if (result) {
        workflow.result = result;
      }

      await this.updateWorkflow(workflow);

      // Remove from active workflows
      this.activeWorkflows.delete(workflowId);

      // Emit event
      await this.emitWorkflowEvent(workflow, 'workflow_completed', { result });

      // Send notification
      await this.notificationService.sendWorkflowNotification(workflow.userId, {
        type: 'workflow_completed',
        workflowId,
        workflowType: workflow.type,
        message: `${workflow.type} workflow completed successfully`,
        result
      });

      this.logger.info('Workflow completed', { workflowId, result });
    } catch (error) {
      this.logger.error('Failed to complete workflow', { error, workflowId });
      throw error;
    }
  }

  public async failWorkflow(workflow: PaymentWorkflow, errorCode: string, errorMessage: string): Promise<void> {
    try {
      workflow.status = 'failed';
      workflow.failedAt = new Date();
      workflow.updatedAt = new Date();
      workflow.error = {
        code: errorCode,
        message: errorMessage
      };

      await this.updateWorkflow(workflow);

      // Remove from active workflows
      this.activeWorkflows.delete(workflow.id);

      // Emit event
      await this.emitWorkflowEvent(workflow, 'workflow_failed', { errorCode, errorMessage });

      // Send notification
      await this.notificationService.sendWorkflowNotification(workflow.userId, {
        type: 'workflow_failed',
        workflowId: workflow.id,
        workflowType: workflow.type,
        message: `${workflow.type} workflow failed: ${errorMessage}`,
        error: { code: errorCode, message: errorMessage }
      });

      this.logger.error('Workflow failed', {
        workflowId: workflow.id,
        errorCode,
        errorMessage
      });
    } catch (error) {
      this.logger.error('Failed to fail workflow', { error, workflowId: workflow.id });
      throw error;
    }
  }

  // Analytics and Metrics
  public async updateAnalytics(): Promise<void> {
    try {
      const metrics = await this.calculatePaymentMetrics();
      
      // Store metrics in Redis
      await this.redisClient.setex(
        'payment:metrics',
        300, // 5 minutes
        JSON.stringify(metrics)
      );

      this.logger.debug('Payment analytics updated', metrics);
    } catch (error) {
      this.logger.error('Failed to update analytics', { error });
    }
  }

  public async getPaymentMetrics(): Promise<PaymentMetrics> {
    try {
      const cached = await this.redisClient.get('payment:metrics');
      if (cached) {
        return JSON.parse(cached);
      }

      // Calculate fresh metrics
      return await this.calculatePaymentMetrics();
    } catch (error) {
      this.logger.error('Failed to get payment metrics', { error });
      return this.getDefaultMetrics();
    }
  }

  // Private helper methods
  private async loadActiveWorkflows(): Promise<void> {
    try {
      const keys = await this.redisClient.keys('workflow:*');
      
      for (const key of keys) {
        const workflowData = await this.redisClient.get(key);
        if (workflowData) {
          const workflow = JSON.parse(workflowData);
          if (workflow.status === 'in_progress' || workflow.status === 'initiated') {
            this.activeWorkflows.set(workflow.id, workflow);
          }
        }
      }

      this.logger.info('Active workflows loaded', { count: this.activeWorkflows.size });
    } catch (error) {
      this.logger.error('Failed to load active workflows', { error });
    }
  }

  private async saveActiveWorkflows(): Promise<void> {
    try {
      for (const [workflowId, workflow] of this.activeWorkflows) {
        await this.saveWorkflow(workflow);
      }

      this.logger.info('Active workflows saved', { count: this.activeWorkflows.size });
    } catch (error) {
      this.logger.error('Failed to save active workflows', { error });
    }
  }

  private async saveWorkflow(workflow: PaymentWorkflow): Promise<void> {
    const cacheKey = `workflow:${workflow.id}`;
    await this.redisClient.setex(cacheKey, 86400, JSON.stringify(workflow)); // 24 hours
  }

  private async updateWorkflow(workflow: PaymentWorkflow): Promise<void> {
    workflow.updatedAt = new Date();
    this.activeWorkflows.set(workflow.id, workflow);
    await this.saveWorkflow(workflow);
  }

  private async completeWorkflowStep(workflow: PaymentWorkflow, stepId: string): Promise<void> {
    const step = workflow.steps.find(s => s.id === stepId);
    if (step) {
      step.status = 'completed';
      step.completedAt = new Date();
    }
  }

  private async startWorkflowStep(workflow: PaymentWorkflow, stepId: string): Promise<void> {
    const step = workflow.steps.find(s => s.id === stepId);
    if (step) {
      step.status = 'in_progress';
      step.startedAt = new Date();
      workflow.currentStep = stepId;
    }
  }

  private setupEventListeners(): void {
    // Set up event listeners for workflow events
    this.logger.info('Event listeners set up for workflow management');
  }

  private async emitWorkflowEvent(workflow: PaymentWorkflow, eventType: string, data: any): Promise<void> {
    const event: PaymentEvent = {
      id: uuidv4(),
      type: eventType,
      workflowId: workflow.id,
      userId: workflow.userId,
      data,
      timestamp: new Date()
    };

    // Publish event to queue
    await this.queueManager.publishEvent('payment-events', event);
  }

  private async calculatePaymentMetrics(): Promise<PaymentMetrics> {
    // This would calculate actual metrics from the database
    return {
      totalWorkflows: this.activeWorkflows.size,
      activeWorkflows: this.activeWorkflows.size,
      completedWorkflows: 0,
      failedWorkflows: 0,
      assetDeposits: {
        total: 0,
        pending: 0,
        completed: 0,
        totalValue: 0
      },
      bitcoinPurchases: {
        total: 0,
        pending: 0,
        completed: 0,
        totalVolume: 0
      },
      fiatTransfers: {
        total: 0,
        pending: 0,
        completed: 0,
        totalAmount: 0
      },
      averageProcessingTime: 0,
      successRate: 0
    };
  }

  private getDefaultMetrics(): PaymentMetrics {
    return {
      totalWorkflows: 0,
      activeWorkflows: 0,
      completedWorkflows: 0,
      failedWorkflows: 0,
      assetDeposits: {
        total: 0,
        pending: 0,
        completed: 0,
        totalValue: 0
      },
      bitcoinPurchases: {
        total: 0,
        pending: 0,
        completed: 0,
        totalVolume: 0
      },
      fiatTransfers: {
        total: 0,
        pending: 0,
        completed: 0,
        totalAmount: 0
      },
      averageProcessingTime: 0,
      successRate: 0
    };
  }
}

