/**
 * SwiftPayMe Account Service - Core Business Logic
 * Comprehensive service for multi-currency account management
 */

import { Account, Transaction, CurrencyConversion } from '../models';
import {
  SupportedCurrency,
  AccountStatus,
  TransactionType,
  TransactionStatus,
  ConversionType,
  BalanceType,
  IAccountDocument,
  ITransactionDocument,
  ICurrencyConversionDocument,
  ICreateAccountRequest,
  IDepositRequest,
  IWithdrawalRequest,
  ITransferRequest,
  ICurrencyConversionRequest,
  IAssetTokenConversionRequest,
  ICryptoChargeRequest,
  InsufficientBalanceError,
  AccountNotFoundError,
  AccountSuspendedError,
  ConversionFailedError
} from '../types/account';
import axios from 'axios';
import Decimal from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';

export class AccountService {
  private currencyServiceUrl: string;
  private tokenizationServiceUrl: string;
  private ledgerServiceUrl: string;
  private notificationServiceUrl: string;

  constructor() {
    this.currencyServiceUrl = process.env.CURRENCY_SERVICE_URL || 'http://currency-conversion-service:3004';
    this.tokenizationServiceUrl = process.env.TOKENIZATION_SERVICE_URL || 'http://tokenization-service:3009';
    this.ledgerServiceUrl = process.env.LEDGER_SERVICE_URL || 'http://ledger-service:3010';
    this.notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3008';
  }

  // ==================== ACCOUNT MANAGEMENT ====================

  async createAccount(request: ICreateAccountRequest): Promise<IAccountDocument> {
    try {
      // Check if account already exists for user
      const existingAccount = await Account.findByUserId(request.userId);
      if (existingAccount) {
        throw new Error(`Account already exists for user ${request.userId}`);
      }

      // Create new account
      const account = new Account({
        userId: request.userId,
        defaultCurrency: request.defaultCurrency,
        status: AccountStatus.ACTIVE
      });

      // Add initial balances if provided
      if (request.initialBalances) {
        for (const balance of request.initialBalances) {
          await account.addCurrency(balance.currency);
          if (balance.amount > 0) {
            await account.updateBalance(balance.currency, balance.amount, BalanceType.AVAILABLE);
          }
        }
      }

      await account.save();

      // Send notification
      await this.sendNotification(request.userId, 'account_created', {
        accountId: account.accountId,
        defaultCurrency: request.defaultCurrency
      });

      return account;
    } catch (error) {
      throw new Error(`Failed to create account: ${error.message}`);
    }
  }

  async getAccount(accountId: string): Promise<IAccountDocument> {
    const account = await Account.findOne({ accountId });
    if (!account) {
      throw new AccountNotFoundError(accountId);
    }
    return account;
  }

  async getAccountByUserId(userId: string): Promise<IAccountDocument> {
    const account = await Account.findByUserId(userId);
    if (!account) {
      throw new AccountNotFoundError(`user:${userId}`);
    }
    return account;
  }

  async updateAccountStatus(accountId: string, status: AccountStatus, reason?: string): Promise<IAccountDocument> {
    const account = await this.getAccount(accountId);
    
    switch (status) {
      case AccountStatus.SUSPENDED:
        await account.suspend(reason);
        break;
      case AccountStatus.FROZEN:
        await account.freeze(reason);
        break;
      case AccountStatus.ACTIVE:
        await account.activate();
        break;
      case AccountStatus.CLOSED:
        await account.close(reason);
        break;
    }

    // Send notification
    await this.sendNotification(account.userId, 'account_status_changed', {
      accountId,
      status,
      reason
    });

    return account;
  }

  // ==================== BALANCE OPERATIONS ====================

