import Joi from 'joi';
import { TimeRange, AnalyticsReportType } from '../types/analytics';

// Dashboard query schema
export const dashboardQuerySchema = Joi.object({
  timeRange: Joi.string()
    .valid(...Object.values(TimeRange))
    .default(TimeRange.LAST_30_DAYS)
    .messages({
      'any.only': `Time range must be one of: ${Object.values(TimeRange).join(', ')}`
    }),
  
  startDate: Joi.date()
    .iso()
    .when('timeRange', {
      is: TimeRange.CUSTOM,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'date.format': 'Start date must be in ISO format',
      'any.required': 'Start date is required for custom time range'
    }),
  
  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .when('timeRange', {
      is: TimeRange.CUSTOM,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'date.format': 'End date must be in ISO format',
      'date.min': 'End date must be after start date',
      'any.required': 'End date is required for custom time range'
    }),
  
  currency: Joi.string()
    .valid('USD', 'EUR', 'GBP', 'BTC', 'ETH')
    .optional()
    .messages({
      'any.only': 'Currency must be one of: USD, EUR, GBP, BTC, ETH'
    }),
  
  segment: Joi.string()
    .valid('all', 'new_users', 'returning_users', 'premium_users', 'verified_users')
    .default('all')
    .messages({
      'any.only': 'Segment must be one of: all, new_users, returning_users, premium_users, verified_users'
    })
});

// Report query schema
export const reportQuerySchema = Joi.object({
  type: Joi.string()
    .valid(...Object.values(AnalyticsReportType))
    .optional()
    .messages({
      'any.only': `Report type must be one of: ${Object.values(AnalyticsReportType).join(', ')}`
    }),
  
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
  
  tags: Joi.array()
    .items(Joi.string().trim())
    .optional(),
  
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
    }),
  
  sort: Joi.string()
    .valid('generatedAt', '-generatedAt', 'type', '-type')
    .default('-generatedAt')
    .messages({
      'any.only': 'Sort must be one of: generatedAt, -generatedAt, type, -type'
    })
});

// Custom report schema
export const customReportSchema = Joi.object({
  type: Joi.string()
    .valid(...Object.values(AnalyticsReportType))
    .required()
    .messages({
      'any.required': 'Report type is required',
      'any.only': `Report type must be one of: ${Object.values(AnalyticsReportType).join(', ')}`
    }),
  
  startDate: Joi.date()
    .iso()
    .required()
    .max('now')
    .messages({
      'any.required': 'Start date is required',
      'date.format': 'Start date must be in ISO format',
      'date.max': 'Start date cannot be in the future'
    }),
  
  endDate: Joi.date()
    .iso()
    .required()
    .min(Joi.ref('startDate'))
    .max('now')
    .messages({
      'any.required': 'End date is required',
      'date.format': 'End date must be in ISO format',
      'date.min': 'End date must be after start date',
      'date.max': 'End date cannot be in the future'
    }),
  
  includeComparisons: Joi.boolean()
    .default(false),
  
  includeTrends: Joi.boolean()
    .default(false),
  
  includeForecasts: Joi.boolean()
    .default(false),
  
  filters: Joi.object({
    userSegments: Joi.array()
      .items(Joi.string())
      .optional(),
    
    currencies: Joi.array()
      .items(Joi.string().valid('USD', 'EUR', 'GBP', 'BTC', 'ETH'))
      .optional(),
    
    assetTypes: Joi.array()
      .items(Joi.string().valid('gold', 'silver', 'platinum', 'palladium', 'diamond', 'jewelry', 'watch', 'art', 'collectible', 'other'))
      .optional(),
    
    transactionTypes: Joi.array()
      .items(Joi.string())
      .optional(),
    
    countries: Joi.array()
      .items(Joi.string().length(2).uppercase())
      .optional()
  }).optional(),
  
  tags: Joi.array()
    .items(Joi.string().trim())
    .optional(),
  
  isPublic: Joi.boolean()
    .default(false),
  
  title: Joi.string()
    .max(200)
    .trim()
    .optional()
    .messages({
      'string.max': 'Title must not exceed 200 characters'
    }),
  
  description: Joi.string()
    .max(1000)
    .trim()
    .optional()
    .messages({
      'string.max': 'Description must not exceed 1000 characters'
    })
});

// Export request schema
export const exportRequestSchema = Joi.object({
  type: Joi.string()
    .valid('csv', 'xlsx', 'json', 'pdf')
    .required()
    .messages({
      'any.required': 'Export type is required',
      'any.only': 'Export type must be one of: csv, xlsx, json, pdf'
    }),
  
  query: Joi.object({
    type: Joi.string()
      .valid(...Object.values(AnalyticsReportType))
      .required(),
    
    startDate: Joi.date()
      .iso()
      .required()
      .max('now'),
    
    endDate: Joi.date()
      .iso()
      .required()
      .min(Joi.ref('startDate'))
      .max('now'),
    
    filters: Joi.object().optional()
  }).required(),
  
  includeCharts: Joi.boolean()
    .default(false),
  
  includeRawData: Joi.boolean()
    .default(true),
  
  compression: Joi.string()
    .valid('none', 'zip', 'gzip')
    .default('none')
    .messages({
      'any.only': 'Compression must be one of: none, zip, gzip'
    }),
  
  password: Joi.string()
    .min(8)
    .optional()
    .messages({
      'string.min': 'Password must be at least 8 characters long'
    }),
  
  expirationDays: Joi.number()
    .integer()
    .min(1)
    .max(30)
    .default(7)
    .messages({
      'number.integer': 'Expiration days must be an integer',
      'number.min': 'Expiration days must be at least 1',
      'number.max': 'Expiration days must not exceed 30'
    })
});

