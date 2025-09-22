/**
 * SwiftPayMe Payment Service - Payment Controller
 * Comprehensive REST API controller for payment processing
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { Payment, PaymentWorkflow } from '../models';
import { PaymentOrchestrator } from '../services/PaymentOrchestrator';
import { Logger } from '../utils/Logger';
import {
  PaymentType,
  PaymentStatus,
  ICreatePaymentRequest,
  IPaymentResponse,
  IPaymentListQuery,
  IPaymentListResponse
} from '../types/payment';

const logger = new Logger('PaymentController');
const paymentOrchestrator = new PaymentOrchestrator();

export class PaymentController {
  /**
   * Create a new payment
   */
  static async createPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const paymentRequest: ICreatePaymentRequest = req.body;
      const userId = req.user?.userId || paymentRequest.userId;

      logger.info('Creating payment', { userId, type: paymentRequest.type, amount: paymentRequest.amount });

      const result = await paymentOrchestrator.createPayment({
        ...paymentRequest,
        userId
      });

      const response: IPaymentResponse = {
        success: true,
        payment: result.payment,
        workflow: result.workflow,
        correlationId: req.correlationId
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('Error creating payment', error);
      next(error);
    }
  }

  /**
   * Get payment by ID
   */
  static async getPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { paymentId } = req.params;
      const userId = req.user?.userId;

      const payment = await Payment.findOne({ paymentId, userId });
      if (!payment) {
        res.status(404).json({
          success: false,
          error: 'Payment not found'
        });
        return;
      }

      res.json({
        success: true,
        payment
      });
    } catch (error) {
      logger.error('Error getting payment', error);
      next(error);
    }
  }

  /**
   * Get payments list with filtering and pagination
   */
  static async getPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const query: IPaymentListQuery = {
        userId,
        ...req.query,
        limit: parseInt(req.query.limit as string) || 20,
        offset: parseInt(req.query.offset as string) || 0
      };

      const payments = await Payment.findByUserId(userId, {
        status: query.status,
        type: query.type,
        currency: query.currency,
        startDate: query.startDate,
        endDate: query.endDate,
        limit: query.limit,
        skip: query.offset,
        sort: query.sortBy ? { [query.sortBy]: query.sortOrder === 'desc' ? -1 : 1 } : { createdAt: -1 }
      });

      const total = await Payment.countDocuments({
        userId,
        ...(query.status && { status: query.status }),
        ...(query.type && { type: query.type }),
        ...(query.currency && { currency: query.currency }),
        ...(query.startDate && { createdAt: { $gte: query.startDate } }),
        ...(query.endDate && { createdAt: { $lte: query.endDate } })
      });

      const response: IPaymentListResponse = {
        success: true,
        payments,
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + query.limit < total
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting payments', error);
      next(error);
    }
  }

  /**
   * Update payment status
   */
  static async updatePaymentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { paymentId } = req.params;
      const { status, notes } = req.body;
      const userId = req.user?.userId;
      const actorId = req.user?.userId || 'system';

      const payment = await Payment.findOne({ paymentId, userId });
      if (!payment) {
        res.status(404).json({
          success: false,
          error: 'Payment not found'
        });
        return;
      }

      await payment.updateStatus(status, notes, actorId, 'user');

      res.json({
        success: true,
        payment
      });
    } catch (error) {
      logger.error('Error updating payment status', error);
      next(error);
    }
  }

  /**
   * Cancel payment
   */
  static async cancelPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { paymentId } = req.params;
      const { reason } = req.body;
      const userId = req.user?.userId;
      const actorId = req.user?.userId || 'system';

      const payment = await Payment.findOne({ paymentId, userId });
      if (!payment) {
        res.status(404).json({
          success: false,
          error: 'Payment not found'
        });
        return;
      }

      await payment.cancel(reason, actorId);

      // Cancel associated workflow if exists
      if (payment.workflowId) {
        const workflow = await PaymentWorkflow.findOne({ workflowId: payment.workflowId });
        if (workflow) {
          await workflow.cancel(reason);
        }
      }

      res.json({
        success: true,
        payment
      });
    } catch (error) {
      logger.error('Error cancelling payment', error);
      next(error);
    }
  }

  /**
   * Retry failed payment
   */
  static async retryPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { paymentId } = req.params;
      const userId = req.user?.userId;

      const payment = await Payment.findOne({ paymentId, userId });
      if (!payment) {
        res.status(404).json({
          success: false,
          error: 'Payment not found'
        });
        return;
      }

      if (!payment.canRetry()) {
        res.status(400).json({
          success: false,
          error: 'Payment cannot be retried'
        });
        return;
      }

      await payment.incrementRetry();
      
      // Retry the workflow if exists
      if (payment.workflowId) {
        const result = await paymentOrchestrator.retryWorkflow(payment.workflowId);
        res.json({
          success: true,
          payment,
          workflow: result.workflow
        });
      } else {
        res.json({
          success: true,
          payment
        });
      }
    } catch (error) {
      logger.error('Error retrying payment', error);
      next(error);
    }
  }

  /**
   * Get payment workflow
   */
  static async getPaymentWorkflow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { paymentId } = req.params;
      const userId = req.user?.userId;

      const payment = await Payment.findOne({ paymentId, userId });
      if (!payment) {
        res.status(404).json({
          success: false,
          error: 'Payment not found'
        });
        return;
      }

      if (!payment.workflowId) {
        res.status(404).json({
          success: false,
          error: 'No workflow associated with this payment'
        });
        return;
      }

      const workflow = await PaymentWorkflow.findOne({ workflowId: payment.workflowId });
      if (!workflow) {
        res.status(404).json({
          success: false,
          error: 'Workflow not found'
        });
        return;
      }

      res.json({
        success: true,
        workflow
      });
    } catch (error) {
      logger.error('Error getting payment workflow', error);
      next(error);
    }
  }

  /**
   * Get payment analytics
   */
  static async getPaymentAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { startDate, endDate } = req.query;

      const analytics = await Payment.getAnalytics(
        userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        analytics
      });
    } catch (error) {
      logger.error('Error getting payment analytics', error);
      next(error);
    }
  }

  /**
   * Process asset deposit workflow
   */
  static async processAssetDeposit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const userId = req.user?.userId;
      const { assetType, assetDetails, targetCurrency, estimatedValue } = req.body;

      logger.info('Processing asset deposit', { userId, assetType, targetCurrency });

      const result = await paymentOrchestrator.processAssetDeposit({
        userId,
        assetType,
        assetDetails,
        targetCurrency,
        estimatedValue
      });

      res.status(201).json({
        success: true,
        payment: result.payment,
        workflow: result.workflow,
        correlationId: req.correlationId
      });
    } catch (error) {
      logger.error('Error processing asset deposit', error);
      next(error);
    }
  }

  /**
   * Process Bitcoin purchase workflow
   */
  static async processBitcoinPurchase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const userId = req.user?.userId;
      const { purchaseAmount, purchaseCurrency, destinationWallet } = req.body;

      logger.info('Processing Bitcoin purchase', { userId, purchaseAmount, purchaseCurrency });

      const result = await paymentOrchestrator.processBitcoinPurchase({
        userId,
        purchaseAmount,
        purchaseCurrency,
        destinationWallet
      });

      res.status(201).json({
        success: true,
        payment: result.payment,
        workflow: result.workflow,
        correlationId: req.correlationId
      });
    } catch (error) {
      logger.error('Error processing Bitcoin purchase', error);
      next(error);
    }
  }

  /**
   * Process fiat transfer workflow
   */
  static async processFiatTransfer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const fromUserId = req.user?.userId;
      const { toUserId, amount, currency, memo } = req.body;

      logger.info('Processing fiat transfer', { fromUserId, toUserId, amount, currency });

      const result = await paymentOrchestrator.processFiatTransfer({
        fromUserId,
        toUserId,
        amount,
        currency,
        memo
      });

      res.status(201).json({
        success: true,
        payment: result.payment,
        workflow: result.workflow,
        correlationId: req.correlationId
      });
    } catch (error) {
      logger.error('Error processing fiat transfer', error);
      next(error);
    }
  }

  /**
   * Process crypto transfer workflow
   */
  static async processCryptoTransfer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const userId = req.user?.userId;
      const { toAddress, amount, currency, fromWalletId } = req.body;

      logger.info('Processing crypto transfer', { userId, toAddress, amount, currency });

      const result = await paymentOrchestrator.processCryptoTransfer({
        userId,
        fromWalletId,
        toAddress,
        amount,
        currency
      });

      res.status(201).json({
        success: true,
        payment: result.payment,
        workflow: result.workflow,
        correlationId: req.correlationId
      });
    } catch (error) {
      logger.error('Error processing crypto transfer', error);
      next(error);
    }
  }

  /**
   * Get workflow by ID
   */
  static async getWorkflow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { workflowId } = req.params;
      const userId = req.user?.userId;

      const workflow = await PaymentWorkflow.findOne({ workflowId, userId });
      if (!workflow) {
        res.status(404).json({
          success: false,
          error: 'Workflow not found'
        });
        return;
      }

      res.json({
        success: true,
        workflow
      });
    } catch (error) {
      logger.error('Error getting workflow', error);
      next(error);
    }
  }

  /**
   * Get workflows list
   */
  static async getWorkflows(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { status, type, limit = 20, offset = 0 } = req.query;

      const workflows = await PaymentWorkflow.findByUserId(userId, {
        status,
        type,
        limit: parseInt(limit as string),
        skip: parseInt(offset as string)
      });

      const total = await PaymentWorkflow.countDocuments({
        userId,
        ...(status && { status }),
        ...(type && { type })
      });

      res.json({
        success: true,
        workflows,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + parseInt(limit as string) < total
      });
    } catch (error) {
      logger.error('Error getting workflows', error);
      next(error);
    }
  }

  /**
   * Get workflow analytics
   */
  static async getWorkflowAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { startDate, endDate } = req.query;

      const analytics = await PaymentWorkflow.getAnalytics(
        userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        analytics
      });
    } catch (error) {
      logger.error('Error getting workflow analytics', error);
      next(error);
    }
  }
}

export default PaymentController;