  async deposit(request: IDepositRequest): Promise<{ transaction: ITransactionDocument; account: IAccountDocument }> {
    const account = await this.getAccount(request.accountId);
    
    if (!account.isActive) {
      throw new AccountSuspendedError(request.accountId);
    }

    // Create deposit transaction
    const transaction = new Transaction({
      accountId: request.accountId,
      userId: account.userId,
      type: TransactionType.DEPOSIT,
      amount: request.amount,
      currency: request.currency,
      description: request.description || `Deposit ${request.amount} ${request.currency}`,
      reference: request.reference,
      metadata: request.metadata || {},
      status: TransactionStatus.PROCESSING
    });

    await transaction.save();

    try {
      // Update account balance
      await account.updateBalance(request.currency, request.amount, BalanceType.AVAILABLE);
      
      // Set balance after transaction
      const newBalance = account.getBalance(request.currency, BalanceType.AVAILABLE);
      await transaction.setBalanceAfter(newBalance);
      
      // Complete transaction
      await transaction.complete();

      // Record in ledger
      await this.recordInLedger({
        userId: account.userId,
        accountId: request.accountId,
        transactionId: transaction.transactionId,
        type: 'deposit',
        amount: request.amount,
        currency: request.currency,
        description: transaction.description
      });

      // Send notification
      await this.sendNotification(account.userId, 'deposit_completed', {
        amount: request.amount,
        currency: request.currency,
        transactionId: transaction.transactionId
      });

      return { transaction, account };
    } catch (error) {
      await transaction.fail(error.message);
      throw error;
    }
  }

  async withdraw(request: IWithdrawalRequest): Promise<{ transaction: ITransactionDocument; account: IAccountDocument }> {
    const account = await this.getAccount(request.accountId);
    
    if (!account.isActive) {
      throw new AccountSuspendedError(request.accountId);
    }

    // Check balance
    if (!account.hasBalance(request.currency, request.amount)) {
      throw new InsufficientBalanceError(
        request.currency,
        request.amount,
        account.getBalance(request.currency)
      );
    }

    // Create withdrawal transaction
    const transaction = new Transaction({
      accountId: request.accountId,
      userId: account.userId,
      type: TransactionType.WITHDRAWAL,
      amount: request.amount,
      currency: request.currency,
      description: request.description || `Withdrawal ${request.amount} ${request.currency}`,
      reference: request.reference,
      metadata: request.metadata || {},
      status: TransactionStatus.PROCESSING
    });

    await transaction.save();

    try {
      // Update account balance
      await account.updateBalance(request.currency, -request.amount, BalanceType.AVAILABLE);
      
      // Set balance after transaction
      const newBalance = account.getBalance(request.currency, BalanceType.AVAILABLE);
      await transaction.setBalanceAfter(newBalance);
      
      // Complete transaction
      await transaction.complete();

      // Record in ledger
      await this.recordInLedger({
        userId: account.userId,
        accountId: request.accountId,
        transactionId: transaction.transactionId,
        type: 'withdrawal',
        amount: -request.amount,
        currency: request.currency,
        description: transaction.description
      });

      // Send notification
      await this.sendNotification(account.userId, 'withdrawal_completed', {
        amount: request.amount,
        currency: request.currency,
        transactionId: transaction.transactionId
      });

      return { transaction, account };
    } catch (error) {
      await transaction.fail(error.message);
      throw error;
    }
  }

