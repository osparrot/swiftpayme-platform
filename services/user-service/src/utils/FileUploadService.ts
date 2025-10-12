import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { Logger } from './Logger';

/**
 * File upload configuration
 */
export interface FileUploadConfig {
  maxFileSize: number; // in bytes
  allowedMimeTypes: string[];
  uploadPath: string;
  maxFiles: number;
}

/**
 * File upload result
 */
export interface FileUploadResult {
  success: boolean;
  files?: UploadedFile[];
  error?: string;
}

/**
 * Uploaded file information
 */
export interface UploadedFile {
  originalName: string;
  filename: string;
  path: string;
  size: number;
  mimeType: string;
  url: string;
  metadata?: Record<string, any>;
}

/**
 * File upload service for handling document uploads
 */
export class FileUploadService {
  private static instance: FileUploadService;
  private logger: Logger;
  private config: FileUploadConfig;

  private constructor() {
    this.logger = new Logger('FileUploadService');
    this.config = {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      uploadPath: process.env.UPLOAD_PATH || './uploads',
      maxFiles: 5
    };

    this.ensureUploadDirectory();
  }

  public static getInstance(): FileUploadService {
    if (!FileUploadService.instance) {
      FileUploadService.instance = new FileUploadService();
    }
    return FileUploadService.instance;
  }

  /**
   * Get multer middleware for file uploads
   */
  getUploadMiddleware() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.config.uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
      }
    });

    return multer({
      storage,
      limits: {
        fileSize: this.config.maxFileSize,
        files: this.config.maxFiles
      },
      fileFilter: (req, file, cb) => {
        if (this.config.allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`File type not allowed: ${file.mimetype}`));
        }
      }
    });
  }

  /**
   * Process uploaded files
   */
  async processUploadedFiles(files: Express.Multer.File[]): Promise<FileUploadResult> {
    try {
      const uploadedFiles: UploadedFile[] = [];

      for (const file of files) {
        const uploadedFile: UploadedFile = {
          originalName: file.originalname,
          filename: file.filename,
          path: file.path,
          size: file.size,
          mimeType: file.mimetype,
          url: `/uploads/${file.filename}`,
          metadata: {
            uploadedAt: new Date().toISOString(),
            fieldName: file.fieldname
          }
        };

        uploadedFiles.push(uploadedFile);
      }

      this.logger.info('Files uploaded successfully', {
        count: uploadedFiles.length,
        files: uploadedFiles.map(f => ({ name: f.originalName, size: f.size }))
      });

      return {
        success: true,
        files: uploadedFiles
      };
    } catch (error) {
      this.logger.error('File upload processing failed', {
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete uploaded file
   */
  async deleteFile(filename: string): Promise<boolean> {
    try {
      const filePath = path.join(this.config.uploadPath, filename);
      await fs.unlink(filePath);
      
      this.logger.info('File deleted', { filename });
      return true;
    } catch (error) {
      this.logger.error('File deletion failed', {
        filename,
        error: error.message
      });
      return false;
    }
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.access(this.config.uploadPath);
    } catch {
      await fs.mkdir(this.config.uploadPath, { recursive: true });
      this.logger.info('Created upload directory', {
        path: this.config.uploadPath
      });
    }
  }
}

export default FileUploadService;
