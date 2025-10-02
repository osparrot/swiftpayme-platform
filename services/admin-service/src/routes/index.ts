import express from 'express';
import { AdminController } from '../controllers/AdminController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { validationMiddleware } from '../middleware/validation';
import { 
  createUserSchema, 
  updateUserSchema, 
  approveAssetSchema, 
  rejectAssetSchema, 
  updateSystemConfigSchema 
} from '../schemas/adminSchemas';

const router = express.Router();
const adminController = new AdminController();

// ==================== USER MANAGEMENT ====================

// Get all users
router.get('/users', authMiddleware, adminMiddleware, adminController.getUsers.bind(adminController));

// Get user by ID
router.get('/users/:userId', authMiddleware, adminMiddleware, adminController.getUser.bind(adminController));

// Create user
router.post('/users', authMiddleware, adminMiddleware, validationMiddleware(createUserSchema), adminController.createUser.bind(adminController));

// Update user
router.put('/users/:userId', authMiddleware, adminMiddleware, validationMiddleware(updateUserSchema), adminController.updateUser.bind(adminController));

// Delete user
router.delete('/users/:userId', authMiddleware, adminMiddleware, adminController.deleteUser.bind(adminController));

// ==================== ASSET MANAGEMENT ====================

// Get all assets
router.get('/assets', authMiddleware, adminMiddleware, adminController.getAssets.bind(adminController));

// Get asset by ID
router.get('/assets/:assetId', authMiddleware, adminMiddleware, adminController.getAsset.bind(adminController));

// Approve asset
router.post('/assets/:assetId/approve', authMiddleware, adminMiddleware, validationMiddleware(approveAssetSchema), adminController.approveAsset.bind(adminController));

// Reject asset
router.post('/assets/:assetId/reject', authMiddleware, adminMiddleware, validationMiddleware(rejectAssetSchema), adminController.rejectAsset.bind(adminController));

// ==================== TRANSACTION MONITORING ====================

// Get all transactions
router.get('/transactions', authMiddleware, adminMiddleware, adminController.getTransactions.bind(adminController));

// Get transaction by ID
router.get('/transactions/:transactionId', authMiddleware, adminMiddleware, adminController.getTransaction.bind(adminController));

// Flag transaction
router.post('/transactions/:transactionId/flag', authMiddleware, adminMiddleware, adminController.flagTransaction.bind(adminController));

// ==================== SYSTEM CONFIGURATION ====================

// Get system configuration
router.get('/system/config', authMiddleware, adminMiddleware, adminController.getSystemConfig.bind(adminController));

// Update system configuration
router.put('/system/config', authMiddleware, adminMiddleware, validationMiddleware(updateSystemConfigSchema), adminController.updateSystemConfig.bind(adminController));

// ==================== DASHBOARD ====================

// Get dashboard stats
router.get('/dashboard/stats', authMiddleware, adminMiddleware, adminController.getDashboardStats.bind(adminController));

export default router;
