import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../utils/Errors';
import { Logger } from '../utils/Logger';

const logger = new Logger('NotificationValidationMiddleware');

/**
 * Generic validation middleware factory
 */
export const validationMiddleware = (
  schema: Joi.ObjectSchema,
  property: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { error, value } = schema.validate(req[property], {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        const errorMessage = error.details
          .map(detail => detail.message)
          .join(', ');
        
        logger.warn('Validation failed', {
          property,
          errors: error.details,
          requestId: req.headers['x-request-id']
        });

        throw new ValidationError(errorMessage);
      }

      req[property] = value;
      next();
    } catch (err) {
      next(err);
    }
  };
};

// Send notification schema
export const sendNotificationSchema = Joi.object({
  userId: Joi.string()
    .required()
    .pattern(/^[a-fA-F0-9]{24}$/)
    .messages({
      'any.required': 'User ID is required',
      'string.pattern.base': 'User ID must be a valid MongoDB ObjectId'
    }),
  
  type: Joi.string()
    .valid(
      'email', 'sms', 'push', 'in_app', 'webhook', 'slack', 'telegram'
    )
    .required()
    .messages({
      'any.required': 'Notification type is required',
      'any.only': 'Type must be one of: email, sms, push, in_app, webhook, slack, telegram'
    }),
  
  category: Joi.string()
    .valid(
      'transaction', 'security', 'account', 'asset', 'system', 'marketing', 'compliance'
    )
    .required()
    .messages({
      'any.required': 'Notification category is required',
      'any.only': 'Category must be one of: transaction, security, account, asset, system, marketing, compliance'
    }),
  
  priority: Joi.string()
    .valid('low', 'medium', 'high', 'urgent')
    .default('medium')
    .messages({
      'any.only': 'Priority must be one of: low, medium, high, urgent'
    }),
  
  title: Joi.string()
    .required()
    .min(1)
    .max(200)
    .trim()
    .messages({
      'any.required': 'Title is required',
      'string.min': 'Title must be at least 1 character long',
      'string.max': 'Title must not exceed 200 characters'
    }),
  
  message: Joi.string()
    .required()
    .min(1)
    .max(5000)
    .trim()
    .messages({
      'any.required': 'Message is required',
      'string.min': 'Message must be at least 1 character long',
      'string.max': 'Message must not exceed 5000 characters'
    }),
  
  data: Joi.object()
    .optional()
    .messages({
      'object.base': 'Data must be an object'
    }),
  
  templateId: Joi.string()
    .pattern(/^[a-fA-F0-9]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Template ID must be a valid MongoDB ObjectId'
    }),
  
  templateVariables: Joi.object()
    .optional()
    .when('templateId', {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.required': 'Template variables are required when using a template'
    }),
  
  scheduledFor: Joi.date()
    .iso()
    .min('now')
    .optional()
    .messages({
      'date.format': 'Scheduled date must be in ISO format',
      'date.min': 'Scheduled date must be in the future'
    }),
  
  expiresAt: Joi.date()
    .iso()
    .min('now')
    .optional()
    .messages({
      'date.format': 'Expiration date must be in ISO format',
      'date.min': 'Expiration date must be in the future'
    }),
  
  channels: Joi.array()
    .items(Joi.string().valid('email', 'sms', 'push', 'in_app', 'webhook'))
    .unique()
    .min(1)
    .optional()
    .messages({
      'array.unique': 'Channels must be unique',
      'array.min': 'At least one channel must be specified'
    }),
  
  metadata: Joi.object({
    source: Joi.string().optional(),
    campaign: Joi.string().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    trackingId: Joi.string().optional()
  }).optional()
});

