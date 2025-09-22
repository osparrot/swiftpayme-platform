/**
 * SwiftPayMe Account Service - Validation Middleware
 * Request validation for account operations
 */

import { Request, Response, NextFunction } from 'express';
import { SupportedCurrency, AccountStatus } from '../types/account';

const validationSchemas = {
  createAccount: (req: Request, res: Response, next: NextFunction) => {
    const { userId, defaultCurrency } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }
    
    if (defaultCurrency && !Object.values(SupportedCurrency).includes(defaultCurrency)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid default currency'
      });
    }
    
    next();
  },

  deposit: (req: Request, res: Response, next: NextFunction) => {
    const { accountId, amount, currency } = req.body;
    
    if (!accountId || !amount || !currency) {
      return res.status(400).json({
        success: false,
        error: 'Account ID, amount, and currency are required'
      });
    }
    
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be positive'
      });
    }
    
    if (!Object.values(SupportedCurrency).includes(currency)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid currency'
      });
    }
    
    next();
  },

  withdraw: (req: Request, res: Response, next: NextFunction) => {
    const { accountId, amount, currency } = req.body;
    
    if (!accountId || !amount || !currency) {
      return res.status(400).json({
        success: false,
        error: 'Account ID, amount, and currency are required'
      });
    }
    
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be positive'
      });
    }
    
    if (!Object.values(SupportedCurrency).includes(currency)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid currency'
      });
    }
    
    next();
  },

  transfer: (req: Request, res: Response, next: NextFunction) => {
    const { fromAccountId, toAccountId, amount, currency } = req.body;
    
    if (!fromAccountId || !toAccountId || !amount || !currency) {
      return res.status(400).json({
        success: false,
        error: 'From account ID, to account ID, amount, and currency are required'
      });
    }
    
    if (fromAccountId === toAccountId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot transfer to the same account'
      });
    }
    
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be positive'
      });
    }
    
    if (!Object.values(SupportedCurrency).includes(currency)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid currency'
      });
    }
    
    next();
  },

  convertCurrency: (req: Request, res: Response, next: NextFunction) => {
    const { accountId, fromCurrency, toCurrency, amount } = req.body;
    
    if (!accountId || !fromCurrency || !toCurrency || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Account ID, from currency, to currency, and amount are required'
      });
    }
    
    if (fromCurrency === toCurrency) {
      return res.status(400).json({
        success: false,
        error: 'From and to currencies cannot be the same'
      });
    }
    
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be positive'
      });
    }
    
    if (!Object.values(SupportedCurrency).includes(fromCurrency) || 
        !Object.values(SupportedCurrency).includes(toCurrency)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid currency'
      });
    }
    
    next();
  },

  convertAssetTokens: (req: Request, res: Response, next: NextFunction) => {
    const { accountId, tokenType, tokenAmount, assetId, targetCurrency } = req.body;
    
    if (!accountId || !tokenType || !tokenAmount || !assetId || !targetCurrency) {
      return res.status(400).json({
        success: false,
        error: 'Account ID, token type, token amount, asset ID, and target currency are required'
      });
    }
    
    if (tokenAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Token amount must be positive'
      });
    }
    
    if (!Object.values(SupportedCurrency).includes(targetCurrency)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid target currency'
      });
    }
    
    next();
  },

  chargeCrypto: (req: Request, res: Response, next: NextFunction) => {
    const { accountId, amount, currency, cryptoAmount, cryptoCurrency } = req.body;
    
    if (!accountId || !amount || !currency || !cryptoAmount || !cryptoCurrency) {
      return res.status(400).json({
        success: false,
        error: 'Account ID, amount, currency, crypto amount, and crypto currency are required'
      });
    }
    
    if (amount <= 0 || cryptoAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amounts must be positive'
      });
    }
    
    if (!Object.values(SupportedCurrency).includes(currency)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid currency'
      });
    }
    
    next();
  },

  getAccount: (req: Request, res: Response, next: NextFunction) => {
    const { accountId } = req.params;
    
    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: 'Account ID is required'
      });
    }
    
    next();
  },

  getUserAccount: (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }
    
    next();
  },

  updateAccountStatus: (req: Request, res: Response, next: NextFunction) => {
    const { accountId } = req.params;
    const { status } = req.body;
    
    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: 'Account ID is required'
      });
    }
    
    if (!status || !Object.values(AccountStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Valid status is required'
      });
    }
    
    next();
  }
};

export const validationMiddleware = (schema: keyof typeof validationSchemas) => {
  return validationSchemas[schema];
};

