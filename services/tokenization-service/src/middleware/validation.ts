import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { Logger } from '../utils/Logger';
import { ValidationError } from '../utils/Errors';
import {
  TokenType,
  TokenStandard,
  TokenStatus,
  AssetType,
  CustodyType,
  ReserveType,
  MintingStatus,
  BurningStatus,
  DepositStatus,
  WithdrawalStatus
} from '../enums/tokenizationEnums';

export class ValidationMiddleware {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('ValidationMiddleware');
  }

  /**
   * Validate request based on schema name
   */
  validate = (schemaName: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const schema = this.getSchema(schemaName);
        if (!schema) {
          this.logger.warn('Validation schema not found', { schemaName });
          return next();
        }

        const { error, value } = schema.validate({
          body: req.body,
          params: req.params,
          query: req.query
        }, {
          abortEarly: false,
          allowUnknown: true,
          stripUnknown: true
        });

        if (error) {
          const validationErrors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }));

          this.logger.warn('Validation failed', {
            schemaName,
            errors: validationErrors,
            requestId: req.headers['x-request-id']
          });

          throw new ValidationError('Request validation failed', { errors: validationErrors });
        }

        // Update request with validated and sanitized data
        req.body = value.body || req.body;
        req.params = value.params || req.params;
        req.query = value.query || req.query;

        next();
      } catch (error) {
        next(error);
      }
    };
  };

  /**
   * Get validation schema by name
   */
  private getSchema(schemaName: string): Joi.ObjectSchema | null {
    const schemas = this.getSchemas();
    return schemas[schemaName] || null;
  }

  /**
   * Define all validation schemas
   */
  private getSchemas(): Record<string, Joi.ObjectSchema> {
    return {
      // Token schemas
      createToken: Joi.object({
        body: Joi.object({
          name: Joi.string().min(1).max(100).required(),
          symbol: Joi.string().min(1).max(10).uppercase().required(),
          decimals: Joi.number().integer().min(0).max(18).default(18),
          maxSupply: Joi.string().pattern(/^\d+(\.\d+)?$/).optional(),
          tokenType: Joi.string().valid(...Object.values(TokenType)).default(TokenType.ASSET_BACKED),
          tokenStandard: Joi.string().valid(...Object.values(TokenStandard)).default(TokenStandard.ERC20),
          assetType: Joi.string().valid(...Object.values(AssetType)).required(),
          backingAssetId: Joi.string().min(1).required(),
          reserveRatio: Joi.string().pattern(/^\d+(\.\d+)?$/).default('1.0'),
          reserveType: Joi.string().valid(...Object.values(ReserveType)).default(ReserveType.FULL_RESERVE),
          custodyType: Joi.string().valid(...Object.values(CustodyType)).default(CustodyType.THIRD_PARTY),
          metadata: Joi.object({
            description: Joi.string().min(1).max(1000).required(),
            image: Joi.string().uri().optional(),
            externalUrl: Joi.string().uri().optional(),
            attributes: Joi.array().items(Joi.object({
              traitType: Joi.string().required(),
              value: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
              displayType: Joi.string().optional()
            })).default([]),
            properties: Joi.object().default({}),
            backingAssetDetails: Joi.object({
              assetId: Joi.string().required(),
              assetType: Joi.string().valid(...Object.values(AssetType)).required(),
              grade: Joi.string().optional(),
              purity: Joi.string().pattern(/^\d+(\.\d+)?$/).optional(),
              weight: Joi.string().pattern(/^\d+(\.\d+)?$/).optional(),
              unit: Joi.string().optional(),
              origin: Joi.string().optional(),
              certificationNumber: Joi.string().optional(),
              storageLocation: Joi.string().optional(),
              custodian: Joi.string().optional(),
              insurancePolicy: Joi.string().optional()
            }).required()
          }).required(),
          compliance: Joi.object({
            isCompliant: Joi.boolean().default(false),
            lastCheck: Joi.date().required(),
            nextCheck: Joi.date().required(),
            requirements: Joi.array().items(Joi.string()).default([]),
            exemptions: Joi.array().items(Joi.string()).default([]),
            jurisdiction: Joi.string().required()
          }).required(),
          audit: Joi.object({
            lastAudit: Joi.date().required(),
            nextAudit: Joi.date().required(),
            auditor: Joi.string().required(),
            status: Joi.string().required(),
            findings: Joi.array().items(Joi.string()).default([]),
            recommendations: Joi.array().items(Joi.string()).default([])
          }).required()
        }).required()
      }),

      getToken: Joi.object({
        params: Joi.object({
          tokenId: Joi.string().required()
        }).required()
      }),

      listTokens: Joi.object({
        query: Joi.object({
          page: Joi.number().integer().min(1).default(1),
          limit: Joi.number().integer().min(1).max(100).default(20),
          sort: Joi.string().default('-createdAt'),
          assetType: Joi.string().valid(...Object.values(AssetType)).optional(),
          status: Joi.string().valid(...Object.values(TokenStatus)).optional(),
          search: Joi.string().min(1).max(100).optional()
        })
      }),

      updateTokenStatus: Joi.object({
        params: Joi.object({
          tokenId: Joi.string().required()
        }).required(),
        body: Joi.object({
          status: Joi.string().valid(...Object.values(TokenStatus)).required(),
          reason: Joi.string().max(500).optional()
        }).required()
      }),

      getTokenMetrics: Joi.object({
        params: Joi.object({
          tokenId: Joi.string().required()
        }).required()
      }),

      // Minting schemas
      createMintingRequest: Joi.object({
        body: Joi.object({
          tokenId: Joi.string().required(),
          amount: Joi.string().pattern(/^\d+(\.\d+)?$/).required(),
          depositId: Joi.string().required(),
          metadata: Joi.object().default({})
        }).required()
      }),

      getMintingRequest: Joi.object({
        params: Joi.object({
          requestId: Joi.string().required()
        }).required()
      }),

      listMintingRequests: Joi.object({
        query: Joi.object({
          page: Joi.number().integer().min(1).default(1),
          limit: Joi.number().integer().min(1).max(100).default(20),
          sort: Joi.string().default('-createdAt'),
          tokenId: Joi.string().optional(),
          status: Joi.string().valid(...Object.values(MintingStatus)).optional(),
          userId: Joi.string().optional()
        })
      }),

      // Burning schemas
      createBurningRequest: Joi.object({
        body: Joi.object({
          tokenId: Joi.string().required(),
          amount: Joi.string().pattern(/^\d+(\.\d+)?$/).required(),
          withdrawalId: Joi.string().optional(),
          metadata: Joi.object().default({})
        }).required()
      }),

      getBurningRequest: Joi.object({
        params: Joi.object({
          requestId: Joi.string().required()
        }).required()
      }),

      listBurningRequests: Joi.object({
        query: Joi.object({
          page: Joi.number().integer().min(1).default(1),
          limit: Joi.number().integer().min(1).max(100).default(20),
          sort: Joi.string().default('-createdAt'),
          tokenId: Joi.string().optional(),
          status: Joi.string().valid(...Object.values(BurningStatus)).optional(),
          userId: Joi.string().optional()
        })
      }),

      // Deposit schemas
      createDeposit: Joi.object({
        body: Joi.object({
          assetType: Joi.string().valid(...Object.values(AssetType)).required(),
          amount: Joi.string().pattern(/^\d+(\.\d+)?$/).required(),
          unit: Joi.string().required(),
          verificationDocuments: Joi.array().items(Joi.object({
            documentId: Joi.string().required(),
            type: Joi.string().required(),
            name: Joi.string().required(),
            url: Joi.string().uri().required(),
            hash: Joi.string().required()
          })).default([]),
          storageLocation: Joi.string().required(),
          custodian: Joi.string().required(),
          insurancePolicy: Joi.string().optional(),
          estimatedValue: Joi.string().pattern(/^\d+(\.\d+)?$/).required(),
          currency: Joi.string().length(3).uppercase().default('USD')
        }).required()
      }),

      getDeposit: Joi.object({
        params: Joi.object({
          depositId: Joi.string().required()
        }).required()
      }),

      listDeposits: Joi.object({
        query: Joi.object({
          page: Joi.number().integer().min(1).default(1),
          limit: Joi.number().integer().min(1).max(100).default(20),
          sort: Joi.string().default('-createdAt'),
          assetType: Joi.string().valid(...Object.values(AssetType)).optional(),
          status: Joi.string().valid(...Object.values(DepositStatus)).optional(),
          userId: Joi.string().optional()
        })
      }),

      // Withdrawal schemas
      createWithdrawal: Joi.object({
        body: Joi.object({
          tokenId: Joi.string().required(),
          amount: Joi.string().pattern(/^\d+(\.\d+)?$/).required(),
          assetAmount: Joi.string().pattern(/^\d+(\.\d+)?$/).required(),
          deliveryAddress: Joi.object({
            name: Joi.string().required(),
            addressLine1: Joi.string().required(),
            addressLine2: Joi.string().optional(),
            city: Joi.string().required(),
            state: Joi.string().required(),
            postalCode: Joi.string().required(),
            country: Joi.string().length(2).uppercase().required(),
            phone: Joi.string().optional(),
            email: Joi.string().email().optional()
          }).required()
        }).required()
      }),

      getWithdrawal: Joi.object({
        params: Joi.object({
          withdrawalId: Joi.string().required()
        }).required()
      }),

      // Reserve schemas
      getReserveBalance: Joi.object({
        params: Joi.object({
          tokenId: Joi.string().required()
        }).required()
      }),

      auditReserves: Joi.object({
        params: Joi.object({
          tokenId: Joi.string().required()
        }).required()
      }),

      // Health check schema
      healthCheck: Joi.object({})
    };
  }

  /**
   * Validate decimal string
   */
  private validateDecimal = (value: string, helpers: any) => {
    if (!/^\d+(\.\d+)?$/.test(value)) {
      return helpers.error('any.invalid');
    }
    
    try {
      const decimal = parseFloat(value);
      if (decimal <= 0) {
        return helpers.error('number.positive');
      }
      return value;
    } catch (error) {
      return helpers.error('any.invalid');
    }
  };

  /**
   * Validate Ethereum address
   */
  private validateEthereumAddress = (value: string, helpers: any) => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
      return helpers.error('any.invalid');
    }
    return value;
  };

  /**
   * Validate transaction hash
   */
  private validateTransactionHash = (value: string, helpers: any) => {
    if (!/^0x[a-fA-F0-9]{64}$/.test(value)) {
      return helpers.error('any.invalid');
    }
    return value;
  };

  /**
   * Custom Joi extensions
   */
  private getCustomJoi(): typeof Joi {
    return Joi.extend({
      type: 'decimal',
      base: Joi.string(),
      messages: {
        'decimal.invalid': 'must be a valid decimal number',
        'decimal.positive': 'must be a positive number'
      },
      validate: this.validateDecimal
    }).extend({
      type: 'ethereumAddress',
      base: Joi.string(),
      messages: {
        'ethereumAddress.invalid': 'must be a valid Ethereum address'
      },
      validate: this.validateEthereumAddress
    }).extend({
      type: 'transactionHash',
      base: Joi.string(),
      messages: {
        'transactionHash.invalid': 'must be a valid transaction hash'
      },
      validate: this.validateTransactionHash
    });
  }

  /**
   * Sanitize input data
   */
  sanitize = (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Sanitize strings in body
      if (req.body && typeof req.body === 'object') {
        req.body = this.sanitizeObject(req.body);
      }

      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        req.query = this.sanitizeObject(req.query);
      }

      next();
    } catch (error) {
      this.logger.error('Input sanitization failed', {
        error: error.message,
        requestId: req.headers['x-request-id']
      });
      next(error);
    }
  };

  /**
   * Recursively sanitize object properties
   */
  private sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize string input
   */
  private sanitizeString(str: string): string {
    return str
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, ''); // Remove event handlers
  }
}

// Create singleton instance
const validationMiddleware = new ValidationMiddleware();

// Export validation function
export const validate = validationMiddleware.validate;
export const sanitize = validationMiddleware.sanitize;

// Export default as validation function
export default validationMiddleware.validate;

// Export the class for testing
export { ValidationMiddleware };

