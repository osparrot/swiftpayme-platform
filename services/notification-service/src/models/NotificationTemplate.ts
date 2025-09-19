/**
 * SwiftPayMe Notification Service - Notification Template Model
 * Mongoose model for notification templates with validation and versioning
 */

import mongoose, { Schema, Model } from 'mongoose';
import Handlebars from 'handlebars';
import {
  INotificationTemplateDocument,
  TemplateType,
  NotificationType
} from '../types/notificationTypes';

// ==================== TEMPLATE SCHEMA ====================

const NotificationTemplateSchema = new Schema<INotificationTemplateDocument>({
  templateId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => `tmpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  
  name: {
    type: String,
    required: true,
    maxlength: 100,
    trim: true,
    index: true
  },
  
  type: {
    type: String,
    required: true,
    enum: Object.values(TemplateType),
    index: true
  },
  
  notificationType: {
    type: String,
    required: true,
    enum: Object.values(NotificationType),
    index: true
  },
  
  // ==================== TEMPLATE CONTENT ====================
  
  subject: {
    type: String,
    maxlength: 200,
    trim: true,
    validate: {
      validator: function(v: string) {
        // Subject is required for email templates
        if (this.type === TemplateType.EMAIL_HTML || this.type === TemplateType.EMAIL_TEXT) {
          return v && v.length > 0;
        }
        return true;
      },
      message: 'Subject is required for email templates'
    }
  },
  
  content: {
    type: String,
    required: true,
    maxlength: 50000,
    validate: {
      validator: function(v: string) {
        return v && v.length > 0;
      },
      message: 'Content is required'
    }
  },
  
  variables: [{
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v);
      },
      message: 'Variable names must be valid identifiers'
    }
  }],
  
  // ==================== LOCALIZATION ====================
  
  language: {
    type: String,
    required: true,
    default: 'en',
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        return /^[a-z]{2}(-[A-Z]{2})?$/.test(v);
      },
      message: 'Language must be in ISO 639-1 format (e.g., en, en-US)'
    }
  },
  
  defaultLanguage: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // ==================== VALIDATION ====================
  
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  version: {
    type: Number,
    default: 1,
    min: 1
  },
  
  // ==================== METADATA ====================
  
  description: {
    type: String,
    maxlength: 500,
    trim: true
  },
  
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // ==================== AUDIT ====================
  
  createdBy: {
    type: String,
    required: true
  },
  
  lastModifiedBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  collection: 'notification_templates',
  versionKey: false
});

// ==================== INDEXES ====================

// Compound indexes for efficient queries
NotificationTemplateSchema.index({ notificationType: 1, type: 1, language: 1 });
NotificationTemplateSchema.index({ isActive: 1, notificationType: 1 });
NotificationTemplateSchema.index({ name: 1, version: -1 });
NotificationTemplateSchema.index({ tags: 1, isActive: 1 });

// Unique constraint for default language templates
NotificationTemplateSchema.index(
  { notificationType: 1, type: 1, defaultLanguage: 1 },
  { 
    unique: true,
    partialFilterExpression: { defaultLanguage: true }
  }
);

// Text search index
NotificationTemplateSchema.index({
  name: 'text',
  description: 'text',
  content: 'text'
}, {
  weights: {
    name: 10,
    description: 5,
    content: 1
  },
  name: 'template_text_search'
});

// ==================== VIRTUAL PROPERTIES ====================

NotificationTemplateSchema.virtual('isEmailTemplate').get(function() {
  return this.type === TemplateType.EMAIL_HTML || this.type === TemplateType.EMAIL_TEXT;
});

NotificationTemplateSchema.virtual('isSmsTemplate').get(function() {
  return this.type === TemplateType.SMS_TEXT;
});

NotificationTemplateSchema.virtual('isPushTemplate').get(function() {
  return this.type === TemplateType.PUSH_NOTIFICATION;
});

NotificationTemplateSchema.virtual('compiledTemplate').get(function() {
  try {
    return Handlebars.compile(this.content);
  } catch (error) {
    return null;
  }
});

NotificationTemplateSchema.virtual('compiledSubject').get(function() {
  if (!this.subject) return null;
  try {
    return Handlebars.compile(this.subject);
  } catch (error) {
    return null;
  }
});

// ==================== MIDDLEWARE ====================

// Pre-save middleware
NotificationTemplateSchema.pre('save', function(next) {
  // Extract variables from template content
  this.extractVariables();
  
  // Validate template syntax
  try {
    Handlebars.compile(this.content);
    if (this.subject) {
      Handlebars.compile(this.subject);
    }
  } catch (error) {
    return next(new Error(`Template compilation error: ${error.message}`));
  }
  
  // Ensure only one default template per type/notification combination
  if (this.defaultLanguage && this.isNew) {
    this.constructor.updateMany(
      {
        notificationType: this.notificationType,
        type: this.type,
        defaultLanguage: true,
        _id: { $ne: this._id }
      },
      { defaultLanguage: false }
    ).exec();
  }
  
  next();
});

// Post-save middleware
NotificationTemplateSchema.post('save', function(doc) {
  // Emit event for cache invalidation
  if (typeof process !== 'undefined' && process.emit) {
    process.emit('template:updated', doc);
  }
});

// ==================== INSTANCE METHODS ====================

NotificationTemplateSchema.methods.render = async function(variables: Record<string, any>): Promise<string> {
  try {
    const template = Handlebars.compile(this.content);
    return template(variables);
  } catch (error) {
    throw new Error(`Template rendering error: ${error.message}`);
  }
};

NotificationTemplateSchema.methods.renderSubject = async function(variables: Record<string, any>): Promise<string | null> {
  if (!this.subject) return null;
  
  try {
    const template = Handlebars.compile(this.subject);
    return template(variables);
  } catch (error) {
    throw new Error(`Subject rendering error: ${error.message}`);
  }
};

NotificationTemplateSchema.methods.validate = async function(): Promise<boolean> {
  try {
    // Test template compilation
    Handlebars.compile(this.content);
    if (this.subject) {
      Handlebars.compile(this.subject);
    }
    
    // Test with sample variables
    const sampleVariables: Record<string, any> = {};
    this.variables.forEach(variable => {
      sampleVariables[variable] = `{{${variable}}}`;
    });
    
    await this.render(sampleVariables);
    if (this.subject) {
      await this.renderSubject(sampleVariables);
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

NotificationTemplateSchema.methods.createVersion = async function(): Promise<INotificationTemplateDocument> {
  const newTemplate = new (this.constructor as any)({
    ...this.toObject(),
    _id: undefined,
    templateId: `tmpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    version: this.version + 1,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  return await newTemplate.save();
};

NotificationTemplateSchema.methods.extractVariables = function(): void {
  const variableRegex = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
  const variables = new Set<string>();
  
  // Extract from content
  let match;
  while ((match = variableRegex.exec(this.content)) !== null) {
    variables.add(match[1]);
  }
  
  // Extract from subject
  if (this.subject) {
    variableRegex.lastIndex = 0;
    while ((match = variableRegex.exec(this.subject)) !== null) {
      variables.add(match[1]);
    }
  }
  
  this.variables = Array.from(variables).sort();
};

NotificationTemplateSchema.methods.clone = async function(newName: string): Promise<INotificationTemplateDocument> {
  const clonedTemplate = new (this.constructor as any)({
    ...this.toObject(),
    _id: undefined,
    templateId: `tmpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: newName,
    version: 1,
    defaultLanguage: false,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  return await clonedTemplate.save();
};

// ==================== STATIC METHODS ====================

NotificationTemplateSchema.statics.findByNotificationType = function(
  notificationType: NotificationType,
  templateType?: TemplateType,
  language: string = 'en'
) {
  const query: any = {
    notificationType,
    isActive: true
  };
  
  if (templateType) {
    query.type = templateType;
  }
  
  // Try to find template in requested language, fallback to default
  return this.findOne({
    ...query,
    $or: [
      { language, defaultLanguage: false },
      { defaultLanguage: true }
    ]
  }).sort({ language: language === 'en' ? -1 : 1, defaultLanguage: -1 });
};

NotificationTemplateSchema.statics.findActiveTemplates = function(filters: any = {}) {
  return this.find({
    isActive: true,
    ...filters
  }).sort({ name: 1, version: -1 });
};

NotificationTemplateSchema.statics.findByTags = function(tags: string[]) {
  return this.find({
    tags: { $in: tags },
    isActive: true
  }).sort({ name: 1 });
};

NotificationTemplateSchema.statics.getTemplateVersions = function(templateName: string) {
  return this.find({ name: templateName })
    .sort({ version: -1 })
    .select('templateId name version isActive createdAt lastModifiedBy');
};

NotificationTemplateSchema.statics.bulkUpdateStatus = function(templateIds: string[], isActive: boolean) {
  return this.updateMany(
    { templateId: { $in: templateIds } },
    { isActive, updatedAt: new Date() }
  );
};

// ==================== HANDLEBARS HELPERS ====================

// Register custom Handlebars helpers
Handlebars.registerHelper('formatCurrency', function(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
});

Handlebars.registerHelper('formatDate', function(date: Date, format: string = 'short') {
  if (!date) return '';
  
  const options: Intl.DateTimeFormatOptions = {};
  switch (format) {
    case 'short':
      options.dateStyle = 'short';
      break;
    case 'medium':
      options.dateStyle = 'medium';
      break;
    case 'long':
      options.dateStyle = 'long';
      break;
    case 'full':
      options.dateStyle = 'full';
      options.timeStyle = 'short';
      break;
    default:
      options.dateStyle = 'short';
  }
  
  return new Intl.DateTimeFormat('en-US', options).format(new Date(date));
});

Handlebars.registerHelper('uppercase', function(str: string) {
  return str ? str.toUpperCase() : '';
});

Handlebars.registerHelper('lowercase', function(str: string) {
  return str ? str.toLowerCase() : '';
});

Handlebars.registerHelper('capitalize', function(str: string) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
});

Handlebars.registerHelper('truncate', function(str: string, length: number = 100) {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
});

Handlebars.registerHelper('eq', function(a: any, b: any) {
  return a === b;
});

Handlebars.registerHelper('ne', function(a: any, b: any) {
  return a !== b;
});

Handlebars.registerHelper('gt', function(a: number, b: number) {
  return a > b;
});

Handlebars.registerHelper('lt', function(a: number, b: number) {
  return a < b;
});

// ==================== MODEL CREATION ====================

const NotificationTemplateModel: Model<INotificationTemplateDocument> = mongoose.model<INotificationTemplateDocument>(
  'NotificationTemplate',
  NotificationTemplateSchema
);

export default NotificationTemplateModel;
export { NotificationTemplateSchema };

