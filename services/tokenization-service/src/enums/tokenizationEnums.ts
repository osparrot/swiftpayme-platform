export enum TokenType {
  ASSET_BACKED = 'asset_backed',
  UTILITY = 'utility',
  SECURITY = 'security',
  COMMODITY = 'commodity',
  PRECIOUS_METAL = 'precious_metal',
  REAL_ESTATE = 'real_estate',
  CARBON_CREDIT = 'carbon_credit'
}

export enum TokenStandard {
  ERC20 = 'erc20',
  ERC721 = 'erc721',
  ERC1155 = 'erc1155',
  NATIVE = 'native',
  CUSTOM = 'custom'
}

export enum TokenStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DEPRECATED = 'deprecated',
  MIGRATED = 'migrated'
}

export enum MintingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected'
}

export enum BurningStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected'
}

export enum DepositStatus {
  PENDING_VERIFICATION = 'pending_verification',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  STORED = 'stored',
  RELEASED = 'released'
}

export enum WithdrawalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum AuditStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  UNDER_REVIEW = 'under_review',
  REQUIRES_ACTION = 'requires_action'
}

export enum AssetType {
  GOLD = 'gold',
  SILVER = 'silver',
  PLATINUM = 'platinum',
  PALLADIUM = 'palladium',
  COPPER = 'copper',
  DIAMOND = 'diamond',
  OIL = 'oil',
  REAL_ESTATE = 'real_estate',
  CARBON_CREDIT = 'carbon_credit',
  COMMODITY = 'commodity'
}

export enum CustodyType {
  SELF_CUSTODY = 'self_custody',
  THIRD_PARTY = 'third_party',
  MULTI_SIG = 'multi_sig',
  INSTITUTIONAL = 'institutional'
}

export enum ReserveType {
  FULL_RESERVE = 'full_reserve',
  FRACTIONAL_RESERVE = 'fractional_reserve',
  OVER_COLLATERALIZED = 'over_collateralized'
}