  async transfer(request: ITransferRequest): Promise<{ 
    debitTransaction: ITransactionDocument; 
    creditTransaction: ITransactionDocument;
    fromAccount: IAccountDocument;
    toAccount: IAccountDocument;
  }> {
    const fromAccount = await this.getAccount(request.fromAccountId);
    const toAccount = await this.getAccount(request.toAccountId);
    
    if (!fromAccount.isActive || !toAccount.isActive) {
      throw new Error('Both accounts must be active for transfers');
    }

    // Check balance
    if (!fromAccount.hasBalance(request.currency, request.amount)) {
      throw new InsufficientBalanceError(
        request.currency,
        request.amount,
        fromAccount.getBalance(request.currency)
      );
    }

    // Create debit transaction
    const debitTransaction = new Transaction({
      accountId: request.fromAccountId,
      userId: fromAccount.userId,
      type: TransactionType.TRANSFER_OUT,
      amount: request.amount,
      currency: request.currency,
      description: request.description || `Transfer to ${request.toAccountId}`,
      reference: request.reference,
      metadata: { ...request.metadata, toAccountId: request.toAccountId },
      status: TransactionStatus.PROCESSING
    });

    // Create credit transaction
    const creditTransaction = new Transaction({
      accountId: request.toAccountId,
      userId: toAccount.userId,
      type: TransactionType.TRANSFER_IN,
      amount: request.amount,
      currency: request.currency,
      description: request.description || `Transfer from ${request.fromAccountId}`,
      reference: request.reference,
      metadata: { ...request.metadata, fromAccountId: request.fromAccountId },
      status: TransactionStatus.PROCESSING,
      relatedTransactionId: debitTransaction.transactionId
    });

    debitTransaction.relatedTransactionId = creditTransaction.transactionId;

    await debitTransaction.save();
    await creditTransaction.save();

    try {
      // Update balances
      await fromAccount.updateBalance(request.currency, -request.amount, BalanceType.AVAILABLE);
      await toAccount.updateBalance(request.currency, request.amount, BalanceType.AVAILABLE);
      
      // Set balances after transactions
      const fromBalance = fromAccount.getBalance(request.currency, BalanceType.AVAILABLE);
      const toBalance = toAccount.getBalance(request.currency, BalanceType.AVAILABLE);
      
      await debitTransaction.setBalanceAfter(fromBalance);
      await creditTransaction.setBalanceAfter(toBalance);
      
      // Complete transactions
      await debitTransaction.complete();
      await creditTransaction.complete();

      // Record in ledger
      await this.recordInLedger({
        userId: fromAccount.userId,
        accountId: request.fromAccountId,
        transactionId: debitTransaction.transactionId,
        type: 'transfer_out',
        amount: -request.amount,
        currency: request.currency,
        description: debitTransaction.description
      });

      await this.recordInLedger({
        userId: toAccount.userId,
        accountId: request.toAccountId,
        transactionId: creditTransaction.transactionId,
        type: 'transfer_in',
        amount: request.amount,
        currency: request.currency,
        description: creditTransaction.description
      });

      // Send notifications
      await this.sendNotification(fromAccount.userId, 'transfer_sent', {
        amount: request.amount,
        currency: request.currency,
        toAccountId: request.toAccountId,
        transactionId: debitTransaction.transactionId
      });

      await this.sendNotification(toAccount.userId, 'transfer_received', {
        amount: request.amount,
        currency: request.currency,
        fromAccountId: request.fromAccountId,
        transactionId: creditTransaction.transactionId
      });

      return { debitTransaction, creditTransaction, fromAccount, toAccount };
    } catch (error) {
      await debitTransaction.fail(error.message);
      await creditTransaction.fail(error.message);
      throw error;
    }
  }

  // ==================== CURRENCY CONVERSION ====================

