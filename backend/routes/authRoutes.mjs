import express from 'express';
import { createRequire } from 'module';
import {
  signup,
  login,
  logout,
  refreshTokenController,
  getCurrentUser,
  verifyEmail,
  googleLogin,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const require = createRequire(import.meta.url);
const authRegistrationRoutes = require('./authRegistrationRoutes.js');
const authPasswordRoutes = require('./authPasswordRoutes.js');

const router = express.Router();

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.use('/register', authRegistrationRoutes);

router.post('/signup', signup);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and return tokens
 * @access  Public
 */
router.post('/login', login);

router.post('/google', googleLogin);

router.use(authPasswordRoutes);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, logout);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh', refreshTokenController);

/** Backward-compatible alias used by legacy frontend clients */
router.post('/refresh-token', refreshTokenController);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, getCurrentUser);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify user email
 * @access  Public
 */
router.post('/verify-email', verifyEmail);

export default router;
