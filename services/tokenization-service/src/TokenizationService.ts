import { Decimal } from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';
import {
  ITokenizationService,
  IToken,
  IMintingRequest,
  IBurningRequest,
  IDeposit,
  IWithdrawal,
  IReserveBalance,
  IComplianceCheck,
  IAuditRecord,
  ITokenizationMetrics,
  ITokenizationConfig
} from './types';
import {
  TokenType,
  TokenStandard,
  TokenStatus,
  MintingStatus,
  BurningStatus,
  DepositStatus,
  WithdrawalStatus,
  ComplianceStatus,
  AuditStatus,
  AssetType,
  CustodyType,
  ReserveType
} from './enums/tokenizationEnums';
import {
  Token,
  MintingRequest,
  BurningRequest,
  Deposit,
  Withdrawal,
  ReserveBalance,
  TokenTransaction
} from './models';
import { Logger } from './utils/Logger';
import { EventBus } from './utils/EventBus';
import { HttpClient } from './utils/HttpClient';
import { 
  TokenizationError, 
  ValidationError, 
  ComplianceError, 
  InsufficientReservesError 
} from './utils/Errors';

export class TokenizationService implements ITokenizationService {
  private logger: Logger;
  private eventBus: EventBus;
  private httpClient: HttpClient;
  private config: ITokenizationConfig;

  constructor() {
    this.logger = new Logger('TokenizationService');
    this.eventBus = new EventBus();
    this.httpClient = new HttpClient();
    this.config = this.loadConfiguration();
  }

  private loadConfiguration(): ITokenizationConfig {
    return {
      minMintAmount: new Decimal(process.env.MIN_MINT_AMOUNT || '0.001'),
      maxMintAmount: new Decimal(process.env.MAX_MINT_AMOUNT || '1000000'),
      minBurnAmount: new Decimal(process.env.MIN_BURN_AMOUNT || '0.001'),
      maxBurnAmount: new Decimal(process.env.MAX_BURN_AMOUNT || '1000000'),
      mintingFee: new Decimal(process.env.MINTING_FEE || '0.001'),
      burningFee: new Decimal(process.env.BURNING_FEE || '0.001'),
      reserveRatio: new Decimal(process.env.RESERVE_RATIO || '1.0'),
      auditFrequency: parseInt(process.env.AUDIT_FREQUENCY || '30'),
      complianceChecks: (process.env.COMPLIANCE_CHECKS || 'KYC,AML,SANCTIONS').split(','),
      supportedAssets: Object.values(AssetType),
      custodyProviders: (process.env.CUSTODY_PROVIDERS || 'BRINKS,LOOMIS,MALCA_AMIT').split(',')
    };
  }

  /**
   * Create a new token backed by real-world assets
   */
  async createToken(tokenData: Partial<IToken>): Promise<IToken> {
    try {
      this.logger.info('Creating new token', { tokenData });

      // Validate token data
      this.validateTokenData(tokenData);

      // Generate unique token ID
      const tokenId = this.generateTokenId(tokenData.symbol!, tokenData.assetType!);

      // Create token with default values
      const token = new Token({
        tokenId,
        name: tokenData.name,
        symbol: tokenData.symbol?.toUpperCase(),
        decimals: tokenData.decimals || 18,
        totalSupply: new Decimal(0),
        circulatingSupply: new Decimal(0),
        maxSupply: tokenData.maxSupply,
        tokenType: tokenData.tokenType || TokenType.ASSET_BACKED,
        tokenStandard: tokenData.tokenStandard || TokenStandard.ERC20,
        status: TokenStatus.ACTIVE,
        assetType: tokenData.assetType!,
        backingAssetId: tokenData.backingAssetId!,
        reserveRatio: tokenData.reserveRatio || this.config.reserveRatio,
        reserveType: tokenData.reserveType || ReserveType.FULL_RESERVE,
        custodyType: tokenData.custodyType || CustodyType.THIRD_PARTY,
        metadata: tokenData.metadata!,
        compliance: tokenData.compliance!,
        audit: tokenData.audit!,
        createdBy: tokenData.createdBy!
      });

      const savedToken = await token.save();

      // Initialize reserve balance
      await this.initializeReserveBalance(tokenId, tokenData.assetType!);

      // Emit token created event
      this.eventBus.emit('token.created', {
        tokenId,
        assetType: tokenData.assetType,
        createdBy: tokenData.createdBy
      });

      this.logger.info('Token created successfully', { tokenId });
      return savedToken.toObject();

    } catch (error) {
      this.logger.error('Failed to create token', { error, tokenData });
      throw new TokenizationError('Failed to create token', error);
    }
  }

