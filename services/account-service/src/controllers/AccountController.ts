/**
 * SwiftPayMe Account Service - Account Controller
 * REST API endpoints for account management
 */

import { Request, Response } from 'express';
import { AccountService } from '../services/AccountService';
import { 
  SupportedCurrency, 
  AccountStatus,
  ICreateAccountRequest,
  IDepositRequest,
  IWithdrawalRequest,
  ITransferRequest,
  ICurrencyConversionRequest,
  IAssetTokenConversionRequest,
  ICryptoChargeRequest
} from '../types/account';

export class AccountController {
  private accountService: AccountService;

  constructor() {
    this.accountService = new AccountService();
  }

  // ==================== ACCOUNT MANAGEMENT ====================

  createAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: ICreateAccountRequest = {
        userId: req.body.userId,
        defaultCurrency: req.body.defaultCurrency || SupportedCurrency.USD,
        initialBalances: req.body.initialBalances
      };

      const account = await this.accountService.createAccount(request);

      res.status(201).json({
        success: true,
        account,
        message: 'Account created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  getAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const { accountId } = req.params;
      const account = await this.accountService.getAccount(accountId);

      res.json({
        success: true,
        account
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  };

  getAccountByUserId = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const account = await this.accountService.getAccountByUserId(userId);

      res.json({
        success: true,
        account
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  };

  updateAccountStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { accountId } = req.params;
      const { status, reason } = req.body;

      const account = await this.accountService.updateAccountStatus(accountId, status, reason);

      res.json({
        success: true,
        account,
        message: `Account status updated to ${status}`
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  };

  // ==================== BALANCE OPERATIONS ====================

  deposit = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: IDepositRequest = {
        accountId: req.body.accountId,
        amount: req.body.amount,
        currency: req.body.currency,
        description: req.body.description,
        reference: req.body.reference,
        metadata: req.body.metadata
      };

      const result = await this.accountService.deposit(request);

      res.status(201).json({
        success: true,
        transaction: result.transaction,
        account: result.account,
        message: 'Deposit completed successfully'
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  };

  withdraw = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: IWithdrawalRequest = {
        accountId: req.body.accountId,
        amount: req.body.amount,
        currency: req.body.currency,
        description: req.body.description,
        reference: req.body.reference,
        metadata: req.body.metadata
      };

      const result = await this.accountService.withdraw(request);

      res.json({
        success: true,
        transaction: result.transaction,
        account: result.account,
        message: 'Withdrawal completed successfully'
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  };

  transfer = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: ITransferRequest = {
        fromAccountId: req.body.fromAccountId,
        toAccountId: req.body.toAccountId,
        amount: req.body.amount,
        currency: req.body.currency,
        description: req.body.description,
        reference: req.body.reference,
        metadata: req.body.metadata
      };

      const result = await this.accountService.transfer(request);

      res.json({
        success: true,
        debitTransaction: result.debitTransaction,
        creditTransaction: result.creditTransaction,
        fromAccount: result.fromAccount,
        toAccount: result.toAccount,
        message: 'Transfer completed successfully'
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  };

  // ==================== CURRENCY CONVERSION ====================

  convertCurrency = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: ICurrencyConversionRequest = {
        accountId: req.body.accountId,
        fromCurrency: req.body.fromCurrency,
        toCurrency: req.body.toCurrency,
        amount: req.body.amount,
        conversionType: req.body.conversionType,
        assetTokenDetails: req.body.assetTokenDetails
      };

      const result = await this.accountService.convertCurrency(request);

      res.json({
        success: true,
        conversion: result.conversion,
        debitTransaction: result.debitTransaction,
        creditTransaction: result.creditTransaction,
        account: result.account,
        message: 'Currency conversion completed successfully'
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  };

  convertAssetTokenToFiat = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: IAssetTokenConversionRequest = {
        accountId: req.body.accountId,
        tokenType: req.body.tokenType,
        tokenAmount: req.body.tokenAmount,
        assetId: req.body.assetId,
        targetCurrency: req.body.targetCurrency
      };

      const result = await this.accountService.convertAssetTokenToFiat(request);

      res.json({
        success: true,
        conversion: result.conversion,
        transaction: result.transaction,
        account: result.account,
        message: 'Asset token conversion completed successfully'
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  };

  // ==================== CRYPTO PURCHASE ====================

  chargeFiatForCrypto = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: ICryptoChargeRequest = {
        accountId: req.body.accountId,
        amount: req.body.amount,
        currency: req.body.currency,
        cryptoAmount: req.body.cryptoAmount,
        cryptoCurrency: req.body.cryptoCurrency,
        paymentId: req.body.paymentId,
        description: req.body.description
      };

      const result = await this.accountService.chargeFiatForCryptoPurchase(request);

      res.json({
        success: true,
        transaction: result.transaction,
        account: result.account,
        message: 'Fiat charged for crypto purchase successfully'
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  };

  // ==================== ANALYTICS ====================

  getAccountAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate } = req.query;
      
      const analytics = await this.accountService.getAccountAnalytics(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        analytics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  getTransactionAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { accountId, userId, startDate, endDate } = req.query;
      
      const analytics = await this.accountService.getTransactionAnalytics(
        accountId as string,
        userId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        analytics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  getConversionAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { accountId, userId, startDate, endDate } = req.query;
      
      const analytics = await this.accountService.getConversionAnalytics(
        accountId as string,
        userId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        analytics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  // ==================== HEALTH CHECK ====================

  healthCheck = async (req: Request, res: Response): Promise<void> => {
    res.json({
      success: true,
      service: 'account-service',
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  };
}