// Bulk notification schema
export const bulkNotificationSchema = Joi.object({
  userIds: Joi.array()
    .items(Joi.string().pattern(/^[a-fA-F0-9]{24}$/))
    .min(1)
    .max(1000)
    .unique()
    .required()
    .messages({
      'any.required': 'User IDs are required',
      'array.min': 'At least one user ID must be provided',
      'array.max': 'Cannot send to more than 1000 users at once',
      'array.unique': 'User IDs must be unique',
      'string.pattern.base': 'Each user ID must be a valid MongoDB ObjectId'
    }),
  
  type: Joi.string()
    .valid('email', 'sms', 'push', 'in_app')
    .required()
    .messages({
      'any.required': 'Notification type is required',
      'any.only': 'Type must be one of: email, sms, push, in_app'
    }),
  
  category: Joi.string()
    .valid('transaction', 'security', 'account', 'asset', 'system', 'marketing', 'compliance')
    .required()
    .messages({
      'any.required': 'Notification category is required',
      'any.only': 'Category must be one of: transaction, security, account, asset, system, marketing, compliance'
    }),
  
  templateId: Joi.string()
    .pattern(/^[a-fA-F0-9]{24}$/)
    .required()
    .messages({
      'any.required': 'Template ID is required for bulk notifications',
      'string.pattern.base': 'Template ID must be a valid MongoDB ObjectId'
    }),
  
  templateVariables: Joi.object()
    .optional(),
  
  priority: Joi.string()
    .valid('low', 'medium', 'high')
    .default('medium')
    .messages({
      'any.only': 'Priority must be one of: low, medium, high'
    }),
  
  scheduledFor: Joi.date()
    .iso()
    .min('now')
    .optional()
    .messages({
      'date.format': 'Scheduled date must be in ISO format',
      'date.min': 'Scheduled date must be in the future'
    }),
  
  batchSize: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(50)
    .messages({
      'number.integer': 'Batch size must be an integer',
      'number.min': 'Batch size must be at least 1',
      'number.max': 'Batch size must not exceed 100'
    })
});

// Notification template schema
export const notificationTemplateSchema = Joi.object({
  name: Joi.string()
    .required()
    .min(1)
    .max(100)
    .trim()
    .messages({
      'any.required': 'Template name is required',
      'string.min': 'Template name must be at least 1 character long',
      'string.max': 'Template name must not exceed 100 characters'
    }),
  
  type: Joi.string()
    .valid('email', 'sms', 'push', 'in_app')
    .required()
    .messages({
      'any.required': 'Template type is required',
      'any.only': 'Type must be one of: email, sms, push, in_app'
    }),
  
  category: Joi.string()
    .valid('transaction', 'security', 'account', 'asset', 'system', 'marketing', 'compliance')
    .required()
    .messages({
      'any.required': 'Template category is required',
      'any.only': 'Category must be one of: transaction, security, account, asset, system, marketing, compliance'
    }),
  
  subject: Joi.string()
    .when('type', {
      is: 'email',
      then: Joi.required().max(200),
      otherwise: Joi.optional().max(200)
    })
    .trim()
    .messages({
      'any.required': 'Subject is required for email templates',
      'string.max': 'Subject must not exceed 200 characters'
    }),
  
  title: Joi.string()
    .required()
    .min(1)
    .max(200)
    .trim()
    .messages({
      'any.required': 'Title is required',
      'string.min': 'Title must be at least 1 character long',
      'string.max': 'Title must not exceed 200 characters'
    }),
  
  body: Joi.string()
    .required()
    .min(1)
    .max(10000)
    .trim()
    .messages({
      'any.required': 'Body is required',
      'string.min': 'Body must be at least 1 character long',
      'string.max': 'Body must not exceed 10000 characters'
    }),
  
  variables: Joi.array()
    .items(Joi.object({
      name: Joi.string().required(),
      type: Joi.string().valid('string', 'number', 'date', 'boolean').required(),
      required: Joi.boolean().default(false),
      defaultValue: Joi.alternatives().try(Joi.string(), Joi.number(), Joi.date(), Joi.boolean()).optional()
    }))
    .optional()
    .messages({
      'array.base': 'Variables must be an array'
    }),
  
  isActive: Joi.boolean()
    .default(true),
  
  language: Joi.string()
    .valid('en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko')
    .default('en')
    .messages({
      'any.only': 'Language must be one of: en, es, fr, de, it, pt, zh, ja, ko'
    }),
  
  tags: Joi.array()
    .items(Joi.string().trim())
    .optional()
});

