import { Router } from 'express';
import { LedgerController } from '../controllers/LedgerController';
import { EventBus } from '../../shared/events/event-bus';

// Initialize EventBus (this would be injected in a real application)
const eventBus = new EventBus();

// Initialize controller
const ledgerController = new LedgerController(eventBus);

const router = Router();

// ==================== ACCOUNT ROUTES ====================

/**
 * @route   POST /api/accounts
 * @desc    Create a new account
 * @access  Private
 */
router.post('/accounts', ledgerController.createAccount);

/**
 * @route   GET /api/accounts/:accountId
 * @desc    Get account details
 * @access  Private
 */
router.get('/accounts/:accountId', ledgerController.getAccount);

/**
 * @route   GET /api/accounts/:accountId/balance
 * @desc    Get account balance
 * @access  Private
 */
router.get('/accounts/:accountId/balance', ledgerController.getAccountBalance);

/**
 * @route   GET /api/accounts/user/:userId
 * @desc    Get all accounts for a user
 * @access  Private
 */
router.get('/accounts/user/:userId', ledgerController.getUserAccounts);

/**
 * @route   PUT /api/accounts/:accountId/status
 * @desc    Update account status
 * @access  Private (Admin)
 */
router.put('/accounts/:accountId/status', ledgerController.updateAccountStatus);

// ==================== TRANSACTION ROUTES ====================

/**
 * @route   POST /api/transactions
 * @desc    Process a new transaction
 * @access  Private
 */
router.post('/transactions', ledgerController.processTransaction);

/**
 * @route   GET /api/transactions/:transactionId
 * @desc    Get transaction details
 * @access  Private
 */
router.get('/transactions/:transactionId', ledgerController.getTransaction);

/**
 * @route   GET /api/transactions/user/:userId
 * @desc    Get transactions for a user
 * @access  Private
 */
router.get('/transactions/user/:userId', ledgerController.getUserTransactions);

/**
 * @route   GET /api/transactions/account/:accountId
 * @desc    Get transactions for an account
 * @access  Private
 */
router.get('/transactions/account/:accountId', ledgerController.getAccountTransactions);

// ==================== JOURNAL ENTRY ROUTES ====================

/**
 * @route   POST /api/journal-entries
 * @desc    Create a new journal entry
 * @access  Private (Admin)
 */
router.post('/journal-entries', ledgerController.createJournalEntry);

/**
 * @route   GET /api/journal-entries/:journalEntryId
 * @desc    Get journal entry details
 * @access  Private
 */
router.get('/journal-entries/:journalEntryId', ledgerController.getJournalEntry);

/**
 * @route   POST /api/journal-entries/:journalEntryId/post
 * @desc    Post a journal entry
 * @access  Private (Admin)
 */
router.post('/journal-entries/:journalEntryId/post', ledgerController.postJournalEntry);

// ==================== SWIFTPAYME INTEGRATION ROUTES ====================

/**
 * @route   POST /api/integrations/asset-deposit
 * @desc    Process asset deposit
 * @access  Private (System)
 */
router.post('/integrations/asset-deposit', ledgerController.processAssetDeposit);

/**
 * @route   POST /api/integrations/bitcoin-purchase
 * @desc    Process Bitcoin purchase
 * @access  Private (System)
 */
router.post('/integrations/bitcoin-purchase', ledgerController.processBitcoinPurchase);

// ==================== REPORTING ROUTES ====================

/**
 * @route   GET /api/reports/trial-balance
 * @desc    Get trial balance report
 * @access  Private (Admin)
 */
router.get('/reports/trial-balance', ledgerController.getTrialBalance);

// ==================== HEALTH CHECK ====================

/**
 * @route   GET /api/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', ledgerController.healthCheck);

export default router;