  /**
   * Mint tokens based on verified deposits
   */
  async mintTokens(mintingRequest: Partial<IMintingRequest>): Promise<IMintingRequest> {
    try {
      this.logger.info('Processing minting request', { mintingRequest });

      // Validate minting request
      this.validateMintingRequest(mintingRequest);

      // Generate unique request ID
      const requestId = this.generateRequestId('MINT');

      // Verify deposit exists and is verified
      const deposit = await this.verifyDeposit(mintingRequest.depositId!);

      // Perform compliance checks
      const complianceCheck = await this.performCompliance(
        mintingRequest.userId!,
        'minting'
      );

      if (complianceCheck.status !== ComplianceStatus.COMPLIANT) {
        throw new ComplianceError('Compliance check failed for minting request');
      }

      // Create minting request
      const request = new MintingRequest({
        requestId,
        tokenId: mintingRequest.tokenId,
        userId: mintingRequest.userId,
        amount: mintingRequest.amount,
        depositId: mintingRequest.depositId,
        status: MintingStatus.PENDING,
        compliance: complianceCheck,
        metadata: mintingRequest.metadata || {}
      });

      const savedRequest = await request.save();

      // Process minting if auto-processing is enabled
      if (complianceCheck.status === ComplianceStatus.COMPLIANT) {
        await this.processMinting(savedRequest);
      }

      this.logger.info('Minting request created', { requestId });
      return savedRequest.toObject();

    } catch (error) {
      this.logger.error('Failed to create minting request', { error, mintingRequest });
      throw new TokenizationError('Failed to create minting request', error);
    }
  }

  /**
   * Burn tokens and initiate withdrawal process
   */
  async burnTokens(burningRequest: Partial<IBurningRequest>): Promise<IBurningRequest> {
    try {
      this.logger.info('Processing burning request', { burningRequest });

      // Validate burning request
      this.validateBurningRequest(burningRequest);

      // Generate unique request ID
      const requestId = this.generateRequestId('BURN');

      // Verify user has sufficient token balance
      await this.verifyTokenBalance(
        burningRequest.userId!,
        burningRequest.tokenId!,
        burningRequest.amount!
      );

      // Perform compliance checks
      const complianceCheck = await this.performCompliance(
        burningRequest.userId!,
        'burning'
      );

      if (complianceCheck.status !== ComplianceStatus.COMPLIANT) {
        throw new ComplianceError('Compliance check failed for burning request');
      }

      // Create burning request
      const request = new BurningRequest({
        requestId,
        tokenId: burningRequest.tokenId,
        userId: burningRequest.userId,
        amount: burningRequest.amount,
        withdrawalId: burningRequest.withdrawalId,
        status: BurningStatus.PENDING,
        compliance: complianceCheck,
        metadata: burningRequest.metadata || {}
      });

      const savedRequest = await request.save();

      // Process burning if auto-processing is enabled
      if (complianceCheck.status === ComplianceStatus.COMPLIANT) {
        await this.processBurning(savedRequest);
      }

      this.logger.info('Burning request created', { requestId });
      return savedRequest.toObject();

    } catch (error) {
      this.logger.error('Failed to create burning request', { error, burningRequest });
      throw new TokenizationError('Failed to create burning request', error);
    }
  }

