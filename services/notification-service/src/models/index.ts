/**
 * SwiftPayMe Notification Service - Models Index
 * Centralized export for all notification service models
 */

// Import all models
import NotificationModel, { NotificationSchema } from './Notification';
import NotificationTemplateModel, { NotificationTemplateSchema } from './NotificationTemplate';
import EventSubscriptionModel, { EventSubscriptionSchema } from './EventSubscription';

// Export models
export {
  NotificationModel,
  NotificationSchema,
  NotificationTemplateModel,
  NotificationTemplateSchema,
  EventSubscriptionModel,
  EventSubscriptionSchema
};

// Export default object with all models
export default {
  Notification: NotificationModel,
  NotificationTemplate: NotificationTemplateModel,
  EventSubscription: EventSubscriptionModel
};

// Re-export types for convenience
export * from '../types/notificationTypes';
export * from '../enums/notificationEnums';

