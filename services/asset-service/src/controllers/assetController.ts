import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';
import { AssetRequest, ServiceResponse, CreateAssetRequest, UpdateAssetRequest } from '../types';
import { Asset } from '../models/Asset';
import { AssetWallet } from '../models/AssetWallet';
import { Logger } from '../utils/Logger';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ValidationError,
  ForbiddenError,
  InternalServerError
} from '../utils/Errors';
import {
  AssetType,
  AssetSymbol,
  AssetStatus,
  WalletType,
  WalletStatus,
  PriceSource
} from '../enums/assetEnums';

const logger = new Logger('AssetController');

export class AssetController {
  // Asset management endpoints
  
  /**
   * Create a new asset
   */
  public async createAsset(req: AssetRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        symbol,
        name,
        description,
        type,
        class: assetClass,
        metadata,
        pricing,
        trading,
        storage
      }: CreateAssetRequest = req.body;

      // Check if asset already exists
      const existingAsset = await Asset.findOne({ symbol });
      if (existingAsset) {
        throw new ConflictError(`Asset with symbol ${symbol} already exists`);
      }

      // Create new asset
      const assetId = uuidv4();
      const asset = new Asset({
        id: assetId,
        symbol,
        name,
        description,
        type,
        class: assetClass,
        status: AssetStatus.ACTIVE,
        metadata: {
          ...metadata,
          unit: metadata.unit || 'unit'
        },
        pricing: {
          currentPrice: new Decimal(pricing.currentPrice || 0).toString(),
          currency: pricing.currency || 'USD',
          lastUpdated: new Date(),
          priceSource: pricing.priceSource || PriceSource.INTERNAL,
          ...pricing
        },
        trading: {
          isActive: trading?.isActive ?? true,
          minOrderSize: new Decimal(trading?.minOrderSize || 0.01).toString(),
          maxOrderSize: new Decimal(trading?.maxOrderSize || 1000000).toString(),
          tickSize: new Decimal(trading?.tickSize || 0.01).toString(),
          lotSize: new Decimal(trading?.lotSize || 1).toString(),
          fees: {
            maker: new Decimal(trading?.fees?.maker || 0.001).toString(),
            taker: new Decimal(trading?.fees?.taker || 0.002).toString(),
            withdrawal: new Decimal(trading?.fees?.withdrawal || 0.005).toString(),
            deposit: new Decimal(trading?.fees?.deposit || 0).toString()
          },
          ...trading
        },
        risk: {
          level: 'medium',
          volatility: new Decimal(0.1).toString(),
          liquidity: 'medium',
          regulatoryStatus: 'compliant'
        },
        storage: {
          type: storage?.type || 'digital_wallet',
          custody: storage?.custody || 'self_custody',
          ...storage
        },
        certifications: [],
        auditTrail: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: req.user?.id || 'system',
        version: 1
      });

      await asset.save();

      await asset.audit('asset_created', req.user?.id || 'system', {
        assetId,
        symbol,
        type,
        ipAddress: req.clientIp
      });

      logger.info('Asset created successfully', {
        assetId,
        symbol,
        type,
        createdBy: req.user?.id
      });