  /**
   * Process asset deposit for tokenization
   */
  async processDeposit(depositData: Partial<IDeposit>): Promise<IDeposit> {
    try {
      this.logger.info('Processing deposit', { depositData });

      // Validate deposit data
      this.validateDepositData(depositData);

      // Generate unique deposit ID
      const depositId = this.generateDepositId(depositData.assetType!);

      // Perform compliance checks
      const complianceCheck = await this.performCompliance(
        depositData.userId!,
        'deposit'
      );

      // Create audit record
      const auditRecord: IAuditRecord = {
        auditId: uuidv4(),
        auditor: 'SYSTEM',
        auditDate: new Date(),
        findings: [],
        recommendations: [],
        status: AuditStatus.PENDING
      };

      // Create deposit record
      const deposit = new Deposit({
        depositId,
        userId: depositData.userId,
        assetType: depositData.assetType,
        amount: depositData.amount,
        unit: depositData.unit,
        status: DepositStatus.PENDING_VERIFICATION,
        verificationDocuments: depositData.verificationDocuments || [],
        storageLocation: depositData.storageLocation,
        custodian: depositData.custodian,
        insurancePolicy: depositData.insurancePolicy,
        estimatedValue: depositData.estimatedValue,
        currency: depositData.currency || 'USD',
        compliance: complianceCheck,
        audit: auditRecord
      });

      const savedDeposit = await deposit.save();

      // Emit deposit created event
      this.eventBus.emit('deposit.created', {
        depositId,
        userId: depositData.userId,
        assetType: depositData.assetType,
        amount: depositData.amount?.toString()
      });

      this.logger.info('Deposit created successfully', { depositId });
      return savedDeposit.toObject();

    } catch (error) {
      this.logger.error('Failed to process deposit', { error, depositData });
      throw new TokenizationError('Failed to process deposit', error);
    }
  }

  /**
   * Process withdrawal request for physical asset delivery
   */
  async processWithdrawal(withdrawalData: Partial<IWithdrawal>): Promise<IWithdrawal> {
    try {
      this.logger.info('Processing withdrawal', { withdrawalData });

      // Validate withdrawal data
      this.validateWithdrawalData(withdrawalData);

      // Generate unique withdrawal ID
      const withdrawalId = this.generateWithdrawalId();

      // Verify sufficient reserves
      await this.verifyReserveAvailability(
        withdrawalData.tokenId!,
        withdrawalData.assetAmount!
      );

      // Perform compliance checks
      const complianceCheck = await this.performCompliance(
        withdrawalData.userId!,
        'withdrawal'
      );

      if (complianceCheck.status !== ComplianceStatus.COMPLIANT) {
        throw new ComplianceError('Compliance check failed for withdrawal request');
      }

      // Calculate fees
      const fees = await this.calculateWithdrawalFees(
        withdrawalData.assetAmount!,
        withdrawalData.deliveryAddress!
      );

      // Create withdrawal record
      const withdrawal = new Withdrawal({
        withdrawalId,
        userId: withdrawalData.userId,
        tokenId: withdrawalData.tokenId,
        amount: withdrawalData.amount,
        assetAmount: withdrawalData.assetAmount,
        deliveryAddress: withdrawalData.deliveryAddress,
        status: WithdrawalStatus.PENDING,
        compliance: complianceCheck,
        fees,
        estimatedDelivery: this.calculateEstimatedDelivery(withdrawalData.deliveryAddress!)
      });

      const savedWithdrawal = await withdrawal.save();

      // Lock reserves
      await this.lockReserves(withdrawalData.tokenId!, withdrawalData.assetAmount!);

      // Emit withdrawal created event
      this.eventBus.emit('withdrawal.created', {
        withdrawalId,
        userId: withdrawalData.userId,
        tokenId: withdrawalData.tokenId,
        amount: withdrawalData.amount?.toString()
      });

      this.logger.info('Withdrawal created successfully', { withdrawalId });
      return savedWithdrawal.toObject();

    } catch (error) {
      this.logger.error('Failed to process withdrawal', { error, withdrawalData });
      throw new TokenizationError('Failed to process withdrawal', error);
    }
  }

