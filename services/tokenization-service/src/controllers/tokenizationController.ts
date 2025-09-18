import { Request, Response, NextFunction } from 'express';
import { Decimal } from 'decimal.js';
import { TokenizationService } from '../TokenizationService';
import {
  Token,
  MintingRequest,
  BurningRequest,
  Deposit,
  Withdrawal,
  ReserveBalance,
  TokenTransaction
} from '../models';
import {
  IApiResponse,
  IPaginatedResponse,
  IQueryOptions,
  ITokenizationMetrics
} from '../types';
import {
  TokenStatus,
  MintingStatus,
  BurningStatus,
  DepositStatus,
  WithdrawalStatus,
  AssetType
} from '../enums/tokenizationEnums';
import { Logger } from '../utils/Logger';
import { ErrorHandler, ValidationError, NotFoundError } from '../utils/Errors';

export class TokenizationController {
  private tokenizationService: TokenizationService;
  private logger: Logger;

  constructor() {
    this.tokenizationService = new TokenizationService();
    this.logger = new Logger('TokenizationController');
  }

  /**
   * Create a new token
   */
  createToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] as string;
      
      this.logger.logRequest(requestId, req.method, req.url, req.user?.userId);

      const tokenData = {
        ...req.body,
        createdBy: req.user?.userId
      };

      const token = await this.tokenizationService.createToken(tokenData);

      const response: IApiResponse<any> = {
        success: true,
        data: token,
        message: 'Token created successfully',
        timestamp: new Date(),
        requestId
      };

      const duration = Date.now() - startTime;
      this.logger.logResponse(requestId, 201, duration);
      this.logger.logPerformance('createToken', duration, { tokenId: token.tokenId });

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get token by ID
   */
  getToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] as string;
      const { tokenId } = req.params;

      this.logger.logRequest(requestId, req.method, req.url, req.user?.userId);

      const token = await Token.findOne({ tokenId, status: { $ne: TokenStatus.DEPRECATED } });
      if (!token) {
        throw new NotFoundError('Token', tokenId);
      }

      const response: IApiResponse<any> = {
        success: true,
        data: token.toObject(),
        timestamp: new Date(),
        requestId
      };

      const duration = Date.now() - startTime;
      this.logger.logResponse(requestId, 200, duration);

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * List tokens with filtering and pagination
   */
  listTokens = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] as string;

      this.logger.logRequest(requestId, req.method, req.url, req.user?.userId);

      const {
        page = 1,
        limit = 20,
        sort = '-createdAt',
        assetType,
        status,
        search
      } = req.query as any;

      const query: any = {};
      
      if (assetType) query.assetType = assetType;
      if (status) query.status = status;
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { symbol: { $regex: search, $options: 'i' } },
          { tokenId: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const total = await Token.countDocuments(query);
      const tokens = await Token.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const response: IApiResponse<IPaginatedResponse<any>> = {
        success: true,
        data: {
          data: tokens,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        },
        timestamp: new Date(),
        requestId
      };

      const duration = Date.now() - startTime;
      this.logger.logResponse(requestId, 200, duration);

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update token status
   */
  updateTokenStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] as string;
      const { tokenId } = req.params;
      const { status, reason } = req.body;

      this.logger.logRequest(requestId, req.method, req.url, req.user?.userId);

      const token = await Token.findOne({ tokenId });
      if (!token) {
        throw new NotFoundError('Token', tokenId);
      }

      token.status = status;
      if (reason) {
        token.metadata.properties.statusChangeReason = reason;
      }
      
      await token.save();

      const response: IApiResponse<any> = {
        success: true,
        data: token.toObject(),
        message: 'Token status updated successfully',
        timestamp: new Date(),
        requestId
      };

      const duration = Date.now() - startTime;
      this.logger.logResponse(requestId, 200, duration);

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create minting request
   */
  createMintingRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] as string;

      this.logger.logRequest(requestId, req.method, req.url, req.user?.userId);

      const mintingData = {
        ...req.body,
        userId: req.user?.userId
      };

      const mintingRequest = await this.tokenizationService.mintTokens(mintingData);

      const response: IApiResponse<any> = {
        success: true,
        data: mintingRequest,
        message: 'Minting request created successfully',
        timestamp: new Date(),
        requestId
      };

      const duration = Date.now() - startTime;
      this.logger.logResponse(requestId, 201, duration);
      this.logger.logTransaction(mintingRequest.requestId, 'mint', mintingRequest.amount.toString(), mintingRequest.status);

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get minting request by ID
   */
  getMintingRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] as string;
      const { requestId: mintingRequestId } = req.params;

      this.logger.logRequest(requestId, req.method, req.url, req.user?.userId);

      const mintingRequest = await MintingRequest.findOne({ requestId: mintingRequestId });
      if (!mintingRequest) {
        throw new NotFoundError('Minting request', mintingRequestId);
      }

      const response: IApiResponse<any> = {
        success: true,
        data: mintingRequest.toObject(),
        timestamp: new Date(),
        requestId
      };

      const duration = Date.now() - startTime;
      this.logger.logResponse(requestId, 200, duration);

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * List minting requests
   */
  listMintingRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] as string;

      this.logger.logRequest(requestId, req.method, req.url, req.user?.userId);

      const {
        page = 1,
        limit = 20,
        sort = '-createdAt',
        tokenId,
        status,
        userId
      } = req.query as any;

      const query: any = {};
      
      if (tokenId) query.tokenId = tokenId;
      if (status) query.status = status;
      if (userId) query.userId = userId;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const total = await MintingRequest.countDocuments(query);
      const requests = await MintingRequest.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const response: IApiResponse<IPaginatedResponse<any>> = {
        success: true,
        data: {
          data: requests,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        },
        timestamp: new Date(),
        requestId
      };

      const duration = Date.now() - startTime;
      this.logger.logResponse(requestId, 200, duration);

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create burning request
   */
  createBurningRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] as string;

      this.logger.logRequest(requestId, req.method, req.url, req.user?.userId);

      const burningData = {
        ...req.body,
        userId: req.user?.userId
      };

      const burningRequest = await this.tokenizationService.burnTokens(burningData);

      const response: IApiResponse<any> = {
        success: true,
        data: burningRequest,
        message: 'Burning request created successfully',
        timestamp: new Date(),
        requestId
      };

      const duration = Date.now() - startTime;
      this.logger.logResponse(requestId, 201, duration);
      this.logger.logTransaction(burningRequest.requestId, 'burn', burningRequest.amount.toString(), burningRequest.status);

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get burning request by ID
   */
  getBurningRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] as string;
      const { requestId: burningRequestId } = req.params;

      this.logger.logRequest(requestId, req.method, req.url, req.user?.userId);

      const burningRequest = await BurningRequest.findOne({ requestId: burningRequestId });
      if (!burningRequest) {
        throw new NotFoundError('Burning request', burningRequestId);
      }

      const response: IApiResponse<any> = {
        success: true,
        data: burningRequest.toObject(),
        timestamp: new Date(),
        requestId
      };

      const duration = Date.now() - startTime;
      this.logger.logResponse(requestId, 200, duration);

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * List burning requests
   */
  listBurningRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] as string;

      this.logger.logRequest(requestId, req.method, req.url, req.user?.userId);

      const {
        page = 1,
        limit = 20,
        sort = '-createdAt',
        tokenId,
        status,
        userId
      } = req.query as any;

      const query: any = {};
      
      if (tokenId) query.tokenId = tokenId;
      if (status) query.status = status;
      if (userId) query.userId = userId;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const total = await BurningRequest.countDocuments(query);
      const requests = await BurningRequest.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const response: IApiResponse<IPaginatedResponse<any>> = {
        success: true,
        data: {
          data: requests,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        },
        timestamp: new Date(),
        requestId
      };

      const duration = Date.now() - startTime;
      this.logger.logResponse(requestId, 200, duration);

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create deposit
   */
  createDeposit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] as string;

      this.logger.logRequest(requestId, req.method, req.url, req.user?.userId);

      const depositData = {
        ...req.body,
        userId: req.user?.userId
      };

      const deposit = await this.tokenizationService.processDeposit(depositData);

      const response: IApiResponse<any> = {
        success: true,
        data: deposit,
        message: 'Deposit created successfully',
        timestamp: new Date(),
        requestId
      };

      const duration = Date.now() - startTime;
      this.logger.logResponse(requestId, 201, duration);

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get deposit by ID
   */
  getDeposit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] as string;
      const { depositId } = req.params;

      this.logger.logRequest(requestId, req.method, req.url, req.user?.userId);

      const deposit = await Deposit.findOne({ depositId });
      if (!deposit) {
        throw new NotFoundError('Deposit', depositId);
      }

      const response: IApiResponse<any> = {
        success: true,
        data: deposit.toObject(),
        timestamp: new Date(),
        requestId
      };

      const duration = Date.now() - startTime;
      this.logger.logResponse(requestId, 200, duration);

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * List deposits
   */
  listDeposits = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] as string;

      this.logger.logRequest(requestId, req.method, req.url, req.user?.userId);

      const {
        page = 1,
        limit = 20,
        sort = '-createdAt',
        assetType,
        status,
        userId
      } = req.query as any;

      const query: any = {};
      
      if (assetType) query.assetType = assetType;
      if (status) query.status = status;
      if (userId) query.userId = userId;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const total = await Deposit.countDocuments(query);
      const deposits = await Deposit.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const response: IApiResponse<IPaginatedResponse<any>> = {
        success: true,
        data: {
          data: deposits,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        },
        timestamp: new Date(),
        requestId
      };

      const duration = Date.now() - startTime;
      this.logger.logResponse(requestId, 200, duration);

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create withdrawal
   */
  createWithdrawal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] as string;

      this.logger.logRequest(requestId, req.method, req.url, req.user?.userId);

      const withdrawalData = {
        ...req.body,
        userId: req.user?.userId
      };

      const withdrawal = await this.tokenizationService.processWithdrawal(withdrawalData);

      const response: IApiResponse<any> = {
        success: true,
        data: withdrawal,
        message: 'Withdrawal created successfully',
        timestamp: new Date(),
        requestId
      };

      const duration = Date.now() - startTime;
      this.logger.logResponse(requestId, 201, duration);

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get withdrawal by ID
   */
  getWithdrawal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] as string;
      const { withdrawalId } = req.params;

      this.logger.logRequest(requestId, req.method, req.url, req.user?.userId);

      const withdrawal = await Withdrawal.findOne({ withdrawalId });
      if (!withdrawal) {
        throw new NotFoundError('Withdrawal', withdrawalId);
      }

      const response: IApiResponse<any> = {
        success: true,
        data: withdrawal.toObject(),
        timestamp: new Date(),
        requestId
      };

      const duration = Date.now() - startTime;
      this.logger.logResponse(requestId, 200, duration);

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get reserve balance for a token
   */
  getReserveBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] as string;
      const { tokenId } = req.params;

      this.logger.logRequest(requestId, req.method, req.url, req.user?.userId);

      const reserve = await ReserveBalance.findOne({ tokenId });
      if (!reserve) {
        throw new NotFoundError('Reserve balance', tokenId);
      }

      const response: IApiResponse<any> = {
        success: true,
        data: reserve.toObject(),
        timestamp: new Date(),
        requestId
      };

      const duration = Date.now() - startTime;
      this.logger.logResponse(requestId, 200, duration);

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Audit reserves for a token
   */
  auditReserves = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] as string;
      const { tokenId } = req.params;

      this.logger.logRequest(requestId, req.method, req.url, req.user?.userId);

      const auditResult = await this.tokenizationService.auditReserves(tokenId);

      const response: IApiResponse<any> = {
        success: true,
        data: auditResult,
        message: 'Reserve audit completed',
        timestamp: new Date(),
        requestId
      };

      const duration = Date.now() - startTime;
      this.logger.logResponse(requestId, 200, duration);
      this.logger.logAudit(auditResult.auditId, tokenId, auditResult.findings, auditResult.status);

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get token metrics
   */
  getTokenMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] as string;
      const { tokenId } = req.params;

      this.logger.logRequest(requestId, req.method, req.url, req.user?.userId);

      const metrics = await this.tokenizationService.getTokenMetrics(tokenId);

      const response: IApiResponse<ITokenizationMetrics> = {
        success: true,
        data: metrics,
        timestamp: new Date(),
        requestId
      };

      const duration = Date.now() - startTime;
      this.logger.logResponse(requestId, 200, duration);

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get dashboard statistics
   */
  getDashboardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] as string;

      this.logger.logRequest(requestId, req.method, req.url, req.user?.userId);

      const [
        totalTokens,
        activeTokens,
        totalMintingRequests,
        pendingMintingRequests,
        totalBurningRequests,
        pendingBurningRequests,
        totalDeposits,
        verifiedDeposits,
        totalWithdrawals,
        pendingWithdrawals
      ] = await Promise.all([
        Token.countDocuments(),
        Token.countDocuments({ status: TokenStatus.ACTIVE }),
        MintingRequest.countDocuments(),
        MintingRequest.countDocuments({ status: { $in: [MintingStatus.PENDING, MintingStatus.PROCESSING] } }),
        BurningRequest.countDocuments(),
        BurningRequest.countDocuments({ status: { $in: [BurningStatus.PENDING, BurningStatus.PROCESSING] } }),
        Deposit.countDocuments(),
        Deposit.countDocuments({ status: DepositStatus.VERIFIED }),
        Withdrawal.countDocuments(),
        Withdrawal.countDocuments({ status: { $in: [WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING] } })
      ]);

      const stats = {
        tokens: {
          total: totalTokens,
          active: activeTokens
        },
        minting: {
          total: totalMintingRequests,
          pending: pendingMintingRequests
        },
        burning: {
          total: totalBurningRequests,
          pending: pendingBurningRequests
        },
        deposits: {
          total: totalDeposits,
          verified: verifiedDeposits
        },
        withdrawals: {
          total: totalWithdrawals,
          pending: pendingWithdrawals
        }
      };

      const response: IApiResponse<any> = {
        success: true,
        data: stats,
        timestamp: new Date(),
        requestId
      };

      const duration = Date.now() - startTime;
      this.logger.logResponse(requestId, 200, duration);

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Health check endpoint
   */
  healthCheck = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] as string || 'health-check';

      // Check database connectivity
      const dbStatus = await this.checkDatabaseHealth();
      
      // Check external services
      const externalServices = await this.checkExternalServices();

      const health = {
        status: 'healthy',
        timestamp: new Date(),
        uptime: process.uptime(),
        version: process.env.SERVICE_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        database: dbStatus,
        externalServices,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      };

      const duration = Date.now() - startTime;
      this.logger.logResponse(requestId, 200, duration);

      res.json(health);
    } catch (error) {
      next(error);
    }
  };

  private async checkDatabaseHealth(): Promise<any> {
    try {
      await Token.findOne().limit(1);
      return { status: 'connected', latency: Date.now() };
    } catch (error) {
      return { status: 'disconnected', error: error.message };
    }
  }

  private async checkExternalServices(): Promise<any> {
    // This would check external service health
    // For now, return a placeholder
    return {
      compliance: { status: 'unknown' },
      account: { status: 'unknown' },
      transaction: { status: 'unknown' }
    };
  }
}

