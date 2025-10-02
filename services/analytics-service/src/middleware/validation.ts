import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { Logger } from '../utils/Logger';

const logger = new Logger('AnalyticsValidationMiddleware');

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

        res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: errorMessage
        });
        return;
      }

      req[property] = value;
      next();
    } catch (err) {
      logger.error('Validation middleware error:', err);
      res.status(500).json({
        success: false,
        error: 'Validation processing error'
      });
    }
  };
};

export default { validationMiddleware };