  /**
   * Update reserve balances
   */
  async updateReserves(
    tokenId: string,
    amount: Decimal,
    action: string,
    performedBy: string = 'SYSTEM',
    reason: string = 'Automated update',
    transactionId?: string
  ): Promise<IReserveBalance> {
    try {
      this.logger.info('Updating reserves', { tokenId, amount: amount.toString(), action });

      const reserve = await ReserveBalance.findOne({ tokenId });
      if (!reserve) {
        throw new TokenizationError('Reserve balance not found for token');
      }

      // Update balances based on action
      switch (action) {
        case 'ADD':
          reserve.totalReserve = new Decimal(reserve.totalReserve.toString()).add(amount);
          reserve.availableReserve = new Decimal(reserve.availableReserve.toString()).add(amount);
          break;
        case 'REMOVE':
          reserve.totalReserve = new Decimal(reserve.totalReserve.toString()).sub(amount);
          reserve.availableReserve = new Decimal(reserve.availableReserve.toString()).sub(amount);
          break;
        case 'LOCK':
          reserve.availableReserve = new Decimal(reserve.availableReserve.toString()).sub(amount);
          reserve.lockedReserve = new Decimal(reserve.lockedReserve.toString()).add(amount);
          break;
        case 'UNLOCK':
          reserve.availableReserve = new Decimal(reserve.availableReserve.toString()).add(amount);
          reserve.lockedReserve = new Decimal(reserve.lockedReserve.toString()).sub(amount);
          break;
        default:
          throw new ValidationError('Invalid reserve action');
      }

      // Add audit trail entry
      reserve.auditTrail.push({
        timestamp: new Date(),
        action,
        amount,
        reason,
        performedBy,
        transactionId
      });

      reserve.lastUpdated = new Date();
      const savedReserve = await reserve.save();

      // Emit reserve updated event
      this.eventBus.emit('reserves.updated', {
        tokenId,
        action,
        amount: amount.toString(),
        newBalance: savedReserve.totalReserve.toString()
      });

      this.logger.info('Reserves updated successfully', { tokenId, action });
      return savedReserve.toObject();

    } catch (error) {
      this.logger.error('Failed to update reserves', { error, tokenId, action });
      throw new TokenizationError('Failed to update reserves', error);
    }
  }

  /**
   * Perform compliance checks
   */
  async performCompliance(entityId: string, entityType: string): Promise<IComplianceCheck> {
    try {
      this.logger.info('Performing compliance check', { entityId, entityType });

      // Call compliance service
      const complianceResult = await this.httpClient.post('/api/compliance/check', {
        entityId,
        entityType,
        checks: this.config.complianceChecks
      });

      const complianceCheck: IComplianceCheck = {
        status: complianceResult.isCompliant ? ComplianceStatus.COMPLIANT : ComplianceStatus.NON_COMPLIANT,
        kycStatus: complianceResult.kyc?.status || 'PENDING',
        amlStatus: complianceResult.aml?.status || 'PENDING',
        sanctionsCheck: complianceResult.sanctions?.clear || false,
        riskScore: complianceResult.riskScore || 0,
        flags: complianceResult.flags || [],
        checkedAt: new Date(),
        checkedBy: 'COMPLIANCE_SERVICE',
        notes: complianceResult.notes
      };

      this.logger.info('Compliance check completed', { entityId, status: complianceCheck.status });
      return complianceCheck;

    } catch (error) {
      this.logger.error('Compliance check failed', { error, entityId, entityType });
      
      // Return non-compliant status on error
      return {
        status: ComplianceStatus.NON_COMPLIANT,
        kycStatus: 'ERROR',
        amlStatus: 'ERROR',
        sanctionsCheck: false,
        riskScore: 100,
        flags: ['COMPLIANCE_CHECK_FAILED'],
        checkedAt: new Date(),
        notes: 'Compliance check failed due to system error'
      };
    }
  }

