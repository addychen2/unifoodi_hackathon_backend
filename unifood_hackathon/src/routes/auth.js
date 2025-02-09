// src/routes/auth.js
import express from 'express';
import { body } from 'express-validator';
import { 
  register, 
  login,
  generatePasskeyRegistration,
  verifyPasskeyRegistration,
  loginWithPasskey,
  verifyPasskeyLogin
} from '../controllers/authController.js';
import { authenticate, loginLimiter } from '../middleware/auth.js';

export const router = express.Router();

// User registration and login
router.post('/register', 
  [
    body('username')
      .isLength({ min: 3 })
      .trim()
      .escape()
      .withMessage('Username must be at least 3 characters long'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
  ],
  register
);

router.post('/login',
  loginLimiter,
  [
    body('username').trim().escape(),
    body('password').notEmpty()
  ],
  login
);

// Passkey endpoints
router.post('/passkey/register', authenticate, generatePasskeyRegistration);
router.post('/passkey/verify', authenticate, verifyPasskeyRegistration);
router.post('/passkey/login', loginLimiter, loginWithPasskey);
router.post('/passkey/login/verify', verifyPasskeyLogin);

// Test protected route
router.get('/me', authenticate, (req, res) => {
  res.json({ 
    message: 'You have access to this protected route',
    user: req.user 
  });
});