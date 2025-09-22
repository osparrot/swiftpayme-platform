/**
 * SwiftPayMe Payment Service - Payment Workflow Model
 * Comprehensive Mongoose model for payment workflow orchestration
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Import types
import {
  PaymentType,
  WorkflowStatus,
  IWorkflowDocument,
  IWorkflowStep
} from '../types/payment';

// ==================== WORKFLOW STEP SCHEMA ====================

const WorkflowStepSchema = new Schema({
  stepId: {
    type: String,
    required: true,
    default: uuidv4
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  service: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: Object.values(WorkflowStatus),
    default: WorkflowStatus.INITIATED
  },
  input: Schema.Types.Mixed,
  output: Schema.Types.Mixed,
  startedAt: Date,
  completedAt: Date,
  errorMessage: String,
  retryCount: {
    type: Number,
    default: 0,
    min: 0
  },
  maxRetries: {
    type: Number,
    default: 3,
    min: 0
  },
  timeout: {
    type: Number,
    default: 30000 // 30 seconds
  },
  dependencies: [{
    type: String
  }]
}, { _id: false });

// ==================== PAYMENT WORKFLOW SCHEMA ====================

const PaymentWorkflowSchema = new Schema({
  workflowId: {
    type: String,
    required: true,
    unique: true,
    default: () => `WF_${uuidv4()}`
  },
  type: {
    type: String,
    required: true,
    enum: Object.values(PaymentType),
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: Object.values(WorkflowStatus),
    default: WorkflowStatus.INITIATED,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  steps: [WorkflowStepSchema],
  currentStepIndex: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSteps: {
    type: Number,
    required: true,
    min: 1
  },
  startedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  completedAt: Date,
  failedAt: Date,
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  
  // Workflow Configuration
  timeout: {
    type: Number,
    default: 300000 // 5 minutes
  },
  retryPolicy: {
    maxRetries: {
      type: Number,
      default: 3
    },
    backoffStrategy: {
      type: String,
      enum: ['linear', 'exponential', 'fixed'],
      default: 'exponential'
    },
    baseDelay: {
      type: Number,
      default: 1000 // 1 second
    },
    maxDelay: {
      type: Number,
      default: 30000 // 30 seconds
    },
    jitter: {
      type: Boolean,
      default: true
    }
  },
  
  // Rollback Configuration
  rollbackRequired: {
    type: Boolean,
    default: false
  },
  rollbackSteps: [{
    stepId: String,
    action: String,
    completed: {
      type: Boolean,
      default: false
    }
  }],
  
  // Error Handling
  errorCode: String,
  errorMessage: String,
  errorDetails: Schema.Types.Mixed,
  
  // Audit and Tracking
  executionHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    action: String,
    stepId: String,
    details: Schema.Types.Mixed
  }],
  
  // Performance Metrics
  metrics: {
    totalExecutionTime: Number,
    stepExecutionTimes: [{
      stepId: String,
      executionTime: Number
    }],
    retryCount: {
      type: Number,
      default: 0
    },
    rollbackCount: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// ==================== INDEXES ====================

PaymentWorkflowSchema.index({ userId: 1, status: 1 });
PaymentWorkflowSchema.index({ userId: 1, type: 1 });
PaymentWorkflowSchema.index({ userId: 1, createdAt: -1 });
PaymentWorkflowSchema.index({ status: 1, createdAt: 1 });
PaymentWorkflowSchema.index({ type: 1, status: 1 });
PaymentWorkflowSchema.index({ createdAt: -1 });
PaymentWorkflowSchema.index({ updatedAt: -1 });

// Compound indexes for analytics
PaymentWorkflowSchema.index({ 
  userId: 1, 
  type: 1, 
  status: 1, 
  createdAt: -1 
});

// ==================== VIRTUALS ====================

PaymentWorkflowSchema.virtual('currentStep').get(function() {
  return this.steps[this.currentStepIndex];
});

PaymentWorkflowSchema.virtual('isCompleted').get(function() {
  return this.status === WorkflowStatus.COMPLETED;
});

PaymentWorkflowSchema.virtual('isFailed').get(function() {
  return this.status === WorkflowStatus.FAILED;
});

PaymentWorkflowSchema.virtual('isInProgress').get(function() {
  return this.status === WorkflowStatus.IN_PROGRESS;
});

PaymentWorkflowSchema.virtual('canRetry').get(function() {
  return this.status === WorkflowStatus.FAILED && 
         this.metrics.retryCount < this.retryPolicy.maxRetries;
});

PaymentWorkflowSchema.virtual('progress').get(function() {
  const completedSteps = this.steps.filter((step: IWorkflowStep) => 
    step.status === WorkflowStatus.COMPLETED
  ).length;
  return (completedSteps / this.totalSteps) * 100;
});

PaymentWorkflowSchema.virtual('executionTime').get(function() {
  if (this.completedAt || this.failedAt) {
    const endTime = this.completedAt || this.failedAt;
    return endTime.getTime() - this.startedAt.getTime();
  }
  return Date.now() - this.startedAt.getTime();
});

// ==================== METHODS ====================

PaymentWorkflowSchema.methods.executeNextStep = async function(): Promise<void> {
  if (this.currentStepIndex >= this.steps.length) {
    await this.complete();
    return;
  }
  
  const currentStep = this.steps[this.currentStepIndex];
  
  // Check dependencies
  const dependenciesMet = await this.checkStepDependencies(currentStep);
  if (!dependenciesMet) {
    throw new Error(`Dependencies not met for step ${currentStep.stepId}`);
  }
  
  // Update workflow status
  this.status = WorkflowStatus.IN_PROGRESS;
  
  // Update step status
  currentStep.status = WorkflowStatus.IN_PROGRESS;
  currentStep.startedAt = new Date();
  
  // Add execution history
  this.executionHistory.push({
    timestamp: new Date(),
    action: 'step_started',
    stepId: currentStep.stepId,
    details: {
      stepName: currentStep.name,
      service: currentStep.service,
      action: currentStep.action
    }
  });
  
  await this.save();
};

PaymentWorkflowSchema.methods.completeStep = async function(
  stepId: string, 
  output?: any
): Promise<void> {
  const step = this.steps.find((s: IWorkflowStep) => s.stepId === stepId);
  if (!step) {
    throw new Error(`Step ${stepId} not found`);
  }
  
  step.status = WorkflowStatus.COMPLETED;
  step.completedAt = new Date();
  step.output = output;
  
  // Calculate step execution time
  if (step.startedAt) {
    const executionTime = step.completedAt.getTime() - step.startedAt.getTime();
    this.metrics.stepExecutionTimes.push({
      stepId: step.stepId,
      executionTime
    });
  }
  
  // Add execution history
  this.executionHistory.push({
    timestamp: new Date(),
    action: 'step_completed',
    stepId: step.stepId,
    details: {
      stepName: step.name,
      output
    }
  });
  
  // Move to next step
  this.currentStepIndex += 1;
  
  // Check if workflow is complete
  if (this.currentStepIndex >= this.steps.length) {
    await this.complete();
  }
  
  await this.save();
};

PaymentWorkflowSchema.methods.failStep = async function(
  stepId: string, 
  error: string,
  details?: any
): Promise<void> {
  const step = this.steps.find((s: IWorkflowStep) => s.stepId === stepId);
  if (!step) {
    throw new Error(`Step ${stepId} not found`);
  }
  
  step.status = WorkflowStatus.FAILED;
  step.errorMessage = error;
  
  // Add execution history
  this.executionHistory.push({
    timestamp: new Date(),
    action: 'step_failed',
    stepId: step.stepId,
    details: {
      stepName: step.name,
      error,
      details
    }
  });
  
  // Check if step can be retried
  if (step.retryCount < step.maxRetries) {
    await this.retryStep(stepId);
  } else {
    await this.fail(error);
  }
};

PaymentWorkflowSchema.methods.retryStep = async function(stepId: string): Promise<void> {
  const step = this.steps.find((s: IWorkflowStep) => s.stepId === stepId);
  if (!step) {
    throw new Error(`Step ${stepId} not found`);
  }
  
  if (step.retryCount >= step.maxRetries) {
    throw new Error(`Maximum retries exceeded for step ${stepId}`);
  }
  
  // Calculate retry delay
  const delay = this.calculateRetryDelay(step.retryCount);
  
  // Increment retry count
  step.retryCount += 1;
  this.metrics.retryCount += 1;
  
  // Reset step status
  step.status = WorkflowStatus.INITIATED;
  step.errorMessage = undefined;
  
  // Add execution history
  this.executionHistory.push({
    timestamp: new Date(),
    action: 'step_retry',
    stepId: step.stepId,
    details: {
      stepName: step.name,
      retryCount: step.retryCount,
      delay
    }
  });
  
  await this.save();
  
  // Schedule retry (in a real implementation, this would use a job queue)
  setTimeout(async () => {
    await this.executeNextStep();
  }, delay);
};

PaymentWorkflowSchema.methods.rollback = async function(): Promise<void> {
  this.status = WorkflowStatus.ROLLED_BACK;
  this.rollbackRequired = true;
  
  // Execute rollback steps in reverse order
  const completedSteps = this.steps
    .filter((step: IWorkflowStep) => step.status === WorkflowStatus.COMPLETED)
    .reverse();
  
  for (const step of completedSteps) {
    try {
      // Add rollback step
      this.rollbackSteps.push({
        stepId: step.stepId,
        action: `rollback_${step.action}`,
        completed: false
      });
      
      // In a real implementation, this would call the service to perform rollback
      // await this.executeRollbackStep(step);
      
      // Mark rollback as completed
      const rollbackStep = this.rollbackSteps.find(rs => rs.stepId === step.stepId);
      if (rollbackStep) {
        rollbackStep.completed = true;
      }
      
    } catch (error) {
      // Log rollback failure but continue with other steps
      this.executionHistory.push({
        timestamp: new Date(),
        action: 'rollback_failed',
        stepId: step.stepId,
        details: {
          error: error.message
        }
      });
    }
  }
  
  this.metrics.rollbackCount += 1;
  
  // Add execution history
  this.executionHistory.push({
    timestamp: new Date(),
    action: 'workflow_rolled_back',
    details: {
      rollbackSteps: this.rollbackSteps.length
    }
  });
  
  await this.save();
};

PaymentWorkflowSchema.methods.complete = async function(): Promise<void> {
  this.status = WorkflowStatus.COMPLETED;
  this.completedAt = new Date();
  
  // Calculate total execution time
  this.metrics.totalExecutionTime = this.completedAt.getTime() - this.startedAt.getTime();
  
  // Add execution history
  this.executionHistory.push({
    timestamp: new Date(),
    action: 'workflow_completed',
    details: {
      totalExecutionTime: this.metrics.totalExecutionTime,
      totalSteps: this.totalSteps,
      retryCount: this.metrics.retryCount
    }
  });
  
  await this.save();
};

PaymentWorkflowSchema.methods.fail = async function(error: string, details?: any): Promise<void> {
  this.status = WorkflowStatus.FAILED;
  this.failedAt = new Date();
  this.errorMessage = error;
  this.errorDetails = details;
  
  // Add execution history
  this.executionHistory.push({
    timestamp: new Date(),
    action: 'workflow_failed',
    details: {
      error,
      details,
      currentStep: this.currentStepIndex,
      totalSteps: this.totalSteps
    }
  });
  
  await this.save();
};

PaymentWorkflowSchema.methods.cancel = async function(reason?: string): Promise<void> {
  if ([WorkflowStatus.COMPLETED, WorkflowStatus.FAILED].includes(this.status)) {
    throw new Error(`Cannot cancel workflow in ${this.status} status`);
  }
  
  this.status = WorkflowStatus.CANCELLED;
  
  // Add execution history
  this.executionHistory.push({
    timestamp: new Date(),
    action: 'workflow_cancelled',
    details: {
      reason,
      currentStep: this.currentStepIndex,
      totalSteps: this.totalSteps
    }
  });
  
  await this.save();
};

PaymentWorkflowSchema.methods.checkStepDependencies = async function(
  step: IWorkflowStep
): Promise<boolean> {
  if (!step.dependencies || step.dependencies.length === 0) {
    return true;
  }
  
  for (const dependencyId of step.dependencies) {
    const dependencyStep = this.steps.find((s: IWorkflowStep) => s.stepId === dependencyId);
    if (!dependencyStep || dependencyStep.status !== WorkflowStatus.COMPLETED) {
      return false;
    }
  }
  
  return true;
};

PaymentWorkflowSchema.methods.calculateRetryDelay = function(retryCount: number): number {
  const { backoffStrategy, baseDelay, maxDelay, jitter } = this.retryPolicy;
  
  let delay = baseDelay;
  
  switch (backoffStrategy) {
    case 'linear':
      delay = baseDelay * (retryCount + 1);
      break;
    case 'exponential':
      delay = baseDelay * Math.pow(2, retryCount);
      break;
    case 'fixed':
    default:
      delay = baseDelay;
      break;
  }
  
  // Apply maximum delay limit
  delay = Math.min(delay, maxDelay);
  
  // Apply jitter if enabled
  if (jitter) {
    delay = delay * (0.5 + Math.random() * 0.5);
  }
  
  return Math.floor(delay);
};

// ==================== STATIC METHODS ====================

PaymentWorkflowSchema.statics.findByUserId = function(userId: string, options: any = {}) {
  const query = this.find({ userId });
  
  if (options.status) query.where('status', options.status);
  if (options.type) query.where('type', options.type);
  if (options.startDate) query.where('createdAt').gte(options.startDate);
  if (options.endDate) query.where('createdAt').lte(options.endDate);
  
  if (options.sort) query.sort(options.sort);
  else query.sort({ createdAt: -1 });
  
  if (options.limit) query.limit(options.limit);
  if (options.skip) query.skip(options.skip);
  
  return query;
};

PaymentWorkflowSchema.statics.findActive = function() {
  return this.find({
    status: { $in: [WorkflowStatus.INITIATED, WorkflowStatus.IN_PROGRESS, WorkflowStatus.AWAITING_EXTERNAL] }
  });
};

PaymentWorkflowSchema.statics.findStalled = function(timeoutMinutes: number = 30) {
  const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);
  return this.find({
    status: WorkflowStatus.IN_PROGRESS,
    updatedAt: { $lt: cutoffTime }
  });
};

PaymentWorkflowSchema.statics.getAnalytics = async function(userId?: string, startDate?: Date, endDate?: Date) {
  const matchStage: any = {};
  
  if (userId) matchStage.userId = userId;
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = startDate;
    if (endDate) matchStage.createdAt.$lte = endDate;
  }
  
  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalCount: { $sum: 1 },
        completedCount: {
          $sum: { $cond: [{ $eq: ['$status', WorkflowStatus.COMPLETED] }, 1, 0] }
        },
        failedCount: {
          $sum: { $cond: [{ $eq: ['$status', WorkflowStatus.FAILED] }, 1, 0] }
        },
        averageExecutionTime: { $avg: '$metrics.totalExecutionTime' },
        totalRetries: { $sum: '$metrics.retryCount' },
        byType: {
          $push: {
            type: '$type',
            status: '$status',
            executionTime: '$metrics.totalExecutionTime'
          }
        }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {};
};

// ==================== MIDDLEWARE ====================

PaymentWorkflowSchema.pre('save', function(next) {
  // Update total steps count
  this.totalSteps = this.steps.length;
  
  next();
});

PaymentWorkflowSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// ==================== EXPORT ====================

export interface IPaymentWorkflow extends IWorkflowDocument {}

export const PaymentWorkflow: Model<IPaymentWorkflow> = mongoose.model<IPaymentWorkflow>('PaymentWorkflow', PaymentWorkflowSchema);

export default PaymentWorkflow;