// Event subscription schema
export const eventSubscriptionSchema = Joi.object({
  userId: Joi.string()
    .required()
    .pattern(/^[a-fA-F0-9]{24}$/)
    .messages({
      'any.required': 'User ID is required',
      'string.pattern.base': 'User ID must be a valid MongoDB ObjectId'
    }),
  
  eventType: Joi.string()
    .valid(
      'user.created', 'user.updated', 'user.deleted',
      'transaction.created', 'transaction.completed', 'transaction.failed',
      'asset.deposited', 'asset.approved', 'asset.rejected',
      'payment.initiated', 'payment.completed', 'payment.failed',
      'security.login', 'security.logout', 'security.password_changed',
      'system.maintenance', 'system.update'
    )
    .required()
    .messages({
      'any.required': 'Event type is required',
      'any.only': 'Event type must be a valid system event'
    }),
  
  channels: Joi.array()
    .items(Joi.string().valid('email', 'sms', 'push', 'in_app', 'webhook'))
    .unique()
    .min(1)
    .required()
    .messages({
      'any.required': 'At least one channel is required',
      'array.unique': 'Channels must be unique',
      'array.min': 'At least one channel must be specified'
    }),
  
  isActive: Joi.boolean()
    .default(true),
  
  filters: Joi.object({
    priority: Joi.array().items(Joi.string().valid('low', 'medium', 'high', 'urgent')).optional(),
    categories: Joi.array().items(Joi.string()).optional(),
    conditions: Joi.object().optional()
  }).optional(),
  
  webhookUrl: Joi.string()
    .uri()
    .when('channels', {
      is: Joi.array().items(Joi.string()).has(Joi.string().valid('webhook')),
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.required': 'Webhook URL is required when webhook channel is selected',
      'string.uri': 'Webhook URL must be a valid URI'
    })
});

// Notification preferences schema
export const notificationPreferencesSchema = Joi.object({
  userId: Joi.string()
    .required()
    .pattern(/^[a-fA-F0-9]{24}$/)
    .messages({
      'any.required': 'User ID is required',
      'string.pattern.base': 'User ID must be a valid MongoDB ObjectId'
    }),
  
  preferences: Joi.object({
    email: Joi.object({
      enabled: Joi.boolean().default(true),
      categories: Joi.array().items(Joi.string()).optional(),
      frequency: Joi.string().valid('immediate', 'hourly', 'daily', 'weekly').default('immediate')
    }).optional(),
    
    sms: Joi.object({
      enabled: Joi.boolean().default(false),
      categories: Joi.array().items(Joi.string()).optional(),
      urgentOnly: Joi.boolean().default(true)
    }).optional(),
    
    push: Joi.object({
      enabled: Joi.boolean().default(true),
      categories: Joi.array().items(Joi.string()).optional(),
      quietHours: Joi.object({
        enabled: Joi.boolean().default(false),
        start: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
        end: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional()
      }).optional()
    }).optional(),
    
    inApp: Joi.object({
      enabled: Joi.boolean().default(true),
      categories: Joi.array().items(Joi.string()).optional()
    }).optional()
  }).required()
});

// Query schemas
export const notificationQuerySchema = Joi.object({
  userId: Joi.string()
    .pattern(/^[a-fA-F0-9]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'User ID must be a valid MongoDB ObjectId'
    }),
  
  type: Joi.string()
    .valid('email', 'sms', 'push', 'in_app', 'webhook')
    .optional(),
  
  category: Joi.string()
    .valid('transaction', 'security', 'account', 'asset', 'system', 'marketing', 'compliance')
    .optional(),
  
  status: Joi.string()
    .valid('pending', 'sent', 'delivered', 'failed', 'cancelled')
    .optional(),
  
  priority: Joi.string()
    .valid('low', 'medium', 'high', 'urgent')
    .optional(),
  
  startDate: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'Start date must be in ISO format'
    }),
  
  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.format': 'End date must be in ISO format',
      'date.min': 'End date must be after start date'
    }),
  
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must not exceed 100'
    })
});

/**
 * Validate notification ID parameter
 */
export const validateNotificationId = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    notificationId: Joi.string()
      .required()
      .pattern(/^[a-fA-F0-9]{24}$/)
      .messages({
        'any.required': 'Notification ID is required',
        'string.pattern.base': 'Notification ID must be a valid MongoDB ObjectId'
      })
  });

  validationMiddleware(schema, 'params')(req, res, next);
};

/**
 * Validate template ID parameter
 */
export const validateTemplateId = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    templateId: Joi.string()
      .required()
      .pattern(/^[a-fA-F0-9]{24}$/)
      .messages({
        'any.required': 'Template ID is required',
        'string.pattern.base': 'Template ID must be a valid MongoDB ObjectId'
      })
  });

  validationMiddleware(schema, 'params')(req, res, next);
};

export default {
  validationMiddleware,
  validateNotificationId,
  validateTemplateId,
  sendNotificationSchema,
  bulkNotificationSchema,
  notificationTemplateSchema,
  eventSubscriptionSchema,
  notificationPreferencesSchema,
  notificationQuerySchema
};
