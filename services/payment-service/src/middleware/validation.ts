/**
 * SwiftPayMe Payment Service - Validation Middleware
 * Request validation middleware using express-validator
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { Logger } from '../utils/Logger';

const logger = new Logger('ValidationMiddleware');

export const validationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.warn('Validation failed', {
      errors: errors.array(),
      path: req.path,
      method: req.method,
      userId: req.user?.userId,
      correlationId: req.correlationId
    });

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }

  next();
};

export default validationMiddleware;