      const response: ServiceResponse = {
        success: true,
        data: asset,
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get asset by ID or symbol
   */
  public async getAsset(req: AssetRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { assetId } = req.params;

      const asset = await Asset.findOne({
        $or: [{ id: assetId }, { symbol: assetId }],
        isActive: true
      });

      if (!asset) {
        throw new NotFoundError(`Asset with ID or symbol ${assetId} not found`);
      }

      const response: ServiceResponse = {
        success: true,
        data: asset,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update asset
   */
  public async updateAsset(req: AssetRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { assetId } = req.params;
      const updateData: UpdateAssetRequest = req.body;

      const asset = await Asset.findOne({
        $or: [{ id: assetId }, { symbol: assetId }],
        isActive: true
      });

      if (!asset) {
        throw new NotFoundError(`Asset with ID or symbol ${assetId} not found`);
      }

      // Update fields
      if (updateData.name) asset.name = updateData.name;
      if (updateData.description !== undefined) asset.description = updateData.description;
      if (updateData.status) asset.status = updateData.status;
      
      if (updateData.metadata) {
        asset.metadata = { ...asset.metadata, ...updateData.metadata };
      }
      
      if (updateData.pricing) {
        asset.pricing = { ...asset.pricing, ...updateData.pricing };
        asset.pricing.lastUpdated = new Date();
      }
      
      if (updateData.trading) {
        asset.trading = { ...asset.trading, ...updateData.trading };
      }
      
      if (updateData.storage) {
        asset.storage = { ...asset.storage, ...updateData.storage };
      }

      asset.updatedAt = new Date();
      asset.updatedBy = req.user?.id || 'system';
      asset.version += 1;

      await asset.save();

      await asset.audit('asset_updated', req.user?.id || 'system', {
        assetId: asset.id,
        updatedFields: Object.keys(updateData),
        ipAddress: req.clientIp
      });

      logger.info('Asset updated successfully', {
        assetId: asset.id,
        symbol: asset.symbol,
        updatedBy: req.user?.id
      });

      const response: ServiceResponse = {
        success: true,
        data: asset,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete asset (soft delete)
   */
  public async deleteAsset(req: AssetRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { assetId } = req.params;

      const asset = await Asset.findOne({
        $or: [{ id: assetId }, { symbol: assetId }],
        isActive: true
      });

      if (!asset) {
        throw new NotFoundError(`Asset with ID or symbol ${assetId} not found`);
      }

      // Check if there are active wallets for this asset
      const activeWallets = await AssetWallet.countDocuments({
        assetId: asset.id,
        isActive: true,
        status: WalletStatus.ACTIVE
      });

      if (activeWallets > 0) {
        throw new ConflictError('Cannot delete asset with active wallets');
      }

      asset.isActive = false;
      asset.status = AssetStatus.DELISTED;
      asset.updatedAt = new Date();
      asset.updatedBy = req.user?.id || 'system';

      await asset.save();

      await asset.audit('asset_deleted', req.user?.id || 'system', {
        assetId: asset.id,
        symbol: asset.symbol,
        ipAddress: req.clientIp
      });

      logger.info('Asset deleted successfully', {
        assetId: asset.id,
        symbol: asset.symbol,
        deletedBy: req.user?.id
      });

      const response: ServiceResponse = {
        success: true,
        data: { message: 'Asset deleted successfully' },
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List assets with filtering and pagination
   */
  public async listAssets(req: AssetRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        symbol,
        type,
        class: assetClass,
        status,
        minPrice,
        maxPrice,
        currency,
        isActive,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const filter: any = {};
      
      if (symbol) filter.symbol = symbol;
      if (type) filter.type = type;
      if (assetClass) filter.class = assetClass;
      if (status) filter.status = status;
      if (isActive !== undefined) filter.isActive = isActive === 'true';
      if (currency) filter['pricing.currency'] = currency;
      
      if (minPrice || maxPrice) {
        filter['pricing.currentPrice'] = {};
        if (minPrice) filter['pricing.currentPrice'].$gte = minPrice.toString();
        if (maxPrice) filter['pricing.currentPrice'].$lte = maxPrice.toString();
      }

      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
      const skip = (pageNum - 1) * limitNum;
      const sort = { [sortBy as string]: sortOrder === 'asc' ? 1 : -1 };

      const [assets, total] = await Promise.all([
        Asset.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Asset.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / limitNum);

      const response: ServiceResponse = {
        success: true,
        data: assets,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages
        },
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update asset price
   */
  public async updateAssetPrice(req: AssetRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { assetId } = req.params;
      const { price, source, currency } = req.body;

      if (!price || price <= 0) {
        throw new ValidationError('Valid price is required');
      }

      const asset = await Asset.findOne({
        $or: [{ id: assetId }, { symbol: assetId }],
        isActive: true
      });

      if (!asset) {
        throw new NotFoundError(`Asset with ID or symbol ${assetId} not found`);
      }

      const priceDecimal = new Decimal(price);
      const priceSource = source || PriceSource.INTERNAL;

      await asset.updatePrice(priceDecimal, priceSource);

      if (currency && currency !== asset.pricing.currency) {
        asset.pricing.currency = currency;
        await asset.save();
      }

      logger.info('Asset price updated', {
        assetId: asset.id,
        symbol: asset.symbol,
        oldPrice: asset.pricing.currentPrice,
        newPrice: price,
        source: priceSource
      });

      const response: ServiceResponse = {
        success: true,
        data: {
          assetId: asset.id,
          symbol: asset.symbol,
          price: priceDecimal.toNumber(),
          currency: asset.pricing.currency,
          source: priceSource,
          updatedAt: asset.pricing.lastUpdated
        },
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Wallet management endpoints

  /**
   * Create asset wallet
   */
  public async createWallet(req: AssetRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        assetId,
        walletType,
        metadata,
        security,
        limits
      } = req.body;

      const userId = req.user?.id;
      if (!userId) {
        throw new ForbiddenError('User authentication required');
      }

      // Verify asset exists
      const asset = await Asset.findOne({ id: assetId, isActive: true });
      if (!asset) {
        throw new NotFoundError(`Asset with ID ${assetId} not found`);
      }

      // Check wallet limits
      const existingWallets = await AssetWallet.countDocuments({
        userId,
        assetId,
        isActive: true
      });

      const maxWalletsPerAsset = 10; // This could be configurable
      if (existingWallets >= maxWalletsPerAsset) {
        throw new ConflictError(`Maximum ${maxWalletsPerAsset} wallets per asset exceeded`);
      }

      const walletId = uuidv4();
      const wallet = new AssetWallet({
        id: walletId,
        userId,
        assetId,
        walletType: walletType || WalletType.CUSTODIAL,
        status: WalletStatus.ACTIVE,
        balance: {
          available: '0',
          locked: '0',
          pending: '0',
          total: '0',
          lastUpdated: new Date()
        },
        security: {
          isMultiSig: security?.isMultiSig || false,
          encryptionMethod: security?.encryptionMethod || 'AES-256-GCM',
          backupExists: false,
          twoFactorEnabled: security?.twoFactorEnabled || false,
          whitelistedAddresses: security?.whitelistedAddresses || [],
          ...security
        },
        limits: {
          dailyWithdrawal: new Decimal(limits?.dailyWithdrawal || 10000).toString(),
          monthlyWithdrawal: new Decimal(limits?.monthlyWithdrawal || 100000).toString(),
          maxTransactionAmount: new Decimal(limits?.maxTransactionAmount || 50000).toString(),
          minTransactionAmount: new Decimal(limits?.minTransactionAmount || 0.01).toString(),
          dailyTransactionCount: limits?.dailyTransactionCount || 100,
          ...limits
        },
        statistics: {
          totalDeposits: '0',
          totalWithdrawals: '0',
          transactionCount: 0,
          averageTransactionAmount: '0'
        },
        metadata: {
          label: metadata?.label || `${asset.symbol} Wallet`,
          description: metadata?.description,
          tags: metadata?.tags || [],
          category: metadata?.category,
          isDefault: metadata?.isDefault || false,
          isArchived: false,
          ...metadata
        },
        auditTrail: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId
      });

      // Generate address if needed
      if (walletType !== WalletType.CUSTODIAL) {
        await wallet.generateAddress();
      }

      await wallet.save();

      await wallet.audit('wallet_created', userId, {
        walletId,
        assetId,
        walletType,
        ipAddress: req.clientIp
      });

      logger.info('Asset wallet created successfully', {
        walletId,
        userId,
        assetId,
        walletType
      });

      const response: ServiceResponse = {
        success: true,
        data: wallet,
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get wallet by ID
   */
  public async getWallet(req: AssetRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletId } = req.params;
      const userId = req.user?.id;

      const wallet = await AssetWallet.findOne({
        id: walletId,
        isActive: true
      }).populate('assetId');

      if (!wallet) {
        throw new NotFoundError(`Wallet with ID ${walletId} not found`);
      }

      // Check ownership or admin access
      if (wallet.userId !== userId && !req.user?.permissions.includes('wallet:read:all')) {
        throw new ForbiddenError('Access denied');
      }

      const response: ServiceResponse = {
        success: true,
        data: wallet,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List user wallets
   */
  public async listWallets(req: AssetRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        assetId,
        walletType,
        status,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const userId = req.user?.id;
      if (!userId) {
        throw new ForbiddenError('User authentication required');
      }

      const filter: any = { userId, isActive: true };
      
      if (assetId) filter.assetId = assetId;
      if (walletType) filter.walletType = walletType;
      if (status) filter.status = status;

      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
      const skip = (pageNum - 1) * limitNum;
      const sort = { [sortBy as string]: sortOrder === 'asc' ? 1 : -1 };

      const [wallets, total] = await Promise.all([
        AssetWallet.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limitNum)
          .populate('assetId')
          .lean(),
        AssetWallet.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / limitNum);

      const response: ServiceResponse = {
        success: true,
        data: wallets,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages
        },
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user portfolio summary
   */
  public async getPortfolio(req: AssetRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ForbiddenError('User authentication required');
      }

      const portfolio = await AssetWallet.getUserPortfolio(userId);

      let totalValue = new Decimal(0);
      const balances = portfolio.map((item: any) => {
        const balance = {
          assetId: item.assetId,
          symbol: item.assetSymbol,
          name: item.assetName,
          available: item.balance.available,
          locked: item.balance.locked,
          pending: item.balance.pending,
          total: item.balance.total,
          value: item.value,
          currency: item.currency
        };
        
        totalValue = totalValue.add(new Decimal(item.value || 0));
        return balance;
      });

      // Calculate allocation percentages
      const allocation = balances.map(balance => {
        const percentage = totalValue.gt(0) 
          ? new Decimal(balance.value).div(totalValue).mul(100).toNumber()
          : 0;
        
        return {
          assetId: balance.assetId,
          symbol: balance.symbol,
          percentage,
          value: balance.value
        };
      });

      const response: ServiceResponse = {
        success: true,
        data: {
          totalValue: totalValue.toNumber(),
          currency: 'USD',
          balances,
          allocation,
          summary: {
            totalAssets: balances.length,
            totalWallets: portfolio.length,
            lastUpdated: new Date()
          }
        },
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Health check endpoint
   */
  public async healthCheck(req: AssetRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const response: ServiceResponse = {
        success: true,
        data: {
          service: 'asset-service',
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: process.env.SERVICE_VERSION || '1.0.0',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          environment: process.env.NODE_ENV || 'development'
        },
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new AssetController();