  /**
   * Audit reserves for a token
   */
  async auditReserves(tokenId: string): Promise<IAuditRecord> {
    try {
      this.logger.info('Auditing reserves', { tokenId });

      const token = await Token.findOne({ tokenId });
      if (!token) {
        throw new TokenizationError('Token not found');
      }

      const reserve = await ReserveBalance.findOne({ tokenId });
      if (!reserve) {
        throw new TokenizationError('Reserve balance not found');
      }

      // Perform audit calculations
      const expectedReserve = new Decimal(token.circulatingSupply.toString())
        .mul(new Decimal(token.reserveRatio.toString()));
      
      const actualReserve = new Decimal(reserve.totalReserve.toString());
      const discrepancy = actualReserve.sub(expectedReserve);
      
      const findings: string[] = [];
      const recommendations: string[] = [];

      if (discrepancy.abs().gt(new Decimal('0.001'))) {
        findings.push(`Reserve discrepancy detected: ${discrepancy.toString()}`);
        recommendations.push('Investigate reserve discrepancy and reconcile');
      }

      if (reserve.availableReserve.lt(0)) {
        findings.push('Negative available reserves detected');
        recommendations.push('Review locked reserves and pending withdrawals');
      }

      const auditRecord: IAuditRecord = {
        auditId: uuidv4(),
        auditor: 'SYSTEM_AUDIT',
        auditDate: new Date(),
        findings,
        recommendations,
        status: findings.length > 0 ? AuditStatus.FAILED : AuditStatus.COMPLETED
      };

      // Update token audit info
      token.audit.lastAudit = new Date();
      token.audit.status = auditRecord.status;
      token.audit.findings = findings;
      token.audit.recommendations = recommendations;
      await token.save();

      this.logger.info('Reserve audit completed', { tokenId, status: auditRecord.status });
      return auditRecord;

    } catch (error) {
      this.logger.error('Reserve audit failed', { error, tokenId });
      throw new TokenizationError('Reserve audit failed', error);
    }
  }

