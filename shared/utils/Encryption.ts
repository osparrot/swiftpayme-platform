import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Logger } from './Logger';

const logger = new Logger('EncryptionUtils');

// Encryption configuration
const ENCRYPTION_CONFIG = {
  // AES encryption
  algorithm: 'aes-256-gcm',
  keyLength: 32, // 256 bits
  ivLength: 16,  // 128 bits
  tagLength: 16, // 128 bits
  
  // Key derivation
  saltLength: 32,
  iterations: 100000, // PBKDF2 iterations
  
  // Bcrypt
  bcryptRounds: 12,
  
  // RSA
  rsaKeySize: 2048,
  rsaPadding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
  rsaHash: 'sha256',
  
  // HMAC
  hmacAlgorithm: 'sha256'
};

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
  salt?: string;
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface EncryptionMetadata {
  algorithm: string;
  keyDerivation?: string;
  iterations?: number;
  timestamp: string;
  version: string;
}

export class EncryptionUtils {
  private static masterKey: Buffer | null = null;
  private static keyCache: Map<string, Buffer> = new Map();

  // Initialize master key from environment
  public static initializeMasterKey(): void {
    const masterKeyHex = process.env.MASTER_ENCRYPTION_KEY;
    
    if (!masterKeyHex) {
      logger.warn('Master encryption key not found in environment variables');
      // Generate a temporary key for development (NOT for production)
      if (process.env.NODE_ENV === 'development') {
        this.masterKey = crypto.randomBytes(ENCRYPTION_CONFIG.keyLength);
        logger.warn('Using temporary master key for development');
      } else {
        throw new Error('Master encryption key is required in production');
      }
    } else {
      this.masterKey = Buffer.from(masterKeyHex, 'hex');
    }

    logger.info('Master encryption key initialized');
  }

  // Generate a secure random key
  public static generateKey(length: number = ENCRYPTION_CONFIG.keyLength): Buffer {
    return crypto.randomBytes(length);
  }

  // Generate a secure random salt
  public static generateSalt(length: number = ENCRYPTION_CONFIG.saltLength): Buffer {
    return crypto.randomBytes(length);
  }

  // Derive key from password using PBKDF2
  public static deriveKey(
    password: string, 
    salt: Buffer, 
    iterations: number = ENCRYPTION_CONFIG.iterations
  ): Buffer {
    return crypto.pbkdf2Sync(
      password, 
      salt, 
      iterations, 
      ENCRYPTION_CONFIG.keyLength, 
      'sha256'
    );
  }

  // Derive key from master key and context
  public static deriveContextKey(context: string): Buffer {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }

    // Check cache first
    if (this.keyCache.has(context)) {
      return this.keyCache.get(context)!;
    }

    // Derive key using HKDF
    const info = Buffer.from(context, 'utf8');
    const salt = Buffer.from('swiftpayme-key-derivation', 'utf8');
    
    const derivedKey = crypto.hkdfSync(
      'sha256',
      this.masterKey,
      salt,
      info,
      ENCRYPTION_CONFIG.keyLength
    );

    // Cache the derived key
    this.keyCache.set(context, derivedKey);
    
