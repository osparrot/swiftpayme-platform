/**
 * SwiftPayMe Advanced Workflow Orchestration Engine
 * Manages complex business workflows across all microservices
 */

import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/Logger';

// ==================== INTERFACES ====================
export interface IWorkflowStep {
  stepId: string;
  name: string;
  type: 'service_call' | 'condition' | 'parallel' | 'wait' | 'manual' | 'notification';
  service?: string;
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  payload?: any;
  condition?: string; // JavaScript expression
  timeout?: number; // milliseconds
  retryCount?: number;
  retryDelay?: number;
  onSuccess?: string; // next step ID
  onFailure?: string; // next step ID
  onTimeout?: string; // next step ID
  parallelSteps?: string[]; // for parallel execution
  waitCondition?: string; // for wait steps
  approvalRequired?: boolean;
  approvalRole?: string;
  notificationTemplate?: string;
  metadata?: any;
}

export interface IWorkflowDefinition {
  workflowId: string;
  name: string;
  description: string;
  version: string;
  category: 'asset_processing' | 'payment' | 'user_onboarding' | 'compliance' | 'admin';
  startStep: string;
  steps: IWorkflowStep[];
  variables?: { [key: string]: any };
  permissions?: string[];
  timeout?: number;
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
}

export interface IWorkflowInstance {
  instanceId: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'paused' | 'cancelled' | 'waiting_approval';
  currentStep: string;
  context: { [key: string]: any };
  startedAt: Date;
  completedAt?: Date;
  startedBy: string;
  executionHistory: IWorkflowExecution[];
  approvals?: IWorkflowApproval[];
  error?: string;
  metadata?: any;
}

export interface IWorkflowExecution {
  stepId: string;
  stepName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'waiting';
  startedAt: Date;
  completedAt?: Date;
  input?: any;
  output?: any;
  error?: string;
  retryCount: number;
  duration?: number;
}

export interface IWorkflowApproval {
  approvalId: string;
  stepId: string;
  requiredRole: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  comments?: string;
}

// ==================== WORKFLOW ENGINE ====================
export class WorkflowEngine extends EventEmitter {
  private redis: Redis;
  private workflows: Map<string, IWorkflowDefinition> = new Map();
  private runningInstances: Map<string, IWorkflowInstance> = new Map();
  private stepHandlers: Map<string, Function> = new Map();
  
