/**
 * SwiftPayMe Admin Service - AssetApprovalController
 * Comprehensive controller for asset verification and approval operations
 */

import { Request, Response } from 'express';
import AssetApproval, { ApprovalStatus, VerificationMethod, RiskLevel } from '../../models/asset/AssetApproval';
import { Logger } from '../../utils/Logger';
import { validateRequest } from '../../utils/validation';
import { sendNotification } from '../../services/NotificationService';

export class AssetApprovalController {
  
  // ==================== GET OPERATIONS ====================
  
  /**
   * Get all pending asset approvals
   */
  getPendingApprovals = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page = 1, limit = 20, priority, assetType, assignedTo } = req.query;
      
      const filter: any = {
        status: { $in: [ApprovalStatus.PENDING, ApprovalStatus.UNDER_REVIEW] }
      };
      
      if (priority) filter.priority = priority;
      if (assetType) filter.assetType = assetType;
      if (assignedTo) filter.assignedTo = assignedTo;
      
      const approvals = await AssetApproval.find(filter)
        .sort({ priority: -1, submittedAt: 1 })
        .limit(Number(limit) * Number(page))
        .skip((Number(page) - 1) * Number(limit))
        .populate('userId', 'firstName lastName email')
        .lean();
      
      const total = await AssetApproval.countDocuments(filter);
      
      Logger.info(`Retrieved ${approvals.length} pending approvals`, {
        adminId: (req as any).user?.adminId,
        filter,
        total
      });
      
      res.status(200).json({
        success: true,
        data: {
          approvals,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error) {
      Logger.error('Error retrieving pending approvals:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve pending approvals'
      });
    }
  };

  /**
   * Get approval by ID
   */
  getApprovalById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { approvalId } = req.params;
      
      const approval = await AssetApproval.findOne({ approvalId })
        .populate('userId', 'firstName lastName email phoneNumber')
        .lean();
      
      if (!approval) {
        res.status(404).json({
          success: false,
          error: 'Asset approval not found'
        });
        return;
      }
      
      Logger.info(`Retrieved approval details: ${approvalId}`, {
        adminId: (req as any).user?.adminId,
        approvalId
      });
      
      res.status(200).json({
        success: true,
        data: approval
      });
    } catch (error) {
      Logger.error('Error retrieving approval details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve approval details'
      });
    }
  };

  /**
   * Get approvals assigned to current admin
   */
  getMyAssignedApprovals = async (req: Request, res: Response): Promise<void> => {
    try {
      const adminId = (req as any).user?.adminId;
      const { page = 1, limit = 20 } = req.query;
      
      const approvals = await AssetApproval.find({
        assignedTo: adminId,
        status: { $in: [ApprovalStatus.PENDING, ApprovalStatus.UNDER_REVIEW] }
      })
        .sort({ priority: -1, submittedAt: 1 })
        .limit(Number(limit) * Number(page))
        .skip((Number(page) - 1) * Number(limit))
        .populate('userId', 'firstName lastName email')
        .lean();
      
      const total = await AssetApproval.countDocuments({
        assignedTo: adminId,
        status: { $in: [ApprovalStatus.PENDING, ApprovalStatus.UNDER_REVIEW] }
      });
      
      res.status(200).json({
        success: true,
        data: {
          approvals,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error) {
      Logger.error('Error retrieving assigned approvals:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve assigned approvals'
      });
    }
  };

  /**
   * Get overdue approvals
   */
  getOverdueApprovals = async (req: Request, res: Response): Promise<void> => {
    try {
      const approvals = await AssetApproval.findOverdueApprovals()
        .populate('userId', 'firstName lastName email')
        .populate('assignedTo', 'firstName lastName email')
        .lean();
      
      Logger.warn(`Found ${approvals.length} overdue approvals`, {
        adminId: (req as any).user?.adminId,
        count: approvals.length
      });
      
      res.status(200).json({
        success: true,
        data: approvals
      });
    } catch (error) {
      Logger.error('Error retrieving overdue approvals:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve overdue approvals'
      });
    }
  };

  // ==================== ASSIGNMENT OPERATIONS ====================
  
  /**
   * Assign approval to admin
   */
  assignApproval = async (req: Request, res: Response): Promise<void> => {
    try {
      const { approvalId } = req.params;
      const { assignedTo } = req.body;
      const adminId = (req as any).user?.adminId;
      
      const validation = validateRequest(req.body, {
        assignedTo: { required: true, type: 'string' }
      });
      
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.errors
        });
        return;
      }
      
      const approval = await AssetApproval.findOne({ approvalId });
      if (!approval) {
        res.status(404).json({
          success: false,
          error: 'Asset approval not found'
        });
        return;
      }
      
      approval.assignedTo = assignedTo;
      approval.auditTrail.push({
        action: 'assign',
        performedBy: adminId,
        performedAt: new Date(),
        details: { assignedTo, previousAssignee: approval.assignedTo }
      });
      
      await approval.save();
      
      // Send notification to assigned admin
      await sendNotification({
        type: 'asset_assigned',
        recipientId: assignedTo,
        data: {
          approvalId,
          assetType: approval.assetType,
          priority: approval.priority
        }
      });
      
      Logger.info(`Approval ${approvalId} assigned to ${assignedTo}`, {
        adminId,
        approvalId,
        assignedTo
      });
      
      res.status(200).json({
        success: true,
        message: 'Approval assigned successfully',
        data: approval
      });
    } catch (error) {
      Logger.error('Error assigning approval:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to assign approval'
      });
    }
  };

  // ==================== VERIFICATION OPERATIONS ====================
  
  /**
   * Add verification result
   */
  addVerificationResult = async (req: Request, res: Response): Promise<void> => {
    try {
      const { approvalId } = req.params;
      const { method, result, confidence, notes, images, certificateUrl } = req.body;
      const adminId = (req as any).user?.adminId;
      
      const validation = validateRequest(req.body, {
        method: { required: true, type: 'string', enum: Object.values(VerificationMethod) },
        result: { required: true, type: 'string', enum: ['pass', 'fail', 'inconclusive'] },
        confidence: { required: true, type: 'number', min: 0, max: 100 },
        notes: { required: true, type: 'string' }
      });
      
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.errors
        });
        return;
      }
      
      const approval = await AssetApproval.findOne({ approvalId });
      if (!approval) {
        res.status(404).json({
          success: false,
          error: 'Asset approval not found'
        });
        return;
      }
      
      const verificationResult = {
        method,
        result,
        confidence,
        notes,
        verifiedBy: adminId,
        verifiedAt: new Date(),
        images: images || [],
        certificateUrl
      };
      
      await approval.addVerificationResult(verificationResult);
      
      Logger.info(`Verification result added for approval ${approvalId}`, {
        adminId,
        approvalId,
        method,
        result,
        confidence
      });
      
      res.status(200).json({
        success: true,
        message: 'Verification result added successfully',
        data: {
          verificationResult,
          overallScore: approval.overallVerificationScore,
          riskLevel: approval.riskLevel
        }
      });
    } catch (error) {
      Logger.error('Error adding verification result:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add verification result'
      });
    }
  };

  // ==================== APPROVAL OPERATIONS ====================
  
  /**
   * Approve asset
   */
  approveAsset = async (req: Request, res: Response): Promise<void> => {
    try {
      const { approvalId } = req.params;
      const { finalValue, notes } = req.body;
      const adminId = (req as any).user?.adminId;
      
      const approval = await AssetApproval.findOne({ approvalId });
      if (!approval) {
        res.status(404).json({
          success: false,
          error: 'Asset approval not found'
        });
        return;
      }
      
      if (approval.status !== ApprovalStatus.UNDER_REVIEW) {
        res.status(400).json({
          success: false,
          error: 'Asset must be under review to approve'
        });
        return;
      }
      
      // Check if admin has sufficient verification results
      if (approval.overallVerificationScore < 70) {
        res.status(400).json({
          success: false,
          error: 'Insufficient verification score for approval'
        });
        return;
      }
      
      await approval.approve(adminId, finalValue);
      
      if (notes) {
        await approval.addAdminNote(adminId, (req as any).user?.fullName, notes, false);
      }
      
      // Send notification to user
      await sendNotification({
        type: 'asset_approved',
        recipientId: approval.userId,
        data: {
          approvalId,
          assetType: approval.assetType,
          finalValue: finalValue || approval.valuationDetails?.estimatedValue
        }
      });
      
      Logger.info(`Asset approved: ${approvalId}`, {
        adminId,
        approvalId,
        finalValue,
        userId: approval.userId
      });
      
      res.status(200).json({
        success: true,
        message: 'Asset approved successfully',
        data: approval
      });
    } catch (error) {
      Logger.error('Error approving asset:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to approve asset'
      });
    }
  };

  /**
   * Reject asset
   */
  rejectAsset = async (req: Request, res: Response): Promise<void> => {
    try {
      const { approvalId } = req.params;
      const { reason, notes } = req.body;
      const adminId = (req as any).user?.adminId;
      
      const validation = validateRequest(req.body, {
        reason: { required: true, type: 'string', minLength: 10 }
      });
      
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.errors
        });
        return;
      }
      
      const approval = await AssetApproval.findOne({ approvalId });
      if (!approval) {
        res.status(404).json({
          success: false,
          error: 'Asset approval not found'
        });
        return;
      }
      
      await approval.reject(adminId, reason);
      
      if (notes) {
        await approval.addAdminNote(adminId, (req as any).user?.fullName, notes, false);
      }
      
      // Send notification to user
      await sendNotification({
        type: 'asset_rejected',
        recipientId: approval.userId,
        data: {
          approvalId,
          assetType: approval.assetType,
          reason
        }
      });
      
      Logger.info(`Asset rejected: ${approvalId}`, {
        adminId,
        approvalId,
        reason,
        userId: approval.userId
      });
      
      res.status(200).json({
        success: true,
        message: 'Asset rejected successfully',
        data: approval
      });
    } catch (error) {
      Logger.error('Error rejecting asset:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reject asset'
      });
    }
  };

  /**
   * Request additional information
   */
  requestAdditionalInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      const { approvalId } = req.params;
      const { requestedInfo, notes } = req.body;
      const adminId = (req as any).user?.adminId;
      
      const validation = validateRequest(req.body, {
        requestedInfo: { required: true, type: 'string', minLength: 10 }
      });
      
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.errors
        });
        return;
      }
      
      const approval = await AssetApproval.findOne({ approvalId });
      if (!approval) {
        res.status(404).json({
          success: false,
          error: 'Asset approval not found'
        });
        return;
      }
      
      approval.status = ApprovalStatus.REQUIRES_ADDITIONAL_INFO;
      approval.additionalInfoRequested = requestedInfo;
      approval.reviewedBy.push(adminId);
      
      approval.auditTrail.push({
        action: 'request_additional_info',
        performedBy: adminId,
        performedAt: new Date(),
        details: { requestedInfo }
      });
      
      await approval.save();
      
      if (notes) {
        await approval.addAdminNote(adminId, (req as any).user?.fullName, notes, false);
      }
      
      // Send notification to user
      await sendNotification({
        type: 'additional_info_requested',
        recipientId: approval.userId,
        data: {
          approvalId,
          assetType: approval.assetType,
          requestedInfo
        }
      });
      
      Logger.info(`Additional info requested for approval: ${approvalId}`, {
        adminId,
        approvalId,
        requestedInfo
      });
      
      res.status(200).json({
        success: true,
        message: 'Additional information requested successfully',
        data: approval
      });
    } catch (error) {
      Logger.error('Error requesting additional info:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to request additional information'
      });
    }
  };

  // ==================== NOTES AND COMMENTS ====================
  
  /**
   * Add admin note
   */
  addAdminNote = async (req: Request, res: Response): Promise<void> => {
    try {
      const { approvalId } = req.params;
      const { note, isInternal = false } = req.body;
      const adminId = (req as any).user?.adminId;
      const adminName = (req as any).user?.fullName;
      
      const validation = validateRequest(req.body, {
        note: { required: true, type: 'string', minLength: 5 }
      });
      
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.errors
        });
        return;
      }
      
      const approval = await AssetApproval.findOne({ approvalId });
      if (!approval) {
        res.status(404).json({
          success: false,
          error: 'Asset approval not found'
        });
        return;
      }
      
      await approval.addAdminNote(adminId, adminName, note, isInternal);
      
      Logger.info(`Admin note added to approval: ${approvalId}`, {
        adminId,
        approvalId,
        isInternal
      });
      
      res.status(200).json({
        success: true,
        message: 'Admin note added successfully',
        data: {
          note: {
            adminId,
            adminName,
            note,
            timestamp: new Date(),
            isInternal
          }
        }
      });
    } catch (error) {
      Logger.error('Error adding admin note:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add admin note'
      });
    }
  };

  // ==================== ANALYTICS AND REPORTING ====================
  
  /**
   * Get approval statistics
   */
  getApprovalStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, assetType } = req.query;
      
      const matchFilter: any = {};
      if (startDate && endDate) {
        matchFilter.submittedAt = {
          $gte: new Date(startDate as string),
          $lte: new Date(endDate as string)
        };
      }
      if (assetType) {
        matchFilter.assetType = assetType;
      }
      
      const stats = await AssetApproval.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgProcessingTime: {
              $avg: {
                $cond: [
                  { $and: ['$reviewStartedAt', '$reviewCompletedAt'] },
                  { $subtract: ['$reviewCompletedAt', '$reviewStartedAt'] },
                  null
                ]
              }
            }
          }
        }
      ]);
      
      const assetTypeStats = await AssetApproval.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$assetType',
            count: { $sum: 1 },
            approved: {
              $sum: { $cond: [{ $eq: ['$status', ApprovalStatus.APPROVED] }, 1, 0] }
            },
            rejected: {
              $sum: { $cond: [{ $eq: ['$status', ApprovalStatus.REJECTED] }, 1, 0] }
            }
          }
        }
      ]);
      
      Logger.info('Approval statistics retrieved', {
        adminId: (req as any).user?.adminId,
        filter: matchFilter
      });
      
      res.status(200).json({
        success: true,
        data: {
          statusStats: stats,
          assetTypeStats,
          period: { startDate, endDate }
        }
      });
    } catch (error) {
      Logger.error('Error retrieving approval statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve approval statistics'
      });
    }
  };

  // ==================== HEALTH CHECK ====================
  
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      service: 'Asset Approval Controller',
      timestamp: new Date().toISOString(),
      status: 'healthy'
    });
  };
}

export default new AssetApprovalController();