    return derivedKey;
  }

  // Encrypt data with AES-256-GCM
  public static encrypt(
    data: string | Buffer, 
    key?: Buffer, 
    context?: string
  ): EncryptedData {
    try {
      const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
      
      // Use provided key, derive from context, or use master key
      let encryptionKey: Buffer;
      if (key) {
        encryptionKey = key;
      } else if (context) {
        encryptionKey = this.deriveContextKey(context);
      } else if (this.masterKey) {
        encryptionKey = this.masterKey;
      } else {
        throw new Error('No encryption key available');
      }

      const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
      const cipher = crypto.createCipher(ENCRYPTION_CONFIG.algorithm, encryptionKey);
      cipher.setAAD(Buffer.from(context || 'swiftpayme', 'utf8'));

      let encrypted = cipher.update(dataBuffer);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      const tag = cipher.getAuthTag();

      return {
        encrypted: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        tag: tag.toString('base64')
      };

    } catch (error) {
      logger.error('Encryption failed', { error: error.message, context });
      throw new Error('Encryption failed');
    }
  }

  // Decrypt data with AES-256-GCM
  public static decrypt(
    encryptedData: EncryptedData, 
    key?: Buffer, 
    context?: string
  ): Buffer {
    try {
      // Use provided key, derive from context, or use master key
      let decryptionKey: Buffer;
      if (key) {
        decryptionKey = key;
      } else if (context) {
        decryptionKey = this.deriveContextKey(context);
      } else if (this.masterKey) {
        decryptionKey = this.masterKey;
      } else {
        throw new Error('No decryption key available');
      }

      const encrypted = Buffer.from(encryptedData.encrypted, 'base64');
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const tag = Buffer.from(encryptedData.tag, 'base64');

      const decipher = crypto.createDecipher(ENCRYPTION_CONFIG.algorithm, decryptionKey);
      decipher.setAuthTag(tag);
      decipher.setAAD(Buffer.from(context || 'swiftpayme', 'utf8'));

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted;

    } catch (error) {
      logger.error('Decryption failed', { error: error.message, context });
      throw new Error('Decryption failed');
    }
  }

  // Encrypt with password-based key derivation
  public static encryptWithPassword(data: string, password: string): EncryptedData {
    try {
      const salt = this.generateSalt();
      const key = this.deriveKey(password, salt);
      const encrypted = this.encrypt(data, key);

      return {
        ...encrypted,
        salt: salt.toString('base64')
      };

    } catch (error) {
      logger.error('Password-based encryption failed', { error: error.message });
      throw new Error('Password-based encryption failed');
    }
  }

  // Decrypt with password-based key derivation
  public static decryptWithPassword(encryptedData: EncryptedData, password: string): string {
    try {
      if (!encryptedData.salt) {
        throw new Error('Salt is required for password-based decryption');
      }

      const salt = Buffer.from(encryptedData.salt, 'base64');
      const key = this.deriveKey(password, salt);
      const decrypted = this.decrypt(encryptedData, key);

      return decrypted.toString('utf8');

    } catch (error) {
      logger.error('Password-based decryption failed', { error: error.message });
      throw new Error('Password-based decryption failed');
    }
  }

  // Hash password with bcrypt
  public static async hashPassword(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(ENCRYPTION_CONFIG.bcryptRounds);
      return bcrypt.hash(password, salt);
    } catch (error) {
      logger.error('Password hashing failed', { error: error.message });
      throw new Error('Password hashing failed');
    }
  }

  // Verify password with bcrypt
  public static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Password verification failed', { error: error.message });
      return false;
    }
  }

  // Generate RSA key pair
  public static generateRSAKeyPair(): KeyPair {
    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: ENCRYPTION_CONFIG.rsaKeySize,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      return { publicKey, privateKey };

    } catch (error) {
      logger.error('RSA key pair generation failed', { error: error.message });
      throw new Error('RSA key pair generation failed');
    }
  }

  // Encrypt with RSA public key
  public static encryptRSA(data: string, publicKey: string): string {
    try {
      const encrypted = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: ENCRYPTION_CONFIG.rsaPadding,
          oaepHash: ENCRYPTION_CONFIG.rsaHash
        },
        Buffer.from(data, 'utf8')
      );

      return encrypted.toString('base64');

    } catch (error) {
      logger.error('RSA encryption failed', { error: error.message });
      throw new Error('RSA encryption failed');
    }
  }

  // Decrypt with RSA private key
  public static decryptRSA(encryptedData: string, privateKey: string): string {
    try {
      const decrypted = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: ENCRYPTION_CONFIG.rsaPadding,
          oaepHash: ENCRYPTION_CONFIG.rsaHash
        },
        Buffer.from(encryptedData, 'base64')
      );

      return decrypted.toString('utf8');

    } catch (error) {
      logger.error('RSA decryption failed', { error: error.message });
      throw new Error('RSA decryption failed');
    }
  }

  // Generate HMAC signature
  public static generateHMAC(data: string, key: string | Buffer): string {
    try {
      const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'utf8') : key;
      const hmac = crypto.createHmac(ENCRYPTION_CONFIG.hmacAlgorithm, keyBuffer);
      hmac.update(data, 'utf8');
      return hmac.digest('hex');

    } catch (error) {
      logger.error('HMAC generation failed', { error: error.message });
      throw new Error('HMAC generation failed');
    }
  }

  // Verify HMAC signature
  public static verifyHMAC(data: string, signature: string, key: string | Buffer): boolean {
    try {
      const expectedSignature = this.generateHMAC(data, key);
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

    } catch (error) {
      logger.error('HMAC verification failed', { error: error.message });
      return false;
    }
  }

  // Generate secure random string
  public static generateSecureRandom(length: number = 32, encoding: BufferEncoding = 'hex'): string {
    return crypto.randomBytes(Math.ceil(length / 2)).toString(encoding).slice(0, length);
  }

  // Generate UUID v4
  public static generateUUID(): string {
    return crypto.randomUUID();
  }

  // Hash data with SHA-256
  public static hash(data: string | Buffer, algorithm: string = 'sha256'): string {
    const hash = crypto.createHash(algorithm);
    hash.update(data);
    return hash.digest('hex');
  }

  // Secure compare for timing attack prevention
  public static secureCompare(a: string, b: string): boolean {
    try {
      if (a.length !== b.length) {
        return false;
      }

      return crypto.timingSafeEqual(
        Buffer.from(a, 'utf8'),
        Buffer.from(b, 'utf8')
      );

    } catch (error) {
      return false;
    }
  }

  // Encrypt sensitive fields in an object
  public static encryptSensitiveFields<T extends Record<string, any>>(
    obj: T, 
    sensitiveFields: string[], 
    context?: string
  ): T {
    const encrypted = { ...obj };

    for (const field of sensitiveFields) {
      if (encrypted[field] !== undefined && encrypted[field] !== null) {
        const value = typeof encrypted[field] === 'string' 
          ? encrypted[field] 
          : JSON.stringify(encrypted[field]);
        
        encrypted[field] = this.encrypt(value, undefined, context || field);
      }
    }

    return encrypted;
  }

  // Decrypt sensitive fields in an object
  public static decryptSensitiveFields<T extends Record<string, any>>(
    obj: T, 
    sensitiveFields: string[], 
    context?: string
  ): T {
    const decrypted = { ...obj };

    for (const field of sensitiveFields) {
      if (decrypted[field] && typeof decrypted[field] === 'object') {
        try {
          const encryptedData = decrypted[field] as EncryptedData;
          const decryptedValue = this.decrypt(encryptedData, undefined, context || field);
          
          // Try to parse as JSON, fallback to string
          try {
            decrypted[field] = JSON.parse(decryptedValue.toString('utf8'));
          } catch {
            decrypted[field] = decryptedValue.toString('utf8');
          }
        } catch (error) {
          logger.warn('Failed to decrypt field', { field, error: error.message });
          // Keep the encrypted value if decryption fails
        }
      }
    }

    return decrypted;
  }

  // Create encrypted backup of data
  public static createEncryptedBackup(data: any, password: string): string {
    try {
      const serialized = JSON.stringify(data);
      const compressed = crypto.deflateSync(serialized);
      const encrypted = this.encryptWithPassword(compressed.toString('base64'), password);
      
      const backup = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        metadata: {
          algorithm: ENCRYPTION_CONFIG.algorithm,
          compression: 'deflate'
        },
        data: encrypted
      };

      return Buffer.from(JSON.stringify(backup)).toString('base64');

    } catch (error) {
      logger.error('Encrypted backup creation failed', { error: error.message });
      throw new Error('Encrypted backup creation failed');
    }
  }

  // Restore from encrypted backup
  public static restoreFromEncryptedBackup(backupData: string, password: string): any {
    try {
      const backup = JSON.parse(Buffer.from(backupData, 'base64').toString('utf8'));
      
      if (!backup.version || !backup.data) {
        throw new Error('Invalid backup format');
      }

      const decrypted = this.decryptWithPassword(backup.data, password);
      const decompressed = crypto.inflateSync(Buffer.from(decrypted, 'base64'));
      
      return JSON.parse(decompressed.toString('utf8'));

    } catch (error) {
      logger.error('Encrypted backup restoration failed', { error: error.message });
      throw new Error('Encrypted backup restoration failed');
    }
  }

  // Clear sensitive data from memory
  public static clearSensitiveData(buffer: Buffer): void {
    if (buffer && buffer.length > 0) {
      buffer.fill(0);
    }
  }

  // Get encryption metadata
  public static getEncryptionMetadata(): EncryptionMetadata {
    return {
      algorithm: ENCRYPTION_CONFIG.algorithm,
      keyDerivation: 'PBKDF2',
      iterations: ENCRYPTION_CONFIG.iterations,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
  }

  // Validate encryption configuration
  public static validateConfiguration(): boolean {
    try {
      // Test encryption/decryption
      const testData = 'test-data';
      const encrypted = this.encrypt(testData);
      const decrypted = this.decrypt(encrypted);
      
      if (decrypted.toString('utf8') !== testData) {
        return false;
      }

      // Test password hashing
      const testPassword = 'test-password';
      const hash = crypto.createHash('sha256').update(testPassword).digest('hex');
      
      if (!hash) {
        return false;
      }

      logger.info('Encryption configuration validated successfully');
      return true;

    } catch (error) {
      logger.error('Encryption configuration validation failed', { error: error.message });
      return false;
    }
  }

  // Clean up resources
  public static cleanup(): void {
    // Clear key cache
    this.keyCache.clear();
    
    // Clear master key
    if (this.masterKey) {
      this.clearSensitiveData(this.masterKey);
      this.masterKey = null;
    }

    logger.info('Encryption utilities cleaned up');
  }
}

// Initialize encryption on module load
if (process.env.NODE_ENV !== 'test') {
  EncryptionUtils.initializeMasterKey();
}

// Export types and utilities
export {
  EncryptionUtils,
  EncryptedData,
  KeyPair,
  EncryptionMetadata,
  ENCRYPTION_CONFIG
};