// Metric query schema
export const metricQuerySchema = Joi.object({
  metric: Joi.string()
    .valid(
      'users', 'transactions', 'assets', 'revenue', 'performance', 'security'
    )
    .required()
    .messages({
      'any.required': 'Metric type is required',
      'any.only': 'Metric must be one of: users, transactions, assets, revenue, performance, security'
    }),
  
  timeRange: Joi.string()
    .valid(...Object.values(TimeRange))
    .default(TimeRange.LAST_30_DAYS),
  
  granularity: Joi.string()
    .valid('hour', 'day', 'week', 'month')
    .default('day')
    .messages({
      'any.only': 'Granularity must be one of: hour, day, week, month'
    }),
  
  aggregation: Joi.string()
    .valid('sum', 'avg', 'min', 'max', 'count')
    .default('sum')
    .messages({
      'any.only': 'Aggregation must be one of: sum, avg, min, max, count'
    }),
  
  groupBy: Joi.array()
    .items(Joi.string())
    .optional(),
  
  filters: Joi.object().optional()
});

// Alert rule schema
export const alertRuleSchema = Joi.object({
  name: Joi.string()
    .required()
    .min(1)
    .max(100)
    .trim()
    .messages({
      'any.required': 'Alert rule name is required',
      'string.min': 'Name must be at least 1 character long',
      'string.max': 'Name must not exceed 100 characters'
    }),
  
  metric: Joi.string()
    .required()
    .messages({
      'any.required': 'Metric is required'
    }),
  
  condition: Joi.string()
    .valid('greater_than', 'less_than', 'equals', 'not_equals', 'percentage_change')
    .required()
    .messages({
      'any.required': 'Condition is required',
      'any.only': 'Condition must be one of: greater_than, less_than, equals, not_equals, percentage_change'
    }),
  
  threshold: Joi.number()
    .required()
    .messages({
      'any.required': 'Threshold is required',
      'number.base': 'Threshold must be a number'
    }),
  
  timeWindow: Joi.number()
    .integer()
    .min(1)
    .max(1440)
    .default(60)
    .messages({
      'number.integer': 'Time window must be an integer',
      'number.min': 'Time window must be at least 1 minute',
      'number.max': 'Time window must not exceed 1440 minutes (24 hours)'
    }),
  
  severity: Joi.string()
    .valid('low', 'medium', 'high', 'critical')
    .default('medium')
    .messages({
      'any.only': 'Severity must be one of: low, medium, high, critical'
    }),
  
  recipients: Joi.array()
    .items(Joi.string().email())
    .min(1)
    .required()
    .messages({
      'any.required': 'At least one recipient is required',
      'array.min': 'At least one recipient is required',
      'string.email': 'Recipients must be valid email addresses'
    }),
  
  isActive: Joi.boolean()
    .default(true),
  
  description: Joi.string()
    .max(500)
    .trim()
    .optional()
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    })
});

// Cohort analysis schema
export const cohortAnalysisSchema = Joi.object({
  cohortType: Joi.string()
    .valid('registration', 'first_transaction', 'first_deposit')
    .default('registration')
    .messages({
      'any.only': 'Cohort type must be one of: registration, first_transaction, first_deposit'
    }),
  
  period: Joi.string()
    .valid('day', 'week', 'month')
    .default('month')
    .messages({
      'any.only': 'Period must be one of: day, week, month'
    }),
  
  startDate: Joi.date()
    .iso()
    .required()
    .messages({
      'any.required': 'Start date is required',
      'date.format': 'Start date must be in ISO format'
    }),
  
  endDate: Joi.date()
    .iso()
    .required()
    .min(Joi.ref('startDate'))
    .messages({
      'any.required': 'End date is required',
      'date.format': 'End date must be in ISO format',
      'date.min': 'End date must be after start date'
    }),
  
  retentionPeriods: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .default(6)
    .messages({
      'number.integer': 'Retention periods must be an integer',
      'number.min': 'Retention periods must be at least 1',
      'number.max': 'Retention periods must not exceed 12'
    })
});

// Funnel analysis schema
export const funnelAnalysisSchema = Joi.object({
  steps: Joi.array()
    .items(Joi.object({
      name: Joi.string().required(),
      event: Joi.string().required(),
      filters: Joi.object().optional()
    }))
    .min(2)
    .max(10)
    .required()
    .messages({
      'any.required': 'Funnel steps are required',
      'array.min': 'At least 2 steps are required',
      'array.max': 'Maximum 10 steps allowed'
    }),
  
  timeRange: Joi.string()
    .valid(...Object.values(TimeRange))
    .default(TimeRange.LAST_30_DAYS),
  
  conversionWindow: Joi.number()
    .integer()
    .min(1)
    .max(30)
    .default(7)
    .messages({
      'number.integer': 'Conversion window must be an integer',
      'number.min': 'Conversion window must be at least 1 day',
      'number.max': 'Conversion window must not exceed 30 days'
    }),
  
  segmentBy: Joi.string()
    .valid('country', 'device', 'source', 'user_type')
    .optional()
    .messages({
      'any.only': 'Segment by must be one of: country, device, source, user_type'
    })
});

export default {
  dashboardQuerySchema,
  reportQuerySchema,
  customReportSchema,
  exportRequestSchema,
  metricQuerySchema,
  alertRuleSchema,
  cohortAnalysisSchema,
  funnelAnalysisSchema
};