  constructor() {
    super();
    
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3
    });
    
    this.initializeStepHandlers();
    this.loadWorkflowDefinitions();
    this.startInstanceMonitoring();
    
    Logger.info('Workflow Engine initialized');
  }

  // ==================== INITIALIZATION ====================
  private initializeStepHandlers(): void {
    this.stepHandlers.set('service_call', this.handleServiceCall.bind(this));
    this.stepHandlers.set('condition', this.handleCondition.bind(this));
    this.stepHandlers.set('parallel', this.handleParallel.bind(this));
    this.stepHandlers.set('wait', this.handleWait.bind(this));
    this.stepHandlers.set('manual', this.handleManual.bind(this));
    this.stepHandlers.set('notification', this.handleNotification.bind(this));
  }

  private async loadWorkflowDefinitions(): Promise<void> {
    try {
      // Load predefined workflows
      await this.registerAssetProcessingWorkflow();
      await this.registerPaymentWorkflow();
      await this.registerUserOnboardingWorkflow();
      await this.registerComplianceWorkflow();
      
      Logger.info(`Loaded ${this.workflows.size} workflow definitions`);
    } catch (error) {
      Logger.error('Error loading workflow definitions:', error);
    }
  }

  // ==================== WORKFLOW REGISTRATION ====================
  public registerWorkflow(definition: IWorkflowDefinition): void {
    this.workflows.set(definition.workflowId, definition);
    Logger.info(`Workflow registered: ${definition.name} (${definition.workflowId})`);
  }

  private async registerAssetProcessingWorkflow(): Promise<void> {
    const workflow: IWorkflowDefinition = {
      workflowId: 'asset_processing_v1',
      name: 'Asset Processing Workflow',
      description: 'Complete workflow for processing physical asset deposits',
      version: '1.0.0',
      category: 'asset_processing',
      startStep: 'validate_submission',
      steps: [
        {
          stepId: 'validate_submission',
          name: 'Validate Asset Submission',
          type: 'service_call',
          service: 'asset-service',
          endpoint: '/api/assets/validate',
          method: 'POST',
          timeout: 30000,
          retryCount: 3,
          onSuccess: 'initial_verification',
          onFailure: 'notify_rejection'
        },
        {
          stepId: 'initial_verification',
          name: 'Initial Asset Verification',
          type: 'service_call',
          service: 'asset-service',
          endpoint: '/api/assets/verify',
          method: 'POST',
          timeout: 60000,
          onSuccess: 'risk_assessment',
          onFailure: 'request_additional_info'
        },
        {
          stepId: 'risk_assessment',
          name: 'Risk Assessment',
          type: 'service_call',
          service: 'compliance-service',
          endpoint: '/api/compliance/assess-risk',
          method: 'POST',
          timeout: 45000,
          onSuccess: 'check_risk_level',
          onFailure: 'escalate_to_admin'
        },
        {
          stepId: 'check_risk_level',
          name: 'Check Risk Level',
          type: 'condition',
          condition: 'context.riskLevel === "low" || context.riskLevel === "medium"',
          onSuccess: 'professional_appraisal',
          onFailure: 'manual_review_required'
        },
        {
          stepId: 'professional_appraisal',
          name: 'Professional Appraisal',
          type: 'service_call',
          service: 'asset-service',
          endpoint: '/api/assets/appraise',
          method: 'POST',
          timeout: 120000,
          onSuccess: 'calculate_value',
          onFailure: 'request_reappraisal'
        },
        {
          stepId: 'calculate_value',
          name: 'Calculate Asset Value',
          type: 'parallel',
          parallelSteps: ['get_market_price', 'apply_premiums'],
          onSuccess: 'admin_approval',
          onFailure: 'valuation_error'
        },
        {
          stepId: 'get_market_price',
          name: 'Get Market Price',
          type: 'service_call',
          service: 'currency-conversion-service',
          endpoint: '/api/prices/current',
          method: 'GET',
          timeout: 15000
        },
        {
          stepId: 'apply_premiums',
          name: 'Apply Premiums/Discounts',
          type: 'service_call',
          service: 'asset-service',
          endpoint: '/api/assets/calculate-premiums',
          method: 'POST',
          timeout: 10000
        },
        {
          stepId: 'admin_approval',
          name: 'Admin Approval Required',
          type: 'manual',
          approvalRequired: true,
          approvalRole: 'asset_verifier',
          timeout: 86400000, // 24 hours
          onSuccess: 'create_tokens',
          onFailure: 'notify_rejection'
        },
        {
          stepId: 'create_tokens',
          name: 'Create Asset-Backed Tokens',
          type: 'service_call',
          service: 'tokenization-service',
          endpoint: '/api/tokens/mint',
          method: 'POST',
          timeout: 30000,
          onSuccess: 'update_ledger',
          onFailure: 'token_creation_failed'
        },
        {
          stepId: 'update_ledger',
          name: 'Update Ledger',
          type: 'service_call',
          service: 'ledger-service',
          endpoint: '/api/ledger/record-asset-deposit',
          method: 'POST',
          timeout: 20000,
          onSuccess: 'credit_user_account',
          onFailure: 'ledger_error'
        },
        {
          stepId: 'credit_user_account',
          name: 'Credit User Account',
          type: 'service_call',
          service: 'account-service',
          endpoint: '/api/accounts/credit',
          method: 'POST',
          timeout: 15000,
          onSuccess: 'notify_completion',
          onFailure: 'credit_failed'
        },
        {
          stepId: 'notify_completion',
          name: 'Notify User of Completion',
          type: 'notification',
          notificationTemplate: 'asset_processing_complete',
          onSuccess: 'workflow_complete'
        },
        {
          stepId: 'workflow_complete',
          name: 'Workflow Complete',
          type: 'service_call',
          service: 'analytics-service',
          endpoint: '/api/analytics/record-completion',
          method: 'POST'
        }
      ],
      permissions: ['asset_processor', 'admin'],
      timeout: 172800000, // 48 hours
      createdBy: 'system',
      createdAt: new Date(),
      isActive: true
    };
    
    this.registerWorkflow(workflow);
  }

  private async registerPaymentWorkflow(): Promise<void> {
    const workflow: IWorkflowDefinition = {
      workflowId: 'bitcoin_purchase_v1',
      name: 'Bitcoin Purchase Workflow',
      description: 'Complete workflow for purchasing Bitcoin with fiat balance',
      version: '1.0.0',
      category: 'payment',
      startStep: 'validate_purchase_request',
      steps: [
        {
          stepId: 'validate_purchase_request',
          name: 'Validate Purchase Request',
          type: 'service_call',
          service: 'payment-service',
          endpoint: '/api/payments/validate-bitcoin-purchase',
          method: 'POST',
          timeout: 15000,
          onSuccess: 'check_account_balance',
          onFailure: 'notify_validation_error'
        },
        {
          stepId: 'check_account_balance',
          name: 'Check Account Balance',
          type: 'service_call',
          service: 'account-service',
          endpoint: '/api/accounts/check-balance',
          method: 'GET',
          timeout: 10000,
          onSuccess: 'verify_sufficient_funds',
          onFailure: 'balance_check_failed'
        },
        {
          stepId: 'verify_sufficient_funds',
          name: 'Verify Sufficient Funds',
          type: 'condition',
          condition: 'context.accountBalance >= context.purchaseAmount',
          onSuccess: 'get_bitcoin_price',
          onFailure: 'insufficient_funds'
        },
        {
          stepId: 'get_bitcoin_price',
          name: 'Get Current Bitcoin Price',
          type: 'service_call',
          service: 'currency-conversion-service',
          endpoint: '/api/prices/bitcoin',
          method: 'GET',
          timeout: 10000,
          onSuccess: 'calculate_bitcoin_amount',
          onFailure: 'price_fetch_failed'
        },
        {
          stepId: 'calculate_bitcoin_amount',
          name: 'Calculate Bitcoin Amount',
          type: 'service_call',
          service: 'payment-service',
          endpoint: '/api/payments/calculate-bitcoin-amount',
          method: 'POST',
          timeout: 5000,
          onSuccess: 'reserve_funds',
          onFailure: 'calculation_failed'
        },
        {
          stepId: 'reserve_funds',
          name: 'Reserve Fiat Funds',
          type: 'service_call',
          service: 'account-service',
          endpoint: '/api/accounts/reserve-funds',
          method: 'POST',
          timeout: 15000,
          onSuccess: 'execute_bitcoin_purchase',
          onFailure: 'reservation_failed'
        },
        {
          stepId: 'execute_bitcoin_purchase',
          name: 'Execute Bitcoin Purchase',
          type: 'service_call',
          service: 'crypto-service',
          endpoint: '/api/crypto/purchase-bitcoin',
          method: 'POST',
          timeout: 60000,
          onSuccess: 'update_payment_ledger',
          onFailure: 'purchase_failed'
        },
        {
          stepId: 'update_payment_ledger',
          name: 'Update Payment Ledger',
          type: 'service_call',
          service: 'ledger-service',
          endpoint: '/api/ledger/record-bitcoin-purchase',
          method: 'POST',
          timeout: 20000,
          onSuccess: 'debit_fiat_account',
          onFailure: 'ledger_update_failed'
        },
        {
          stepId: 'debit_fiat_account',
          name: 'Debit Fiat Account',
          type: 'service_call',
          service: 'account-service',
          endpoint: '/api/accounts/debit',
          method: 'POST',
          timeout: 15000,
          onSuccess: 'credit_bitcoin_wallet',
          onFailure: 'debit_failed'
        },
        {
          stepId: 'credit_bitcoin_wallet',
          name: 'Credit Bitcoin Wallet',
          type: 'service_call',
          service: 'crypto-service',
          endpoint: '/api/crypto/credit-wallet',
          method: 'POST',
          timeout: 30000,
          onSuccess: 'notify_purchase_complete',
          onFailure: 'wallet_credit_failed'
        },
        {
          stepId: 'notify_purchase_complete',
          name: 'Notify Purchase Complete',
          type: 'notification',
          notificationTemplate: 'bitcoin_purchase_complete',
          onSuccess: 'purchase_workflow_complete'
        }
      ],
      permissions: ['user', 'admin'],
      timeout: 300000, // 5 minutes
      createdBy: 'system',
      createdAt: new Date(),
      isActive: true
    };
    
    this.registerWorkflow(workflow);
  }

  private async registerUserOnboardingWorkflow(): Promise<void> {
    const workflow: IWorkflowDefinition = {
      workflowId: 'user_onboarding_v1',
      name: 'User Onboarding Workflow',
      description: 'Complete user onboarding with KYC verification',
      version: '1.0.0',
      category: 'user_onboarding',
      startStep: 'create_user_account',
      steps: [
        {
          stepId: 'create_user_account',
          name: 'Create User Account',
          type: 'service_call',
          service: 'user-service',
          endpoint: '/api/users/create',
          method: 'POST',
          timeout: 15000,
          onSuccess: 'send_welcome_email',
          onFailure: 'account_creation_failed'
        },
        {
          stepId: 'send_welcome_email',
          name: 'Send Welcome Email',
          type: 'notification',
          notificationTemplate: 'welcome_email',
          onSuccess: 'create_fiat_accounts'
        },
        {
          stepId: 'create_fiat_accounts',
          name: 'Create Fiat Accounts',
          type: 'service_call',
          service: 'account-service',
          endpoint: '/api/accounts/create-multi-currency',
          method: 'POST',
          timeout: 20000,
          onSuccess: 'create_crypto_wallet',
          onFailure: 'fiat_account_creation_failed'
        },
        {
          stepId: 'create_crypto_wallet',
          name: 'Create Crypto Wallet',
          type: 'service_call',
          service: 'crypto-service',
          endpoint: '/api/crypto/create-wallet',
          method: 'POST',
          timeout: 30000,
          onSuccess: 'initialize_ledger_accounts',
          onFailure: 'wallet_creation_failed'
        },
        {
          stepId: 'initialize_ledger_accounts',
          name: 'Initialize Ledger Accounts',
          type: 'service_call',
          service: 'ledger-service',
          endpoint: '/api/ledger/initialize-user-accounts',
          method: 'POST',
          timeout: 15000,
          onSuccess: 'wait_for_kyc',
          onFailure: 'ledger_initialization_failed'
        },
        {
          stepId: 'wait_for_kyc',
          name: 'Wait for KYC Submission',
          type: 'wait',
          waitCondition: 'context.kycSubmitted === true',
          timeout: 604800000, // 7 days
          onSuccess: 'process_kyc',
          onTimeout: 'kyc_timeout_reminder'
        },
        {
          stepId: 'process_kyc',
          name: 'Process KYC Documents',
          type: 'service_call',
          service: 'compliance-service',
          endpoint: '/api/compliance/process-kyc',
          method: 'POST',
          timeout: 120000,
          onSuccess: 'kyc_admin_review',
          onFailure: 'kyc_processing_failed'
        },
        {
          stepId: 'kyc_admin_review',
          name: 'KYC Admin Review',
          type: 'manual',
          approvalRequired: true,
          approvalRole: 'kyc_reviewer',
          timeout: 172800000, // 48 hours
          onSuccess: 'activate_account',
          onFailure: 'kyc_rejected'
        },
        {
          stepId: 'activate_account',
          name: 'Activate User Account',
          type: 'service_call',
          service: 'user-service',
          endpoint: '/api/users/activate',
          method: 'POST',
          timeout: 10000,
          onSuccess: 'notify_account_active',
          onFailure: 'activation_failed'
        },
        {
          stepId: 'notify_account_active',
          name: 'Notify Account Active',
          type: 'notification',
          notificationTemplate: 'account_activated',
          onSuccess: 'onboarding_complete'
        }
      ],
      permissions: ['user', 'admin'],
      timeout: 1209600000, // 14 days
      createdBy: 'system',
      createdAt: new Date(),
      isActive: true
    };
    
    this.registerWorkflow(workflow);
  }

  private async registerComplianceWorkflow(): Promise<void> {
    const workflow: IWorkflowDefinition = {
      workflowId: 'compliance_check_v1',
      name: 'Compliance Check Workflow',
      description: 'Automated compliance and AML checks',
      version: '1.0.0',
      category: 'compliance',
      startStep: 'aml_screening',
      steps: [
        {
          stepId: 'aml_screening',
          name: 'AML Screening',
          type: 'service_call',
          service: 'compliance-service',
          endpoint: '/api/compliance/aml-screen',
          method: 'POST',
          timeout: 30000,
          onSuccess: 'sanctions_check',
          onFailure: 'aml_screening_failed'
        },
        {
          stepId: 'sanctions_check',
          name: 'Sanctions List Check',
          type: 'service_call',
          service: 'compliance-service',
          endpoint: '/api/compliance/sanctions-check',
          method: 'POST',
          timeout: 20000,
          onSuccess: 'pep_screening',
          onFailure: 'sanctions_check_failed'
        },
        {
          stepId: 'pep_screening',
          name: 'PEP Screening',
          type: 'service_call',
          service: 'compliance-service',
          endpoint: '/api/compliance/pep-screen',
          method: 'POST',
          timeout: 25000,
          onSuccess: 'risk_scoring',
          onFailure: 'pep_screening_failed'
        },
        {
          stepId: 'risk_scoring',
          name: 'Calculate Risk Score',
          type: 'service_call',
          service: 'compliance-service',
          endpoint: '/api/compliance/calculate-risk-score',
          method: 'POST',
          timeout: 15000,
          onSuccess: 'evaluate_risk_level',
          onFailure: 'risk_scoring_failed'
        },
        {
          stepId: 'evaluate_risk_level',
          name: 'Evaluate Risk Level',
          type: 'condition',
          condition: 'context.riskScore <= 30',
          onSuccess: 'approve_automatically',
          onFailure: 'manual_compliance_review'
        },
        {
          stepId: 'approve_automatically',
          name: 'Approve Automatically',
          type: 'service_call',
          service: 'compliance-service',
          endpoint: '/api/compliance/auto-approve',
          method: 'POST',
          timeout: 5000,
          onSuccess: 'compliance_complete'
        },
        {
          stepId: 'manual_compliance_review',
          name: 'Manual Compliance Review',
          type: 'manual',
          approvalRequired: true,
          approvalRole: 'compliance_officer',
          timeout: 259200000, // 72 hours
          onSuccess: 'compliance_approved',
          onFailure: 'compliance_rejected'
        }
      ],
      permissions: ['compliance_officer', 'admin'],
      timeout: 432000000, // 5 days
      createdBy: 'system',
      createdAt: new Date(),
      isActive: true
    };
    
    this.registerWorkflow(workflow);
  }

  // ==================== WORKFLOW EXECUTION ====================
  public async startWorkflow(workflowId: string, context: any, startedBy: string): Promise<string> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    
    if (!workflow.isActive) {
      throw new Error(`Workflow is not active: ${workflowId}`);
    }
    
    const instanceId = uuidv4();
    const instance: IWorkflowInstance = {
      instanceId,
      workflowId,
      status: 'running',
      currentStep: workflow.startStep,
      context: { ...workflow.variables, ...context },
      startedAt: new Date(),
      startedBy,
      executionHistory: [],
      approvals: []
    };
    
    this.runningInstances.set(instanceId, instance);
    
    // Store in Redis for persistence
    await this.redis.setex(`workflow:${instanceId}`, 86400, JSON.stringify(instance));
    
    Logger.info(`Workflow started: ${workflow.name} (${instanceId})`, {
      workflowId,
      instanceId,
      startedBy
    });
    
    // Start execution
    this.executeStep(instanceId, workflow.startStep);
    
    this.emit('workflow_started', { instanceId, workflowId, startedBy });
    
    return instanceId;
  }

  private async executeStep(instanceId: string, stepId: string): Promise<void> {
    const instance = this.runningInstances.get(instanceId);
    if (!instance) {
      Logger.error(`Workflow instance not found: ${instanceId}`);
      return;
    }
    
    const workflow = this.workflows.get(instance.workflowId);
    if (!workflow) {
      Logger.error(`Workflow definition not found: ${instance.workflowId}`);
      return;
    }
    
    const step = workflow.steps.find(s => s.stepId === stepId);
    if (!step) {
      Logger.error(`Step not found: ${stepId} in workflow ${instance.workflowId}`);
      return;
    }
    
    const execution: IWorkflowExecution = {
      stepId,
      stepName: step.name,
      status: 'running',
      startedAt: new Date(),
      retryCount: 0
    };
    
    instance.executionHistory.push(execution);
    instance.currentStep = stepId;
    
    Logger.info(`Executing step: ${step.name} (${stepId})`, {
      instanceId,
      workflowId: instance.workflowId
    });
    
    try {
      const handler = this.stepHandlers.get(step.type);
      if (!handler) {
        throw new Error(`No handler for step type: ${step.type}`);
      }
      
      const result = await handler(instance, step);
      
      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
      execution.output = result;
      
      // Determine next step
      const nextStepId = result?.success !== false ? step.onSuccess : step.onFailure;
      
      if (nextStepId) {
        await this.executeStep(instanceId, nextStepId);
      } else {
        await this.completeWorkflow(instanceId);
      }
      
    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
      execution.error = error.message;
      
      Logger.error(`Step execution failed: ${step.name}`, error);
      
      // Handle retry logic
      if (execution.retryCount < (step.retryCount || 0)) {
        execution.retryCount++;
        setTimeout(() => {
          this.executeStep(instanceId, stepId);
        }, step.retryDelay || 5000);
      } else {
        // Move to failure step or fail workflow
        const failureStepId = step.onFailure;
        if (failureStepId) {
          await this.executeStep(instanceId, failureStepId);
        } else {
          await this.failWorkflow(instanceId, error.message);
        }
      }
    }
    
    // Update instance in Redis
    await this.redis.setex(`workflow:${instanceId}`, 86400, JSON.stringify(instance));
  }

  // ==================== STEP HANDLERS ====================
  private async handleServiceCall(instance: IWorkflowInstance, step: IWorkflowStep): Promise<any> {
    const { service, endpoint, method = 'POST', payload, timeout = 30000 } = step;
    
    // Build service URL
    const serviceUrl = process.env[`${service?.toUpperCase().replace('-', '_')}_URL`] || `http://${service}:3000`;
    const url = `${serviceUrl}${endpoint}`;
    
    // Prepare payload with context variables
    const requestPayload = this.interpolateVariables(payload || {}, instance.context);
    
    Logger.info(`Making service call: ${method} ${url}`, {
      instanceId: instance.instanceId,
      service,
      endpoint
    });
    
    // Make HTTP request (simplified - in production use proper HTTP client)
    const response = await this.makeHttpRequest(url, method, requestPayload, timeout);
    
    // Update context with response data
    if (response.data) {
      Object.assign(instance.context, response.data);
    }
    
    return response;
  }

  private async handleCondition(instance: IWorkflowInstance, step: IWorkflowStep): Promise<any> {
    const { condition } = step;
    
    if (!condition) {
      throw new Error('Condition step requires condition expression');
    }
    
    // Evaluate condition (simplified - in production use safe evaluation)
    const result = this.evaluateCondition(condition, instance.context);
    
    Logger.info(`Condition evaluated: ${condition} = ${result}`, {
      instanceId: instance.instanceId,
      context: instance.context
    });
    
    return { success: result };
  }

  private async handleParallel(instance: IWorkflowInstance, step: IWorkflowStep): Promise<any> {
    const { parallelSteps } = step;
    
    if (!parallelSteps || parallelSteps.length === 0) {
      throw new Error('Parallel step requires parallelSteps array');
    }
    
    const workflow = this.workflows.get(instance.workflowId);
    if (!workflow) {
      throw new Error('Workflow definition not found');
    }
    
    Logger.info(`Executing parallel steps: ${parallelSteps.join(', ')}`, {
      instanceId: instance.instanceId
    });
    
    // Execute all parallel steps
    const promises = parallelSteps.map(async (stepId) => {
      const parallelStep = workflow.steps.find(s => s.stepId === stepId);
      if (!parallelStep) {
        throw new Error(`Parallel step not found: ${stepId}`);
      }
      
      const handler = this.stepHandlers.get(parallelStep.type);
      if (!handler) {
        throw new Error(`No handler for step type: ${parallelStep.type}`);
      }
      
      return handler(instance, parallelStep);
    });
    
    const results = await Promise.all(promises);
    
    return { success: true, results };
  }

  private async handleWait(instance: IWorkflowInstance, step: IWorkflowStep): Promise<any> {
    const { waitCondition, timeout = 300000 } = step;
    
    if (!waitCondition) {
      throw new Error('Wait step requires waitCondition');
    }
    
    Logger.info(`Waiting for condition: ${waitCondition}`, {
      instanceId: instance.instanceId,
      timeout
    });
    
    // Set instance status to waiting
    instance.status = 'waiting_approval';
    
    // Schedule timeout check
    setTimeout(() => {
      const currentInstance = this.runningInstances.get(instance.instanceId);
      if (currentInstance && currentInstance.status === 'waiting_approval') {
        const timeoutStepId = step.onTimeout;
        if (timeoutStepId) {
          this.executeStep(instance.instanceId, timeoutStepId);
        } else {
          this.failWorkflow(instance.instanceId, 'Wait step timeout');
        }
      }
    }, timeout);
    
    return { success: true, waiting: true };
  }

  private async handleManual(instance: IWorkflowInstance, step: IWorkflowStep): Promise<any> {
    const { approvalRequired, approvalRole, timeout = 86400000 } = step;
    
    if (!approvalRequired || !approvalRole) {
      throw new Error('Manual step requires approvalRequired and approvalRole');
    }
    
    const approvalId = uuidv4();
    const approval: IWorkflowApproval = {
      approvalId,
      stepId: step.stepId,
      requiredRole: approvalRole,
      status: 'pending',
      requestedAt: new Date()
    };
    
    instance.approvals = instance.approvals || [];
    instance.approvals.push(approval);
    instance.status = 'waiting_approval';
    
    Logger.info(`Manual approval required: ${approvalRole}`, {
      instanceId: instance.instanceId,
      approvalId,
      stepId: step.stepId
    });
    
    // Notify admins with required role
    await this.notifyApprovalRequired(instance, approval);
    
    // Schedule timeout
    setTimeout(() => {
      const currentInstance = this.runningInstances.get(instance.instanceId);
      const currentApproval = currentInstance?.approvals?.find(a => a.approvalId === approvalId);
      
      if (currentApproval && currentApproval.status === 'pending') {
        const timeoutStepId = step.onTimeout;
        if (timeoutStepId) {
          this.executeStep(instance.instanceId, timeoutStepId);
        } else {
          this.failWorkflow(instance.instanceId, 'Manual approval timeout');
        }
      }
    }, timeout);
    
    return { success: true, waiting: true, approvalId };
  }

  private async handleNotification(instance: IWorkflowInstance, step: IWorkflowStep): Promise<any> {
    const { notificationTemplate } = step;
    
    if (!notificationTemplate) {
      throw new Error('Notification step requires notificationTemplate');
    }
    
    Logger.info(`Sending notification: ${notificationTemplate}`, {
      instanceId: instance.instanceId
    });
    
    // Send notification via notification service
    await this.sendWorkflowNotification(instance, notificationTemplate);
    
    return { success: true };
  }

  // ==================== UTILITY METHODS ====================
  private interpolateVariables(obj: any, context: any): any {
    const jsonStr = JSON.stringify(obj);
    const interpolated = jsonStr.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return context[key] !== undefined ? JSON.stringify(context[key]) : match;
    });
    return JSON.parse(interpolated);
  }

  private evaluateCondition(condition: string, context: any): boolean {
    // Simplified condition evaluation - in production use safe evaluation library
    try {
      const func = new Function('context', `with(context) { return ${condition}; }`);
      return func(context);
    } catch (error) {
      Logger.error('Error evaluating condition:', error);
      return false;
    }
  }

  private async makeHttpRequest(url: string, method: string, payload: any, timeout: number): Promise<any> {
    // Simplified HTTP request - in production use proper HTTP client like axios
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Mock successful response
        resolve({
          success: true,
          data: { status: 'completed', timestamp: new Date() }
        });
      }, 100);
    });
  }

  private async notifyApprovalRequired(instance: IWorkflowInstance, approval: IWorkflowApproval): Promise<void> {
    // Publish approval notification to Redis
    await this.redis.publish('swiftpayme:admin_notifications', JSON.stringify({
      type: 'approval_required',
      instanceId: instance.instanceId,
      workflowId: instance.workflowId,
      approvalId: approval.approvalId,
      requiredRole: approval.requiredRole,
      stepId: approval.stepId,
      requestedAt: approval.requestedAt
    }));
  }

  private async sendWorkflowNotification(instance: IWorkflowInstance, template: string): Promise<void> {
    // Send notification via notification service
    await this.redis.publish('swiftpayme:notifications', JSON.stringify({
      userId: instance.context.userId,
      type: 'workflow_notification',
      template,
      data: {
        instanceId: instance.instanceId,
        workflowId: instance.workflowId,
        context: instance.context
      }
    }));
  }

  private async completeWorkflow(instanceId: string): Promise<void> {
    const instance = this.runningInstances.get(instanceId);
    if (!instance) return;
    
    instance.status = 'completed';
    instance.completedAt = new Date();
    
    Logger.info(`Workflow completed: ${instance.workflowId} (${instanceId})`, {
      duration: instance.completedAt.getTime() - instance.startedAt.getTime(),
      steps: instance.executionHistory.length
    });
    
    this.emit('workflow_completed', { instanceId, workflowId: instance.workflowId });
    
    // Update in Redis
    await this.redis.setex(`workflow:${instanceId}`, 86400, JSON.stringify(instance));
  }

  private async failWorkflow(instanceId: string, error: string): Promise<void> {
    const instance = this.runningInstances.get(instanceId);
    if (!instance) return;
    
    instance.status = 'failed';
    instance.error = error;
    instance.completedAt = new Date();
    
    Logger.error(`Workflow failed: ${instance.workflowId} (${instanceId})`, {
      error,
      duration: instance.completedAt.getTime() - instance.startedAt.getTime()
    });
    
    this.emit('workflow_failed', { instanceId, workflowId: instance.workflowId, error });
    
    // Update in Redis
    await this.redis.setex(`workflow:${instanceId}`, 86400, JSON.stringify(instance));
  }

  // ==================== PUBLIC API ====================
  public async approveStep(instanceId: string, approvalId: string, approvedBy: string, comments?: string): Promise<void> {
    const instance = this.runningInstances.get(instanceId);
    if (!instance) {
      throw new Error('Workflow instance not found');
    }
    
    const approval = instance.approvals?.find(a => a.approvalId === approvalId);
    if (!approval) {
      throw new Error('Approval not found');
    }
    
    if (approval.status !== 'pending') {
      throw new Error('Approval already processed');
    }
    
    approval.status = 'approved';
    approval.approvedBy = approvedBy;
    approval.approvedAt = new Date();
    approval.comments = comments;
    
    instance.status = 'running';
    
    Logger.info(`Step approved: ${approval.stepId} by ${approvedBy}`, {
      instanceId,
      approvalId,
      comments
    });
    
    // Continue workflow execution
    const workflow = this.workflows.get(instance.workflowId);
    const step = workflow?.steps.find(s => s.stepId === approval.stepId);
    
    if (step?.onSuccess) {
      await this.executeStep(instanceId, step.onSuccess);
    }
  }

  public async rejectStep(instanceId: string, approvalId: string, rejectedBy: string, comments: string): Promise<void> {
    const instance = this.runningInstances.get(instanceId);
    if (!instance) {
      throw new Error('Workflow instance not found');
    }
    
    const approval = instance.approvals?.find(a => a.approvalId === approvalId);
    if (!approval) {
      throw new Error('Approval not found');
    }
    
    if (approval.status !== 'pending') {
      throw new Error('Approval already processed');
    }
    
    approval.status = 'rejected';
    approval.approvedBy = rejectedBy;
    approval.approvedAt = new Date();
    approval.comments = comments;
    
    Logger.info(`Step rejected: ${approval.stepId} by ${rejectedBy}`, {
      instanceId,
      approvalId,
      comments
    });
    
    // Move to failure step or fail workflow
    const workflow = this.workflows.get(instance.workflowId);
    const step = workflow?.steps.find(s => s.stepId === approval.stepId);
    
    if (step?.onFailure) {
      await this.executeStep(instanceId, step.onFailure);
    } else {
      await this.failWorkflow(instanceId, `Step rejected: ${comments}`);
    }
  }

  public getWorkflowInstance(instanceId: string): IWorkflowInstance | undefined {
    return this.runningInstances.get(instanceId);
  }

  public getWorkflowDefinition(workflowId: string): IWorkflowDefinition | undefined {
    return this.workflows.get(workflowId);
  }

  public getRunningInstances(): IWorkflowInstance[] {
    return Array.from(this.runningInstances.values());
  }

  public getPendingApprovals(role?: string): IWorkflowApproval[] {
    const approvals: IWorkflowApproval[] = [];
    
    this.runningInstances.forEach(instance => {
      if (instance.approvals) {
        instance.approvals.forEach(approval => {
          if (approval.status === 'pending' && (!role || approval.requiredRole === role)) {
            approvals.push(approval);
          }
        });
      }
    });
    
    return approvals;
  }

  private startInstanceMonitoring(): void {
    // Monitor workflow instances every minute
    setInterval(() => {
      this.runningInstances.forEach(async (instance, instanceId) => {
        // Check for timeouts
        const now = new Date();
        const workflow = this.workflows.get(instance.workflowId);
        
        if (workflow?.timeout) {
          const elapsed = now.getTime() - instance.startedAt.getTime();
          if (elapsed > workflow.timeout) {
            await this.failWorkflow(instanceId, 'Workflow timeout');
          }
        }
      });
    }, 60000);
  }
}

export default WorkflowEngine;

