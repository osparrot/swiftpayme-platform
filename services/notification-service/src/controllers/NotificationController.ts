/**
 * SwiftPayMe Notification Service - Notification Controller
 * REST API endpoints for notification management
 */

import { Request, Response } from 'express';
import { NotificationModel, EventSubscriptionModel } from '../models';
import { NotificationService } from '../services/NotificationService';
import { 
  ICreateNotificationRequest, 
  IGetNotificationsQuery,
  NotificationStatus,
  NotificationType,
  NotificationChannel
} from '../types/notificationTypes';

export class NotificationController {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Create a new notification
   */
  async createNotification(req: Request, res: Response): Promise<void> {
    try {
      const notificationData: ICreateNotificationRequest = req.body;
      
      const notification = await this.notificationService.createNotification(notificationData);
      
      res.status(201).json({
        success: true,
        data: notification,
        message: 'Notification created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        message: 'Failed to create notification'
      });
    }
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const query: IGetNotificationsQuery = req.query as any;
      const notifications = await NotificationModel.findByRecipient(query.userId!, query);
      
      res.json({
        success: true,
        data: notifications,
        total: notifications.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { notificationId } = req.params;
      const notification = await NotificationModel.findOne({ notificationId });
      
      if (!notification) {
        res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
        return;
      }

      await notification.markAsRead();
      
      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Send notification immediately
   */
  async sendNotification(req: Request, res: Response): Promise<void> {
    try {
      const { notificationId } = req.params;
      const result = await this.notificationService.sendNotification(notificationId);
      
      res.json({
        success: true,
        data: result,
        message: 'Notification sent successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get notification analytics
   */
  async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const analytics = await NotificationModel.getAnalytics(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.notificationService.getHealthStatus();
      res.json(health);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error.message
      });
    }
  }
}