  async convertCurrency(request: ICurrencyConversionRequest): Promise<{
    conversion: ICurrencyConversionDocument;
    debitTransaction: ITransactionDocument;
    creditTransaction: ITransactionDocument;
    account: IAccountDocument;
  }> {
    const account = await this.getAccount(request.accountId);
    
    if (!account.isActive) {
      throw new AccountSuspendedError(request.accountId);
    }

    // Get exchange rate
    const exchangeRate = await this.getExchangeRate(request.fromCurrency, request.toCurrency);
    const toAmount = new Decimal(request.amount).mul(exchangeRate.rate).toNumber();
    const conversionFee = new Decimal(toAmount).mul(0.001).toNumber(); // 0.1% fee
    const netToAmount = new Decimal(toAmount).minus(conversionFee).toNumber();

    // Check balance
    if (!account.hasBalance(request.fromCurrency, request.amount)) {
      throw new InsufficientBalanceError(
        request.fromCurrency,
        request.amount,
        account.getBalance(request.fromCurrency)
      );
    }

    // Create debit transaction
    const debitTransaction = new Transaction({
      accountId: request.accountId,
      userId: account.userId,
      type: TransactionType.CURRENCY_CONVERSION,
      amount: request.amount,
      currency: request.fromCurrency,
      description: `Convert ${request.amount} ${request.fromCurrency} to ${request.toCurrency}`,
      status: TransactionStatus.PROCESSING,
      conversionDetails: {
        fromCurrency: request.fromCurrency,
        toCurrency: request.toCurrency,
        fromAmount: request.amount,
        toAmount: netToAmount,
        exchangeRate: exchangeRate.rate,
        conversionFee,
        conversionType: request.conversionType || ConversionType.CURRENCY_TO_CURRENCY
      }
    });

    // Create credit transaction
    const creditTransaction = new Transaction({
      accountId: request.accountId,
      userId: account.userId,
      type: TransactionType.CURRENCY_CONVERSION,
      amount: netToAmount,
      currency: request.toCurrency,
      description: `Receive ${netToAmount} ${request.toCurrency} from ${request.fromCurrency} conversion`,
      status: TransactionStatus.PROCESSING,
      relatedTransactionId: debitTransaction.transactionId,
      conversionDetails: {
        fromCurrency: request.fromCurrency,
        toCurrency: request.toCurrency,
        fromAmount: request.amount,
        toAmount: netToAmount,
        exchangeRate: exchangeRate.rate,
        conversionFee,
        conversionType: request.conversionType || ConversionType.CURRENCY_TO_CURRENCY
      }
    });

    debitTransaction.relatedTransactionId = creditTransaction.transactionId;

    // Create conversion record
    const conversion = new CurrencyConversion({
      userId: account.userId,
      accountId: request.accountId,
      fromCurrency: request.fromCurrency,
      toCurrency: request.toCurrency,
      fromAmount: request.amount,
      toAmount: netToAmount,
      exchangeRate: exchangeRate.rate,
      conversionFee,
      conversionType: request.conversionType || ConversionType.CURRENCY_TO_CURRENCY,
      debitTransactionId: debitTransaction.transactionId,
      creditTransactionId: creditTransaction.transactionId,
      assetTokenDetails: request.assetTokenDetails
    });

    await debitTransaction.save();
    await creditTransaction.save();
    await conversion.save();

    try {
      // Update balances
      await account.updateBalance(request.fromCurrency, -request.amount, BalanceType.AVAILABLE);
      await account.updateBalance(request.toCurrency, netToAmount, BalanceType.AVAILABLE);
      
      // Set balances after transactions
      const fromBalance = account.getBalance(request.fromCurrency, BalanceType.AVAILABLE);
      const toBalance = account.getBalance(request.toCurrency, BalanceType.AVAILABLE);
      
      await debitTransaction.setBalanceAfter(fromBalance);
      await creditTransaction.setBalanceAfter(toBalance);
      
      // Complete transactions and conversion
      await debitTransaction.complete();
      await creditTransaction.complete();
      await conversion.updateStatus(TransactionStatus.COMPLETED);

      // Record in ledger
      await this.recordInLedger({
        userId: account.userId,
        accountId: request.accountId,
        transactionId: conversion.conversionId,
        type: 'currency_conversion',
        amount: request.amount,
        currency: request.fromCurrency,
        description: `Currency conversion: ${request.fromCurrency} to ${request.toCurrency}`,
        metadata: {
          fromAmount: request.amount,
          toAmount: netToAmount,
          exchangeRate: exchangeRate.rate,
          conversionFee
        }
      });

      // Send notification
      await this.sendNotification(account.userId, 'currency_converted', {
        fromAmount: request.amount,
        fromCurrency: request.fromCurrency,
        toAmount: netToAmount,
        toCurrency: request.toCurrency,
        conversionId: conversion.conversionId
      });

      return { conversion, debitTransaction, creditTransaction, account };
    } catch (error) {
      await debitTransaction.fail(error.message);
      await creditTransaction.fail(error.message);
      await conversion.fail(error.message);
      throw error;
    }
  }

  // ==================== ASSET TOKEN CONVERSION ====================

