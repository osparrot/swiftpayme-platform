import { Router } from 'express';
import multer from 'multer';
import userController from '../controllers/userController';
import { authMiddleware } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { validationMiddleware } from '../middleware/validation';
import { loggingMiddleware } from '../middleware/logging';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5
  },
  fileFilter: (req, file, cb) => {
    // Allow only specific file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Apply logging middleware to all routes
router.use(loggingMiddleware);

// Health check endpoint (no authentication required)
router.get('/health', userController.healthCheck);

// Public routes (no authentication required)
router.post('/register', 
  rateLimitMiddleware('register'),
  validationMiddleware('userRegistration'),
  userController.register
);

router.post('/login', 
  rateLimitMiddleware('login'),
  validationMiddleware('userLogin'),
  userController.login
);

router.post('/password/reset/request', 
  rateLimitMiddleware('passwordReset'),
  validationMiddleware('passwordResetRequest'),
  userController.requestPasswordReset
);

router.post('/password/reset/confirm', 
  rateLimitMiddleware('passwordReset'),
  validationMiddleware('passwordResetConfirm'),
  userController.confirmPasswordReset
);

router.post('/email/verify', 
  rateLimitMiddleware('emailVerification'),
  validationMiddleware('emailVerification'),
  userController.verifyEmail
);

// Protected routes (authentication required)
router.use(authMiddleware);

// User profile routes
router.get('/profile', 
  rateLimitMiddleware('profile'),
  userController.getProfile
);

router.get('/profile/:userId', 
  rateLimitMiddleware('profile'),
  userController.getProfile
);

router.put('/profile', 
  rateLimitMiddleware('profileUpdate'),
  validationMiddleware('userUpdate'),
  userController.updateProfile
);

router.put('/profile/:userId', 
  rateLimitMiddleware('profileUpdate'),
  validationMiddleware('userUpdate'),
  userController.updateProfile
);

// Password management routes
router.post('/password/change', 
  rateLimitMiddleware('passwordChange'),
  validationMiddleware('passwordChange'),
  userController.changePassword
);

// Phone verification routes
router.post('/phone/verify', 
  rateLimitMiddleware('phoneVerification'),
  validationMiddleware('phoneVerification'),
  userController.verifyPhone
);

// Session management routes
router.get('/sessions', 
  rateLimitMiddleware('sessions'),
  userController.getSessions
);

router.delete('/sessions/:sessionId', 
  rateLimitMiddleware('sessions'),
  userController.terminateSession
);

router.post('/logout', 
  rateLimitMiddleware('logout'),
  userController.logout
);

// Activity routes
router.get('/activities', 
  rateLimitMiddleware('activities'),
  userController.getActivities
);

router.get('/activities/:userId', 
  rateLimitMiddleware('activities'),
  userController.getActivities
);

export default router;

