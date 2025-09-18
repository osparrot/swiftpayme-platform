import { Decimal } from 'decimal.js';
import mongoose from 'mongoose';
import { 
  Account, 
  Transaction, 
  JournalEntry, 
  AuditLog 
} from '../models';
import {
  AccountType,
  AccountCategory,
  AccountStatus,
  TransactionType,
  TransactionStatus,
  JournalEntryStatus,
  EntryType,
  DebitCredit,
  BalanceType,
  CurrencyType,
  AuditEventType,
  AuditSeverity,
  LedgerErrorCode
} from '../enums/ledgerEnums';
import {
  IAccount,
  ITransaction,
  IJournalEntry,
  IJournalLine,
  CreateAccountRequest,
  CreateTransactionRequest,
  CreateJournalEntryRequest,
  BalanceInquiryRequest,
  BalanceInquiryResponse,
  ServiceResponse
} from '../types';
import { Logger } from '../utils/Logger';
import { EventBus } from '../../shared/events/event-bus';

export class LedgerService {
  private logger: Logger;
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.logger = new Logger('LedgerService');
    this.eventBus = eventBus;
  }

  // ==================== ACCOUNT MANAGEMENT ====================

  /**
   * Create a new account in the ledger
   */
  async createAccount(request: CreateAccountRequest, createdBy: string): Promise<ServiceResponse<IAccount>> {
    try {
      this.logger.info('Creating new account', { request, createdBy });

      // Validate request
      const validation = this.validateCreateAccountRequest(request);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: LedgerErrorCode.VALIDATION_ERROR,
            message: 'Invalid account creation request',
            details: validation.errors
          },
          timestamp: new Date().toISOString()
        };
      }

      // Generate account ID and number
      const accountId = this.generateAccountId();
      const accountNumber = Account.generateAccountNumber(request.accountType, request.currency);

      // Create account
      const account = new Account({
        accountId,
        accountNumber,
        accountName: request.accountName,
        accountType: request.accountType,
        accountCategory: request.accountCategory,
        parentAccountId: request.parentAccountId,
        userId: request.userId,
        entityId: request.entityId,
        currency: request.currency.toUpperCase(),
        currencyType: this.determineCurrencyType(request.currency),
        description: request.description,
        allowNegativeBalance: request.allowNegativeBalance || false,
        creditLimit: request.creditLimit ? new Decimal(request.creditLimit) : undefined,
        minimumBalance: request.minimumBalance ? new Decimal(request.minimumBalance) : undefined,
        maximumBalance: request.maximumBalance ? new Decimal(request.maximumBalance) : undefined,
        metadata: request.metadata || {},
        createdBy,
        lastModifiedBy: createdBy
      });

      const savedAccount = await account.save();

      // Create audit log
      await this.createAuditLog({
        eventType: AuditEventType.ACCOUNT_CREATED,
        severity: AuditSeverity.MEDIUM,
        description: `Account created: ${savedAccount.accountName} (${savedAccount.accountNumber})`,
        entityType: 'Account',
        entityId: savedAccount.accountId,
        userId: request.userId,
        newValues: savedAccount.toObject(),
        metadata: {
          accountType: savedAccount.accountType,
          currency: savedAccount.currency,
          createdBy
        }
      });

      // Emit event for other services
      await this.eventBus.publish('account.created', {
        accountId: savedAccount.accountId,
        accountNumber: savedAccount.accountNumber,
        accountType: savedAccount.accountType,
        currency: savedAccount.currency,
        userId: savedAccount.userId,
        entityId: savedAccount.entityId,
        timestamp: new Date().toISOString()
      });

      this.logger.info('Account created successfully', { accountId: savedAccount.accountId });

      return {
        success: true,
        data: savedAccount,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Error creating account', { error: error.message, request });
      return {
        success: false,
        error: {
          code: 'ACCOUNT_CREATION_FAILED',
          message: error.message
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get account balance information
   */
  async getAccountBalance(request: BalanceInquiryRequest): Promise<ServiceResponse<BalanceInquiryResponse>> {
    try {
      this.logger.info('Getting account balance', { request });

      const account = await Account.findOne({ accountId: request.accountId });
      if (!account) {
        return {
          success: false,
          error: {
            code: LedgerErrorCode.ACCOUNT_NOT_FOUND,
            message: 'Account not found'
          },
          timestamp: new Date().toISOString()
        };
      }

      const response: BalanceInquiryResponse = {
        accountId: account.accountId,
        accountName: account.accountName,
        currency: account.currency,
        balances: {
          current: account.currentBalance.toString(),
          available: account.availableBalance.toString(),
          pending: account.pendingBalance.toString(),
          reserved: account.reservedBalance.toString(),
          frozen: account.frozenBalance.toString(),
          escrow: account.escrowBalance.toString()
        },
        asOfDate: request.asOfDate || new Date()
      };

      return {
        success: true,
        data: response,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Error getting account balance', { error: error.message, request });
      return {
        success: false,
        error: {
          code: 'BALANCE_INQUIRY_FAILED',
          message: error.message
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  // ==================== TRANSACTION PROCESSING ====================

  /**
   * Process a transaction (creates transaction and journal entry)
   */
  async processTransaction(request: CreateTransactionRequest, createdBy: string): Promise<ServiceResponse<ITransaction>> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      this.logger.info('Processing transaction', { request, createdBy });

      // Validate transaction request
      const validation = this.validateTransactionRequest(request);
      if (!validation.isValid) {
        await session.abortTransaction();
        return {
          success: false,
          error: {
            code: LedgerErrorCode.VALIDATION_ERROR,
            message: 'Invalid transaction request',
            details: validation.errors
          },
          timestamp: new Date().toISOString()
        };
      }

      // Create transaction
      const transactionId = this.generateTransactionId(request.transactionType, request.currency);
      const transaction = new Transaction({
        transactionId,
        transactionType: request.transactionType,
        amount: new Decimal(request.amount),
        currency: request.currency.toUpperCase(),
        currencyType: this.determineCurrencyType(request.currency),
        fromAccountId: request.fromAccountId,
        toAccountId: request.toAccountId,
        description: request.description,
        businessTransactionId: request.businessTransactionId,
        userId: request.userId,
        entityId: request.entityId,
        transactionDate: request.transactionDate || new Date(),
        valueDate: request.valueDate || new Date(),
        notes: request.notes,
        metadata: request.metadata || {},
        createdBy,
        lastModifiedBy: createdBy
      });

      const savedTransaction = await transaction.save({ session });

      // Create corresponding journal entry
      const journalEntry = await this.createJournalEntryForTransaction(savedTransaction, createdBy, session);

      // Update account balances
      await this.updateAccountBalancesForTransaction(savedTransaction, session);

      // Mark transaction as completed
      savedTransaction.status = TransactionStatus.COMPLETED;
      savedTransaction.processedAt = new Date();
      await savedTransaction.save({ session });

      await session.commitTransaction();

      // Create audit log
      await this.createAuditLog({
        eventType: AuditEventType.TRANSACTION_CREATED,
        severity: AuditSeverity.MEDIUM,
        description: `Transaction processed: ${savedTransaction.transactionType} ${savedTransaction.amount} ${savedTransaction.currency}`,
        entityType: 'Transaction',
        entityId: savedTransaction.transactionId,
        userId: savedTransaction.userId,
        newValues: savedTransaction.toObject(),
        metadata: {
          transactionType: savedTransaction.transactionType,
          amount: savedTransaction.amount.toString(),
          currency: savedTransaction.currency,
          journalEntryId: journalEntry.journalEntryId
        }
      });

      // Emit event
      await this.eventBus.publish('transaction.processed', {
        transactionId: savedTransaction.transactionId,
        transactionType: savedTransaction.transactionType,
        amount: savedTransaction.amount.toString(),
        currency: savedTransaction.currency,
        fromAccountId: savedTransaction.fromAccountId,
        toAccountId: savedTransaction.toAccountId,
        status: savedTransaction.status,
        userId: savedTransaction.userId,
        timestamp: new Date().toISOString()
      });

      this.logger.info('Transaction processed successfully', { transactionId: savedTransaction.transactionId });

      return {
        success: true,
        data: savedTransaction,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Error processing transaction', { error: error.message, request });
      return {
        success: false,
        error: {
          code: 'TRANSACTION_PROCESSING_FAILED',
          message: error.message
        },
        timestamp: new Date().toISOString()
      };
    } finally {
      await session.endSession();
    }
  }

  // ==================== JOURNAL ENTRY MANAGEMENT ====================

  /**
   * Create a manual journal entry
   */
  async createJournalEntry(request: CreateJournalEntryRequest, createdBy: string): Promise<ServiceResponse<IJournalEntry>> {
    try {
      this.logger.info('Creating journal entry', { request, createdBy });

      // Validate journal entry
      const validation = this.validateJournalEntryRequest(request);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: LedgerErrorCode.VALIDATION_ERROR,
            message: 'Invalid journal entry request',
            details: validation.errors
          },
          timestamp: new Date().toISOString()
        };
      }

      // Generate journal entry ID
      const journalEntryId = this.generateJournalEntryId();
      const period = this.getCurrentPeriod();

      // Create journal lines
      const journalLines: IJournalLine[] = request.journalLines.map((line, index) => ({
        lineId: `${journalEntryId}-${index + 1}`,
        accountId: line.accountId,
        debitCredit: line.debitCredit,
        amount: new Decimal(line.amount),
        currency: line.currency.toUpperCase(),
        description: line.description,
        reference: line.reference,
        costCenter: line.costCenter,
        department: line.department,
        project: line.project,
        metadata: line.metadata || {}
      }));

      // Create journal entry
      const journalEntry = new JournalEntry({
        journalEntryId,
        entryType: request.entryType,
        description: request.description,
        reference: request.reference,
        entryDate: request.entryDate || new Date(),
        period,
        businessTransactionId: request.businessTransactionId,
        userId: request.userId,
        entityId: request.entityId,
        journalLines,
        notes: request.notes,
        metadata: request.metadata || {},
        createdBy,
        lastModifiedBy: createdBy
      });

      // Calculate totals and validate balance
      journalEntry.calculateTotals();
      
      if (!journalEntry.isBalanced()) {
        return {
          success: false,
          error: {
            code: LedgerErrorCode.UNBALANCED_JOURNAL_ENTRY,
            message: `Journal entry is not balanced. Debits: ${journalEntry.totalDebits}, Credits: ${journalEntry.totalCredits}`
          },
          timestamp: new Date().toISOString()
        };
      }

      const savedJournalEntry = await journalEntry.save();

      // Auto-post if it doesn't require approval
      if (!savedJournalEntry.requiresApproval) {
        await savedJournalEntry.post();
      }

      // Create audit log
      await this.createAuditLog({
        eventType: AuditEventType.JOURNAL_ENTRY_POSTED,
        severity: AuditSeverity.MEDIUM,
        description: `Journal entry created: ${savedJournalEntry.description}`,
        entityType: 'JournalEntry',
        entityId: savedJournalEntry.journalEntryId,
        userId: savedJournalEntry.userId,
        newValues: savedJournalEntry.toObject(),
        metadata: {
          entryType: savedJournalEntry.entryType,
          totalAmount: savedJournalEntry.totalDebits.toString(),
          accountsAffected: savedJournalEntry.journalLines.map(line => line.accountId)
        }
      });

      this.logger.info('Journal entry created successfully', { journalEntryId: savedJournalEntry.journalEntryId });

      return {
        success: true,
        data: savedJournalEntry,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Error creating journal entry', { error: error.message, request });
      return {
        success: false,
        error: {
          code: 'JOURNAL_ENTRY_CREATION_FAILED',
          message: error.message
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  // ==================== SWIFTPAYME INTEGRATION METHODS ====================

  /**
   * Process asset deposit (creates accounts and journal entries)
   */
  async processAssetDeposit(
    userId: string,
    assetDepositId: string,
    assetType: string,
    amount: string,
    currency: string,
    createdBy: string
  ): Promise<ServiceResponse<any>> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      this.logger.info('Processing asset deposit', { userId, assetDepositId, assetType, amount, currency });

      // Create or get user's asset account
      let assetAccount = await Account.findOne({
        userId,
        accountType: AccountType.ASSET,
        accountCategory: AccountCategory.PRECIOUS_METALS,
        currency: currency.toUpperCase()
      });

      if (!assetAccount) {
        const createAccountRequest: CreateAccountRequest = {
          accountName: `${assetType} Asset Account`,
          accountType: AccountType.ASSET,
          accountCategory: AccountCategory.PRECIOUS_METALS,
          currency: currency.toUpperCase(),
          userId,
          description: `Physical ${assetType} asset account`,
          metadata: { assetType }
        };

        const accountResult = await this.createAccount(createAccountRequest, createdBy);
        if (!accountResult.success) {
          await session.abortTransaction();
          return accountResult;
        }
        assetAccount = accountResult.data!;
      }

      // Create or get user's fiat account
      let fiatAccount = await Account.findOne({
        userId,
        accountType: AccountType.USER_WALLET,
        currency: 'USD' // Base fiat currency
      });

      if (!fiatAccount) {
        const createFiatAccountRequest: CreateAccountRequest = {
          accountName: 'USD Wallet',
          accountType: AccountType.USER_WALLET,
          accountCategory: AccountCategory.CASH_AND_EQUIVALENTS,
          currency: 'USD',
          userId,
          description: 'User USD wallet account'
        };

        const fiatAccountResult = await this.createAccount(createFiatAccountRequest, createdBy);
        if (!fiatAccountResult.success) {
          await session.abortTransaction();
          return fiatAccountResult;
        }
        fiatAccount = fiatAccountResult.data!;
      }

      // Create journal entry for asset deposit
      const journalEntryRequest: CreateJournalEntryRequest = {
        entryType: EntryType.STANDARD,
        description: `Asset deposit: ${amount} ${currency} ${assetType}`,
        businessTransactionId: assetDepositId,
        userId,
        journalLines: [
          {
            accountId: assetAccount.accountId,
            debitCredit: DebitCredit.DEBIT,
            amount,
            currency: currency.toUpperCase(),
            description: `${assetType} deposit`,
            metadata: { assetDepositId, assetType }
          },
          {
            accountId: fiatAccount.accountId,
            debitCredit: DebitCredit.CREDIT,
            amount,
            currency: 'USD',
            description: `Fiat credit for ${assetType} deposit`,
            metadata: { assetDepositId, assetType }
          }
        ],
        metadata: { assetDepositId, assetType }
      };

      const journalResult = await this.createJournalEntry(journalEntryRequest, createdBy);
      if (!journalResult.success) {
        await session.abortTransaction();
        return journalResult;
      }

      await session.commitTransaction();

      this.logger.info('Asset deposit processed successfully', { assetDepositId });

      return {
        success: true,
        data: {
          assetAccount: assetAccount.accountId,
          fiatAccount: fiatAccount.accountId,
          journalEntry: journalResult.data!.journalEntryId
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Error processing asset deposit', { error: error.message });
      return {
        success: false,
        error: {
          code: 'ASSET_DEPOSIT_PROCESSING_FAILED',
          message: error.message
        },
        timestamp: new Date().toISOString()
      };
    } finally {
      await session.endSession();
    }
  }

  /**
   * Process Bitcoin purchase (creates journal entries)
   */
  async processBitcoinPurchase(
    userId: string,
    amount: string,
    bitcoinAmount: string,
    exchangeRate: string,
    createdBy: string
  ): Promise<ServiceResponse<any>> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      this.logger.info('Processing Bitcoin purchase', { userId, amount, bitcoinAmount, exchangeRate });

      // Get user's USD account
      const usdAccount = await Account.findOne({
        userId,
        accountType: AccountType.USER_WALLET,
        currency: 'USD'
      });

      if (!usdAccount) {
        await session.abortTransaction();
        return {
          success: false,
          error: {
            code: LedgerErrorCode.ACCOUNT_NOT_FOUND,
            message: 'User USD account not found'
          },
          timestamp: new Date().toISOString()
        };
      }

      // Create or get user's Bitcoin account
      let btcAccount = await Account.findOne({
        userId,
        accountType: AccountType.CRYPTO_ASSETS,
        currency: 'BTC'
      });

      if (!btcAccount) {
        const createBtcAccountRequest: CreateAccountRequest = {
          accountName: 'Bitcoin Wallet',
          accountType: AccountType.CRYPTO_ASSETS,
          accountCategory: AccountCategory.CRYPTO_ASSETS,
          currency: 'BTC',
          userId,
          description: 'User Bitcoin wallet account'
        };

        const btcAccountResult = await this.createAccount(createBtcAccountRequest, createdBy);
        if (!btcAccountResult.success) {
          await session.abortTransaction();
          return btcAccountResult;
        }
        btcAccount = btcAccountResult.data!;
      }

      // Create journal entry for Bitcoin purchase
      const journalEntryRequest: CreateJournalEntryRequest = {
        entryType: EntryType.STANDARD,
        description: `Bitcoin purchase: ${bitcoinAmount} BTC for ${amount} USD`,
        userId,
        journalLines: [
          {
            accountId: btcAccount.accountId,
            debitCredit: DebitCredit.DEBIT,
            amount: bitcoinAmount,
            currency: 'BTC',
            description: 'Bitcoin purchase',
            metadata: { exchangeRate }
          },
          {
            accountId: usdAccount.accountId,
            debitCredit: DebitCredit.CREDIT,
            amount,
            currency: 'USD',
            description: 'USD payment for Bitcoin',
            metadata: { exchangeRate }
          }
        ],
        metadata: { exchangeRate, bitcoinAmount }
      };

      const journalResult = await this.createJournalEntry(journalEntryRequest, createdBy);
      if (!journalResult.success) {
        await session.abortTransaction();
        return journalResult;
      }

      await session.commitTransaction();

      this.logger.info('Bitcoin purchase processed successfully');

      return {
        success: true,
        data: {
          usdAccount: usdAccount.accountId,
          btcAccount: btcAccount.accountId,
          journalEntry: journalResult.data!.journalEntryId
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Error processing Bitcoin purchase', { error: error.message });
      return {
        success: false,
        error: {
          code: 'BITCOIN_PURCHASE_PROCESSING_FAILED',
          message: error.message
        },
        timestamp: new Date().toISOString()
      };
    } finally {
      await session.endSession();
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private async createJournalEntryForTransaction(
    transaction: ITransaction,
    createdBy: string,
    session: any
  ): Promise<IJournalEntry> {
    const journalEntryId = this.generateJournalEntryId();
    const period = this.getCurrentPeriod();

    const journalLines: IJournalLine[] = [];

    // Create journal lines based on transaction type
    if (transaction.transactionType === TransactionType.TRANSFER && 
        transaction.fromAccountId && transaction.toAccountId) {
      
      journalLines.push({
        lineId: `${journalEntryId}-1`,
        accountId: transaction.toAccountId,
        debitCredit: DebitCredit.DEBIT,
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        metadata: { transactionId: transaction.transactionId }
      });

      journalLines.push({
        lineId: `${journalEntryId}-2`,
        accountId: transaction.fromAccountId,
        debitCredit: DebitCredit.CREDIT,
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        metadata: { transactionId: transaction.transactionId }
      });
    }

    const journalEntry = new JournalEntry({
      journalEntryId,
      entryType: EntryType.STANDARD,
      description: `Auto-generated for transaction: ${transaction.description}`,
      reference: transaction.transactionId,
      period,
      businessTransactionId: transaction.businessTransactionId,
      userId: transaction.userId,
      entityId: transaction.entityId,
      journalLines,
      createdBy,
      lastModifiedBy: createdBy,
      integrationData: {
        transactionId: transaction.transactionId
      }
    });

    journalEntry.calculateTotals();
    return await journalEntry.save({ session });
  }

  private async updateAccountBalancesForTransaction(
    transaction: ITransaction,
    session: any
  ): Promise<void> {
    if (transaction.fromAccountId) {
      const fromAccount = await Account.findOne({ accountId: transaction.fromAccountId }).session(session);
      if (fromAccount) {
        await fromAccount.updateBalance(
          transaction.amount,
          BalanceType.CURRENT,
          'subtract',
          transaction.transactionId,
          undefined,
          `Transaction: ${transaction.description}`,
          'system'
        );
      }
    }

    if (transaction.toAccountId) {
      const toAccount = await Account.findOne({ accountId: transaction.toAccountId }).session(session);
      if (toAccount) {
        await toAccount.updateBalance(
          transaction.amount,
          BalanceType.CURRENT,
          'add',
          transaction.transactionId,
          undefined,
          `Transaction: ${transaction.description}`,
          'system'
        );
      }
    }
  }

  private async createAuditLog(auditData: any): Promise<void> {
    try {
      const auditLog = new AuditLog({
        ...auditData,
        timestamp: new Date(),
        metadata: {
          ...auditData.metadata,
          service: 'ledger-service',
          version: '1.0.0'
        }
      });

      await auditLog.save();
    } catch (error) {
      this.logger.error('Error creating audit log', { error: error.message, auditData });
    }
  }

  // ==================== VALIDATION METHODS ====================

  private validateCreateAccountRequest(request: CreateAccountRequest): { isValid: boolean; errors: any[] } {
    const errors = [];

    if (!request.accountName || request.accountName.trim().length === 0) {
      errors.push({ field: 'accountName', message: 'Account name is required' });
    }

    if (!Object.values(AccountType).includes(request.accountType)) {
      errors.push({ field: 'accountType', message: 'Invalid account type' });
    }

    if (!Object.values(AccountCategory).includes(request.accountCategory)) {
      errors.push({ field: 'accountCategory', message: 'Invalid account category' });
    }

    if (!request.currency || !/^[A-Z]{3,10}$/.test(request.currency)) {
      errors.push({ field: 'currency', message: 'Invalid currency code' });
    }

    return { isValid: errors.length === 0, errors };
  }

  private validateTransactionRequest(request: CreateTransactionRequest): { isValid: boolean; errors: any[] } {
    const errors = [];

    if (!Object.values(TransactionType).includes(request.transactionType)) {
      errors.push({ field: 'transactionType', message: 'Invalid transaction type' });
    }

    if (!request.amount || new Decimal(request.amount).lessThanOrEqualTo(0)) {
      errors.push({ field: 'amount', message: 'Amount must be positive' });
    }

    if (!request.currency || !/^[A-Z]{3,10}$/.test(request.currency)) {
      errors.push({ field: 'currency', message: 'Invalid currency code' });
    }

    if (!request.description || request.description.trim().length === 0) {
      errors.push({ field: 'description', message: 'Description is required' });
    }

    if (request.transactionType === TransactionType.TRANSFER) {
      if (!request.fromAccountId) {
        errors.push({ field: 'fromAccountId', message: 'From account is required for transfers' });
      }
      if (!request.toAccountId) {
        errors.push({ field: 'toAccountId', message: 'To account is required for transfers' });
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  private validateJournalEntryRequest(request: CreateJournalEntryRequest): { isValid: boolean; errors: any[] } {
    const errors = [];

    if (!Object.values(EntryType).includes(request.entryType)) {
      errors.push({ field: 'entryType', message: 'Invalid entry type' });
    }

    if (!request.description || request.description.trim().length === 0) {
      errors.push({ field: 'description', message: 'Description is required' });
    }

    if (!request.journalLines || request.journalLines.length < 2) {
      errors.push({ field: 'journalLines', message: 'At least 2 journal lines are required' });
    }

    // Validate journal lines
    if (request.journalLines) {
      let totalDebits = new Decimal(0);
      let totalCredits = new Decimal(0);

      request.journalLines.forEach((line, index) => {
        if (!line.accountId) {
          errors.push({ field: `journalLines[${index}].accountId`, message: 'Account ID is required' });
        }

        if (!Object.values(DebitCredit).includes(line.debitCredit)) {
          errors.push({ field: `journalLines[${index}].debitCredit`, message: 'Invalid debit/credit indicator' });
        }

        if (!line.amount || new Decimal(line.amount).lessThanOrEqualTo(0)) {
          errors.push({ field: `journalLines[${index}].amount`, message: 'Amount must be positive' });
        } else {
          if (line.debitCredit === DebitCredit.DEBIT) {
            totalDebits = totalDebits.add(new Decimal(line.amount));
          } else {
            totalCredits = totalCredits.add(new Decimal(line.amount));
          }
        }

        if (!line.currency || !/^[A-Z]{3,10}$/.test(line.currency)) {
          errors.push({ field: `journalLines[${index}].currency`, message: 'Invalid currency code' });
        }
      });

      // Check if debits equal credits
      if (!totalDebits.equals(totalCredits)) {
        errors.push({ 
          field: 'journalLines', 
          message: `Journal entry is not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}` 
        });
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  // ==================== UTILITY METHODS ====================

  private generateAccountId(): string {
    return `ACC-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  }

  private generateTransactionId(transactionType: TransactionType, currency: string): string {
    const typePrefix = transactionType.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${typePrefix}-${currency}-${timestamp}-${random}`;
  }

  private generateJournalEntryId(): string {
    return `JE-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }

  private determineCurrencyType(currency: string): CurrencyType {
    const cryptoCurrencies = ['BTC', 'ETH', 'LTC', 'BCH', 'XRP'];
    const commodityCurrencies = ['XAU', 'XAG', 'XPT', 'XPD'];
    
    if (cryptoCurrencies.includes(currency.toUpperCase())) {
      return CurrencyType.CRYPTO;
    } else if (commodityCurrencies.includes(currency.toUpperCase())) {
      return CurrencyType.COMMODITY;
    } else {
      return CurrencyType.FIAT;
    }
  }
}