  async convertAssetTokenToFiat(request: IAssetTokenConversionRequest): Promise<{
    conversion: ICurrencyConversionDocument;
    transaction: ITransactionDocument;
    account: IAccountDocument;
  }> {
    const account = await this.getAccount(request.accountId);
    
    if (!account.isActive) {
      throw new AccountSuspendedError(request.accountId);
    }

    // Get token value from tokenization service
    const tokenValue = await this.getAssetTokenValue(request.assetId, request.tokenType, request.tokenAmount);
    const conversionFee = new Decimal(tokenValue.value).mul(0.002).toNumber(); // 0.2% fee for asset conversion
    const netAmount = new Decimal(tokenValue.value).minus(conversionFee).toNumber();

    // Create credit transaction
    const transaction = new Transaction({
      accountId: request.accountId,
      userId: account.userId,
      type: TransactionType.ASSET_TOKEN_CONVERSION,
      amount: netAmount,
      currency: request.targetCurrency,
      description: `Convert ${request.tokenAmount} ${request.tokenType} tokens to ${request.targetCurrency}`,
      status: TransactionStatus.PROCESSING,
      assetTokenDetails: {
        tokenType: request.tokenType,
        tokenAmount: request.tokenAmount,
        tokenValue: tokenValue.value,
        assetId: request.assetId
      }
    });

    // Create conversion record
    const conversion = new CurrencyConversion({
      userId: account.userId,
      accountId: request.accountId,
      fromCurrency: 'TOKEN' as SupportedCurrency, // Special case for tokens
      toCurrency: request.targetCurrency,
      fromAmount: request.tokenAmount,
      toAmount: netAmount,
      exchangeRate: tokenValue.value / request.tokenAmount,
      conversionFee,
      conversionType: ConversionType.ASSET_TOKEN_TO_CURRENCY,
      debitTransactionId: '', // No debit transaction for token conversion
      creditTransactionId: transaction.transactionId,
      assetTokenDetails: {
        tokenType: request.tokenType,
        tokenAmount: request.tokenAmount,
        assetId: request.assetId,
        tokenValue: tokenValue.value
      }
    });

    await transaction.save();
    await conversion.save();

    try {
      // Update account balance
      await account.updateBalance(request.targetCurrency, netAmount, BalanceType.AVAILABLE);
      
      // Set balance after transaction
      const newBalance = account.getBalance(request.targetCurrency, BalanceType.AVAILABLE);
      await transaction.setBalanceAfter(newBalance);
      
      // Complete transaction and conversion
      await transaction.complete();
      await conversion.updateStatus(TransactionStatus.COMPLETED);

      // Burn tokens in tokenization service
      await this.burnAssetTokens(request.assetId, request.tokenType, request.tokenAmount);

      // Record in ledger
      await this.recordInLedger({
        userId: account.userId,
        accountId: request.accountId,
        transactionId: conversion.conversionId,
        type: 'asset_token_conversion',
        amount: netAmount,
        currency: request.targetCurrency,
        description: `Asset token conversion: ${request.tokenType} to ${request.targetCurrency}`,
        metadata: {
          tokenType: request.tokenType,
          tokenAmount: request.tokenAmount,
          tokenValue: tokenValue.value,
          assetId: request.assetId
        }
      });

      // Send notification
      await this.sendNotification(account.userId, 'asset_token_converted', {
        tokenType: request.tokenType,
        tokenAmount: request.tokenAmount,
        fiatAmount: netAmount,
        currency: request.targetCurrency,
        conversionId: conversion.conversionId
      });

      return { conversion, transaction, account };
    } catch (error) {
      await transaction.fail(error.message);
      await conversion.fail(error.message);
      throw error;
    }
  }

  // ==================== CRYPTO PURCHASE CHARGING ====================