  /**
   * Get tokenization metrics
   */
  async getTokenMetrics(tokenId: string): Promise<ITokenizationMetrics> {
    try {
      const token = await Token.findOne({ tokenId });
      if (!token) {
        throw new TokenizationError('Token not found');
      }

      const reserve = await ReserveBalance.findOne({ tokenId });
      
      const mintingStats = await MintingRequest.aggregate([
        { $match: { tokenId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);

      const burningStats = await BurningRequest.aggregate([
        { $match: { tokenId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);

      const metrics: ITokenizationMetrics = {
        totalTokensIssued: 1,
        totalSupply: new Decimal(token.totalSupply.toString()),
        totalReserves: reserve ? new Decimal(reserve.totalReserve.toString()) : new Decimal(0),
        mintingRequests: {
          pending: mintingStats.find(s => s._id === MintingStatus.PENDING)?.count || 0,
          completed: mintingStats.find(s => s._id === MintingStatus.COMPLETED)?.count || 0,
          failed: mintingStats.find(s => [MintingStatus.FAILED, MintingStatus.REJECTED].includes(s._id))?.count || 0
        },
        burningRequests: {
          pending: burningStats.find(s => s._id === BurningStatus.PENDING)?.count || 0,
          completed: burningStats.find(s => s._id === BurningStatus.COMPLETED)?.count || 0,
          failed: burningStats.find(s => [BurningStatus.FAILED, BurningStatus.REJECTED].includes(s._id))?.count || 0
        },
        complianceStatus: {
          compliant: token.compliance.isCompliant ? 1 : 0,
          nonCompliant: !token.compliance.isCompliant ? 1 : 0,
          underReview: 0
        }
      };

      return metrics;

    } catch (error) {
      this.logger.error('Failed to get token metrics', { error, tokenId });
      throw new TokenizationError('Failed to get token metrics', error);
    }
  }

  // Private helper methods

  private validateTokenData(tokenData: Partial<IToken>): void {
    if (!tokenData.name) throw new ValidationError('Token name is required');
    if (!tokenData.symbol) throw new ValidationError('Token symbol is required');
    if (!tokenData.assetType) throw new ValidationError('Asset type is required');
    if (!tokenData.backingAssetId) throw new ValidationError('Backing asset ID is required');
    if (!tokenData.metadata) throw new ValidationError('Token metadata is required');
    if (!tokenData.compliance) throw new ValidationError('Compliance info is required');
    if (!tokenData.audit) throw new ValidationError('Audit info is required');
    if (!tokenData.createdBy) throw new ValidationError('Creator ID is required');
  }

  private validateMintingRequest(request: Partial<IMintingRequest>): void {
    if (!request.tokenId) throw new ValidationError('Token ID is required');
    if (!request.userId) throw new ValidationError('User ID is required');
    if (!request.amount) throw new ValidationError('Amount is required');
    if (!request.depositId) throw new ValidationError('Deposit ID is required');

    const amount = new Decimal(request.amount.toString());
    if (amount.lt(this.config.minMintAmount) || amount.gt(this.config.maxMintAmount)) {
      throw new ValidationError('Amount is outside allowed range');
    }
  }

  private validateBurningRequest(request: Partial<IBurningRequest>): void {
    if (!request.tokenId) throw new ValidationError('Token ID is required');
    if (!request.userId) throw new ValidationError('User ID is required');
    if (!request.amount) throw new ValidationError('Amount is required');

    const amount = new Decimal(request.amount.toString());
    if (amount.lt(this.config.minBurnAmount) || amount.gt(this.config.maxBurnAmount)) {
      throw new ValidationError('Amount is outside allowed range');
    }
  }

  private validateDepositData(depositData: Partial<IDeposit>): void {
    if (!depositData.userId) throw new ValidationError('User ID is required');
    if (!depositData.assetType) throw new ValidationError('Asset type is required');
    if (!depositData.amount) throw new ValidationError('Amount is required');
    if (!depositData.unit) throw new ValidationError('Unit is required');
    if (!depositData.storageLocation) throw new ValidationError('Storage location is required');
    if (!depositData.custodian) throw new ValidationError('Custodian is required');
    if (!depositData.estimatedValue) throw new ValidationError('Estimated value is required');
  }

  private validateWithdrawalData(withdrawalData: Partial<IWithdrawal>): void {
    if (!withdrawalData.userId) throw new ValidationError('User ID is required');
    if (!withdrawalData.tokenId) throw new ValidationError('Token ID is required');
    if (!withdrawalData.amount) throw new ValidationError('Amount is required');
    if (!withdrawalData.assetAmount) throw new ValidationError('Asset amount is required');
    if (!withdrawalData.deliveryAddress) throw new ValidationError('Delivery address is required');
  }

  private generateTokenId(symbol: string, assetType: AssetType): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${symbol}_${assetType}_${timestamp}_${random}`.toUpperCase();
  }

  private generateRequestId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${type}_${timestamp}_${random}`.toUpperCase();
  }

  private generateDepositId(assetType: AssetType): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `DEP_${assetType}_${timestamp}_${random}`.toUpperCase();
  }

  private generateWithdrawalId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `WTH_${timestamp}_${random}`.toUpperCase();
  }

  private async initializeReserveBalance(tokenId: string, assetType: AssetType): Promise<void> {
    const reserve = new ReserveBalance({
      tokenId,
      assetType,
      totalReserve: new Decimal(0),
      availableReserve: new Decimal(0),
      lockedReserve: new Decimal(0),
      unit: this.getAssetUnit(assetType),
      lastUpdated: new Date(),
      auditTrail: []
    });

    await reserve.save();
  }

  private getAssetUnit(assetType: AssetType): string {
    const units: Record<AssetType, string> = {
      [AssetType.GOLD]: 'oz',
      [AssetType.SILVER]: 'oz',
      [AssetType.PLATINUM]: 'oz',
      [AssetType.PALLADIUM]: 'oz',
      [AssetType.COPPER]: 'lbs',
      [AssetType.DIAMOND]: 'ct',
      [AssetType.OIL]: 'bbl',
      [AssetType.REAL_ESTATE]: 'sqft',
      [AssetType.CARBON_CREDIT]: 'tCO2',
      [AssetType.COMMODITY]: 'unit'
    };
    return units[assetType] || 'unit';
  }

  private async verifyDeposit(depositId: string): Promise<IDeposit> {
    const deposit = await Deposit.findOne({ depositId });
    if (!deposit) {
      throw new TokenizationError('Deposit not found');
    }
    if (deposit.status !== DepositStatus.VERIFIED) {
      throw new TokenizationError('Deposit is not verified');
    }
    return deposit.toObject();
  }

  private async verifyTokenBalance(userId: string, tokenId: string, amount: Decimal): Promise<void> {
    // This would typically call the account service to verify balance
    // For now, we'll assume the balance is sufficient
    this.logger.info('Verifying token balance', { userId, tokenId, amount: amount.toString() });
  }

  private async verifyReserveAvailability(tokenId: string, amount: Decimal): Promise<void> {
    const reserve = await ReserveBalance.findOne({ tokenId });
    if (!reserve) {
      throw new TokenizationError('Reserve balance not found');
    }
    
    const availableReserve = new Decimal(reserve.availableReserve.toString());
    if (availableReserve.lt(amount)) {
      throw new InsufficientReservesError('Insufficient reserves for withdrawal');
    }
  }

  private async processMinting(request: IMintingRequest & Document): Promise<void> {
    try {
      // Update status to processing
      request.status = MintingStatus.PROCESSING;
      await request.save();

      // Update token supply
      const token = await Token.findOne({ tokenId: request.tokenId });
      if (!token) {
        throw new TokenizationError('Token not found');
      }

      await token.updateSupply(new Decimal(request.amount.toString()), 'mint');

      // Update reserves
      await this.updateReserves(
        request.tokenId,
        new Decimal(request.amount.toString()),
        'ADD',
        'MINTING_PROCESS',
        `Minting request ${request.requestId}`,
        request.requestId
      );

      // Update status to completed
      request.status = MintingStatus.COMPLETED;
      request.processedAt = new Date();
      await request.save();

      // Create transaction record
      await this.createTokenTransaction({
        transactionId: uuidv4(),
        tokenId: request.tokenId,
        type: 'mint',
        to: request.userId,
        amount: new Decimal(request.amount.toString()),
        status: 'completed',
        metadata: { mintingRequestId: request.requestId }
      });

      this.logger.info('Minting processed successfully', { requestId: request.requestId });

    } catch (error) {
      request.status = MintingStatus.FAILED;
      request.reason = error.message;
      request.processedAt = new Date();
      await request.save();
      
      this.logger.error('Minting processing failed', { error, requestId: request.requestId });
      throw error;
    }
  }

  private async processBurning(request: IBurningRequest & Document): Promise<void> {
    try {
      // Update status to processing
      request.status = BurningStatus.PROCESSING;
      await request.save();

      // Update token supply
      const token = await Token.findOne({ tokenId: request.tokenId });
      if (!token) {
        throw new TokenizationError('Token not found');
      }

      await token.updateSupply(new Decimal(request.amount.toString()), 'burn');

      // Update reserves
      await this.updateReserves(
        request.tokenId,
        new Decimal(request.amount.toString()),
        'REMOVE',
        'BURNING_PROCESS',
        `Burning request ${request.requestId}`,
        request.requestId
      );

      // Update status to completed
      request.status = BurningStatus.COMPLETED;
      request.processedAt = new Date();
      await request.save();

      // Create transaction record
      await this.createTokenTransaction({
        transactionId: uuidv4(),
        tokenId: request.tokenId,
        type: 'burn',
        from: request.userId,
        amount: new Decimal(request.amount.toString()),
        status: 'completed',
        metadata: { burningRequestId: request.requestId }
      });

      this.logger.info('Burning processed successfully', { requestId: request.requestId });

    } catch (error) {
      request.status = BurningStatus.FAILED;
      request.reason = error.message;
      request.processedAt = new Date();
      await request.save();
      
      this.logger.error('Burning processing failed', { error, requestId: request.requestId });
      throw error;
    }
  }

  private async lockReserves(tokenId: string, amount: Decimal): Promise<void> {
    await this.updateReserves(
      tokenId,
      amount,
      'LOCK',
      'WITHDRAWAL_PROCESS',
      'Locking reserves for withdrawal'
    );
  }

  private async calculateWithdrawalFees(amount: Decimal, deliveryAddress: any): Promise<any> {
    // Calculate fees based on amount and delivery location
    const processingFee = amount.mul(this.config.burningFee);
    const shippingFee = new Decimal('50'); // Base shipping fee
    const insuranceFee = amount.mul(new Decimal('0.001')); // 0.1% insurance
    const totalFee = processingFee.add(shippingFee).add(insuranceFee);

    return {
      processingFee,
      shippingFee,
      insuranceFee,
      totalFee,
      currency: 'USD'
    };
  }

  private calculateEstimatedDelivery(deliveryAddress: any): Date {
    // Calculate estimated delivery based on location
    const baseDeliveryDays = 7; // Base delivery time
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + baseDeliveryDays);
    return estimatedDelivery;
  }

  private async createTokenTransaction(transactionData: any): Promise<void> {
    const transaction = new TokenTransaction(transactionData);
    await transaction.save();
  }
}

