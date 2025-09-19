/**
 * SwiftPayMe Notification Service - Routes
 * API routes for notification service
 */

import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';

const router = Router();
const notificationController = new NotificationController();

// Health check
router.get('/health', notificationController.healthCheck.bind(notificationController));

// Notification routes
router.post('/notifications', notificationController.createNotification.bind(notificationController));
router.get('/notifications', notificationController.getNotifications.bind(notificationController));
router.put('/notifications/:notificationId/read', notificationController.markAsRead.bind(notificationController));
router.post('/notifications/:notificationId/send', notificationController.sendNotification.bind(notificationController));

// Analytics
router.get('/analytics', notificationController.getAnalytics.bind(notificationController));

export default router;