  async chargeFiatForCryptoPurchase(request: ICryptoChargeRequest): Promise<{
    transaction: ITransactionDocument;
    account: IAccountDocument;
  }> {
    const account = await this.getAccount(request.accountId);
    
    if (!account.isActive) {
      throw new AccountSuspendedError(request.accountId);
    }

    // Check balance
    if (!account.hasBalance(request.currency, request.amount)) {
      throw new InsufficientBalanceError(
        request.currency,
        request.amount,
        account.getBalance(request.currency)
      );
    }

    // Create crypto purchase transaction
    const transaction = new Transaction({
      accountId: request.accountId,
      userId: account.userId,
      type: TransactionType.CRYPTO_PURCHASE,
      amount: request.amount,
      currency: request.currency,
      description: request.description || `Purchase ${request.cryptoAmount} ${request.cryptoCurrency}`,
      paymentId: request.paymentId,
      status: TransactionStatus.PROCESSING,
      metadata: {
        cryptoAmount: request.cryptoAmount,
        cryptoCurrency: request.cryptoCurrency,
        paymentId: request.paymentId
      }
    });

    await transaction.save();

    try {
      // Update account balance
      await account.updateBalance(request.currency, -request.amount, BalanceType.AVAILABLE);
      
      // Set balance after transaction
      const newBalance = account.getBalance(request.currency, BalanceType.AVAILABLE);
      await transaction.setBalanceAfter(newBalance);
      
      // Complete transaction
      await transaction.complete();

      // Record in ledger
      await this.recordInLedger({
        userId: account.userId,
        accountId: request.accountId,
        transactionId: transaction.transactionId,
        type: 'crypto_purchase',
        amount: -request.amount,
        currency: request.currency,
        description: transaction.description,
        metadata: {
          cryptoAmount: request.cryptoAmount,
          cryptoCurrency: request.cryptoCurrency,
          paymentId: request.paymentId
        }
      });

      // Send notification
      await this.sendNotification(account.userId, 'crypto_purchase_charged', {
        fiatAmount: request.amount,
        fiatCurrency: request.currency,
        cryptoAmount: request.cryptoAmount,
        cryptoCurrency: request.cryptoCurrency,
        transactionId: transaction.transactionId
      });

      return { transaction, account };
    } catch (error) {
      await transaction.fail(error.message);
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  private async getExchangeRate(fromCurrency: SupportedCurrency, toCurrency: SupportedCurrency): Promise<{ rate: number; timestamp: Date }> {
    try {
      const response = await axios.get(`${this.currencyServiceUrl}/api/v1/rates/${fromCurrency}/${toCurrency}`);
      return {
        rate: response.data.rate,
        timestamp: new Date(response.data.timestamp)
      };
    } catch (error) {
      throw new ConversionFailedError(`Failed to get exchange rate: ${error.message}`);
    }
  }

  private async getAssetTokenValue(assetId: string, tokenType: string, tokenAmount: number): Promise<{ value: number; currency: string }> {
    try {
      const response = await axios.get(`${this.tokenizationServiceUrl}/api/v1/tokens/${assetId}/value`, {
        params: { tokenType, amount: tokenAmount }
      });
      return response.data;
    } catch (error) {
      throw new ConversionFailedError(`Failed to get asset token value: ${error.message}`);
    }
  }

  private async burnAssetTokens(assetId: string, tokenType: string, amount: number): Promise<void> {
    try {
      await axios.post(`${this.tokenizationServiceUrl}/api/v1/tokens/${assetId}/burn`, {
        tokenType,
        amount
      });
    } catch (error) {
      throw new ConversionFailedError(`Failed to burn asset tokens: ${error.message}`);
    }
  }

  private async recordInLedger(data: any): Promise<void> {
    try {
      await axios.post(`${this.ledgerServiceUrl}/api/v1/journal-entries`, data);
    } catch (error) {
      console.error('Failed to record in ledger:', error.message);
      // Don't throw error as this is for audit purposes
    }
  }

  private async sendNotification(userId: string, type: string, data: any): Promise<void> {
    try {
      await axios.post(`${this.notificationServiceUrl}/api/v1/notifications`, {
        userId,
        type,
        data
      });
    } catch (error) {
      console.error('Failed to send notification:', error.message);
      // Don't throw error as this is not critical
    }
  }

  // ==================== ANALYTICS ====================

  async getAccountAnalytics(startDate?: Date, endDate?: Date): Promise<any> {
    return await Account.getAccountAnalytics(startDate, endDate);
  }

  async getTransactionAnalytics(accountId?: string, userId?: string, startDate?: Date, endDate?: Date): Promise<any> {
    return await Transaction.getTransactionAnalytics(startDate, endDate, accountId, userId);
  }

  async getConversionAnalytics(accountId?: string, userId?: string, startDate?: Date, endDate?: Date): Promise<any> {
    return await CurrencyConversion.getConversionAnalytics(startDate, endDate, userId, accountId);
  }
}

