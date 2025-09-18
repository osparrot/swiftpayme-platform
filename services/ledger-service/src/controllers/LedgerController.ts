import { Request, Response } from 'express';
import { LedgerService } from '../services/LedgerService';
import { Logger } from '../utils/Logger';
import { EventBus } from '../../shared/events/event-bus';
import {
  CreateAccountRequest,
  CreateTransactionRequest,
  CreateJournalEntryRequest,
  BalanceInquiryRequest
} from '../types';

export class LedgerController {
  private ledgerService: LedgerService;
  private logger: Logger;

  constructor(eventBus: EventBus) {
    this.ledgerService = new LedgerService(eventBus);
    this.logger = new Logger('LedgerController');
  }

  // ==================== ACCOUNT ENDPOINTS ====================

  /**
   * POST /api/accounts
   * Create a new account
   */
  createAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: CreateAccountRequest = req.body;
      const createdBy = req.user?.userId || 'system';

      this.logger.info('Creating account', { request, createdBy });

      const result = await this.ledgerService.createAccount(request, createdBy);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      this.logger.error('Error in createAccount', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * GET /api/accounts/:accountId
   * Get account details
   */
  getAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const { accountId } = req.params;

      this.logger.info('Getting account', { accountId });

      const Account = require('../models/Account').default;
      const account = await Account.findOne({ accountId });

      if (!account) {
        res.status(404).json({
          success: false,
          error: {
            code: 'ACCOUNT_NOT_FOUND',
            message: 'Account not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        data: account,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Error in getAccount', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * GET /api/accounts/:accountId/balance
   * Get account balance
   */
  getAccountBalance = async (req: Request, res: Response): Promise<void> => {
    try {
      const { accountId } = req.params;
      const { asOfDate } = req.query;

      const request: BalanceInquiryRequest = {
        accountId,
        asOfDate: asOfDate ? new Date(asOfDate as string) : undefined
      };

      this.logger.info('Getting account balance', { request });

      const result = await this.ledgerService.getAccountBalance(request);

      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      this.logger.error('Error in getAccountBalance', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * GET /api/accounts/user/:userId
   * Get all accounts for a user
   */
  getUserAccounts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { accountType, currency } = req.query;

      this.logger.info('Getting user accounts', { userId, accountType, currency });

      const Account = require('../models/Account').default;
      const query: any = { userId };

      if (accountType) query.accountType = accountType;
      if (currency) query.currency = currency;

      const accounts = await Account.find(query).sort({ createdAt: -1 });

      res.json({
        success: true,
        data: accounts,
        count: accounts.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Error in getUserAccounts', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * PUT /api/accounts/:accountId/status
   * Update account status
   */
  updateAccountStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { accountId } = req.params;
      const { status, reason } = req.body;
      const updatedBy = req.user?.userId || 'system';

      this.logger.info('Updating account status', { accountId, status, reason, updatedBy });

      const Account = require('../models/Account').default;
      const account = await Account.findOne({ accountId });

      if (!account) {
        res.status(404).json({
          success: false,
          error: {
            code: 'ACCOUNT_NOT_FOUND',
            message: 'Account not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const oldStatus = account.status;
      account.status = status;
      account.lastModifiedBy = updatedBy;
      
      if (reason) {
        account.metadata.statusChangeReason = reason;
      }

      await account.save();

      // Create audit log
      const AuditLog = require('../models/AuditLog').default;
      await new AuditLog({
        eventType: 'ACCOUNT_UPDATED',
        severity: 'MEDIUM',
        description: `Account status changed from ${oldStatus} to ${status}`,
        entityType: 'Account',
        entityId: accountId,
        userId: account.userId,
        oldValues: { status: oldStatus },
        newValues: { status },
        metadata: { reason, updatedBy }
      }).save();

      res.json({
        success: true,
        data: account,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Error in updateAccountStatus', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  // ==================== TRANSACTION ENDPOINTS ====================

  /**
   * POST /api/transactions
   * Process a new transaction
   */
  processTransaction = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: CreateTransactionRequest = req.body;
      const createdBy = req.user?.userId || 'system';

      this.logger.info('Processing transaction', { request, createdBy });

      const result = await this.ledgerService.processTransaction(request, createdBy);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      this.logger.error('Error in processTransaction', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * GET /api/transactions/:transactionId
   * Get transaction details
   */
  getTransaction = async (req: Request, res: Response): Promise<void> => {
    try {
      const { transactionId } = req.params;

      this.logger.info('Getting transaction', { transactionId });

      const Transaction = require('../models/Transaction').default;
      const transaction = await Transaction.findOne({ transactionId });

      if (!transaction) {
        res.status(404).json({
          success: false,
          error: {
            code: 'TRANSACTION_NOT_FOUND',
            message: 'Transaction not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        data: transaction,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Error in getTransaction', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * GET /api/transactions/user/:userId
   * Get transactions for a user
   */
  getUserTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { 
        transactionType, 
        currency, 
        status, 
        dateFrom, 
        dateTo, 
        limit = 100, 
        offset = 0 
      } = req.query;

      this.logger.info('Getting user transactions', { 
        userId, transactionType, currency, status, dateFrom, dateTo, limit, offset 
      });

      const Transaction = require('../models/Transaction').default;
      const query: any = { userId };

      if (transactionType) query.transactionType = transactionType;
      if (currency) query.currency = currency;
      if (status) query.status = status;
      
      if (dateFrom || dateTo) {
        query.transactionDate = {};
        if (dateFrom) query.transactionDate.$gte = new Date(dateFrom as string);
        if (dateTo) query.transactionDate.$lte = new Date(dateTo as string);
      }

      const transactions = await Transaction.find(query)
        .sort({ transactionDate: -1 })
        .limit(parseInt(limit as string))
        .skip(parseInt(offset as string));

      const total = await Transaction.countDocuments(query);

      res.json({
        success: true,
        data: transactions,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: total > parseInt(offset as string) + transactions.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Error in getUserTransactions', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * GET /api/transactions/account/:accountId
   * Get transactions for an account
   */
  getAccountTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { accountId } = req.params;
      const { limit = 100, offset = 0 } = req.query;

      this.logger.info('Getting account transactions', { accountId, limit, offset });

      const Transaction = require('../models/Transaction').default;
      const query = {
        $or: [
          { fromAccountId: accountId },
          { toAccountId: accountId }
        ]
      };

      const transactions = await Transaction.find(query)
        .sort({ transactionDate: -1 })
        .limit(parseInt(limit as string))
        .skip(parseInt(offset as string));

      const total = await Transaction.countDocuments(query);

      res.json({
        success: true,
        data: transactions,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: total > parseInt(offset as string) + transactions.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Error in getAccountTransactions', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  // ==================== JOURNAL ENTRY ENDPOINTS ====================

  /**
   * POST /api/journal-entries
   * Create a new journal entry
   */
  createJournalEntry = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: CreateJournalEntryRequest = req.body;
      const createdBy = req.user?.userId || 'system';

      this.logger.info('Creating journal entry', { request, createdBy });

      const result = await this.ledgerService.createJournalEntry(request, createdBy);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      this.logger.error('Error in createJournalEntry', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * GET /api/journal-entries/:journalEntryId
   * Get journal entry details
   */
  getJournalEntry = async (req: Request, res: Response): Promise<void> => {
    try {
      const { journalEntryId } = req.params;

      this.logger.info('Getting journal entry', { journalEntryId });

      const JournalEntry = require('../models/JournalEntry').default;
      const journalEntry = await JournalEntry.findOne({ journalEntryId });

      if (!journalEntry) {
        res.status(404).json({
          success: false,
          error: {
            code: 'JOURNAL_ENTRY_NOT_FOUND',
            message: 'Journal entry not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        data: journalEntry,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Error in getJournalEntry', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * POST /api/journal-entries/:journalEntryId/post
   * Post a journal entry
   */
  postJournalEntry = async (req: Request, res: Response): Promise<void> => {
    try {
      const { journalEntryId } = req.params;
      const postedBy = req.user?.userId || 'system';

      this.logger.info('Posting journal entry', { journalEntryId, postedBy });

      const JournalEntry = require('../models/JournalEntry').default;
      const journalEntry = await JournalEntry.findOne({ journalEntryId });

      if (!journalEntry) {
        res.status(404).json({
          success: false,
          error: {
            code: 'JOURNAL_ENTRY_NOT_FOUND',
            message: 'Journal entry not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      journalEntry.lastModifiedBy = postedBy;
      const postedEntry = await journalEntry.post();

      res.json({
        success: true,
        data: postedEntry,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Error in postJournalEntry', { error: error.message });
      res.status(400).json({
        success: false,
        error: {
          code: 'JOURNAL_ENTRY_POST_FAILED',
          message: error.message
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  // ==================== SWIFTPAYME INTEGRATION ENDPOINTS ====================

  /**
   * POST /api/integrations/asset-deposit
   * Process asset deposit
   */
  processAssetDeposit = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, assetDepositId, assetType, amount, currency } = req.body;
      const createdBy = req.user?.userId || 'system';

      this.logger.info('Processing asset deposit', { userId, assetDepositId, assetType, amount, currency });

      const result = await this.ledgerService.processAssetDeposit(
        userId, assetDepositId, assetType, amount, currency, createdBy
      );

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      this.logger.error('Error in processAssetDeposit', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * POST /api/integrations/bitcoin-purchase
   * Process Bitcoin purchase
   */
  processBitcoinPurchase = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, amount, bitcoinAmount, exchangeRate } = req.body;
      const createdBy = req.user?.userId || 'system';

      this.logger.info('Processing Bitcoin purchase', { userId, amount, bitcoinAmount, exchangeRate });

      const result = await this.ledgerService.processBitcoinPurchase(
        userId, amount, bitcoinAmount, exchangeRate, createdBy
      );

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      this.logger.error('Error in processBitcoinPurchase', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  // ==================== REPORTING ENDPOINTS ====================

  /**
   * GET /api/reports/trial-balance
   * Get trial balance report
   */
  getTrialBalance = async (req: Request, res: Response): Promise<void> => {
    try {
      const { asOfDate, currency } = req.query;

      this.logger.info('Getting trial balance', { asOfDate, currency });

      const Account = require('../models/Account').default;
      const query: any = {};
      
      if (currency) query.currency = currency;

      const accounts = await Account.find(query).sort({ accountNumber: 1 });

      const trialBalance = accounts.map(account => ({
        accountId: account.accountId,
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        accountType: account.accountType,
        currency: account.currency,
        debitBalance: account.currentBalance.greaterThan(0) ? account.currentBalance.toString() : '0',
        creditBalance: account.currentBalance.lessThan(0) ? account.currentBalance.abs().toString() : '0'
      }));

      res.json({
        success: true,
        data: {
          asOfDate: asOfDate || new Date(),
          accounts: trialBalance,
          totalDebits: trialBalance.reduce((sum, acc) => sum + parseFloat(acc.debitBalance), 0),
          totalCredits: trialBalance.reduce((sum, acc) => sum + parseFloat(acc.creditBalance), 0)
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Error in getTrialBalance', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  // ==================== HEALTH CHECK ====================

  /**
   * GET /api/health
   * Health check endpoint
   */
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const mongoose = require('mongoose');
      
      res.json({
        success: true,
        data: {
          service: 'ledger-service',
          version: '1.0.0',
          status: 'healthy',
          database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: error.message
        },
        timestamp: new Date().toISOString()
      });
    }
  };
}

