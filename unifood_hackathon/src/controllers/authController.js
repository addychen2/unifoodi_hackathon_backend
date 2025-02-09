// src/controllers/authController.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { validationResult } from 'express-validator';
import { 
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { getDatabase } from '../database/init.js';
import { validatePassword } from '../middleware/auth.js';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Helper function to encode ArrayBuffer as base64url string
function arrayBufferToBase64url(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Helper function to decode base64url string to ArrayBuffer
function base64urlToArrayBuffer(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLength);
  return Buffer.from(padded, 'base64');
}

export async function register(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const db = await getDatabase();
    const { username, password } = req.body;

    // Validate password strength
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ errors: passwordErrors });
    }

    // Check if username exists
    const existingUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const result = await db.run(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [username, passwordHash]
    );

    res.status(201).json({ 
      message: 'Registration successful',
      userId: result.lastID
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
}

export async function login(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const db = await getDatabase();
    const { username, password } = req.body;

    // Get user
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingTime = Math.ceil((new Date(user.locked_until) - new Date()) / 1000 / 60);
      return res.status(403).json({ 
        error: `Account is locked. Try again in ${remainingTime} minutes` 
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      // Increment failed attempts
      const newAttempts = (user.failed_attempts || 0) + 1;
      const updates = {
        failed_attempts: newAttempts,
        last_attempt_time: new Date().toISOString()
      };
      
      // Lock account if max attempts reached
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        updates.locked_until = new Date(Date.now() + LOCKOUT_DURATION).toISOString();
      }
      
      await db.run(
        `UPDATE users SET 
          failed_attempts = ?, 
          last_attempt_time = ?, 
          locked_until = ?
         WHERE id = ?`,
        [updates.failed_attempts, updates.last_attempt_time, updates.locked_until, user.id]
      );

      return res.status(401).json({ 
        error: 'Invalid credentials',
        attemptsRemaining: MAX_LOGIN_ATTEMPTS - newAttempts
      });
    }

    // Reset failed attempts on successful login
    await db.run(
      'UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?',
      [user.id]
    );

    // Generate JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      token,
      user: {
        id: user.id,
        username: user.username,
        hasPasskey: !!user.passkey_credential_id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}

export async function generatePasskeyRegistration(req, res) {
  try {
    const db = await getDatabase();
    const { id: userId } = req.user;

    const options = await generateRegistrationOptions({
      rpName: 'Your App Name',
      rpID: process.env.RP_ID || 'localhost',
      userID: userId.toString(),
      userName: req.user.username,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'required'
      }
    });

    // Store challenge
    await db.run(
      'UPDATE users SET current_challenge = ? WHERE id = ?',
      [options.challenge, userId]
    );

    res.json(options);
  } catch (error) {
    console.error('Passkey registration error:', error);
    res.status(500).json({ error: 'Failed to generate registration options' });
  }
}

export async function verifyPasskeyRegistration(req, res) {
  try {
    const db = await getDatabase();
    const { id: userId } = req.user;

    const user = await db.get(
      'SELECT current_challenge FROM users WHERE id = ?', 
      [userId]
    );
    
    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: user.current_challenge,
      expectedOrigin: process.env.ORIGIN || 'http://localhost:3000',
      expectedRPID: process.env.RP_ID || 'localhost'
    });

    if (verification.verified && verification.registrationInfo) {
      const { credentialID, credentialPublicKey } = verification.registrationInfo;
      
      await db.run(
        `UPDATE users SET 
          passkey_credential_id = ?,
          passkey_public_key = ?,
          current_challenge = NULL
        WHERE id = ?`,
        [
          arrayBufferToBase64url(credentialID),
          arrayBufferToBase64url(credentialPublicKey),
          userId
        ]
      );

      res.json({ message: 'Passkey registered successfully' });
    } else {
      res.status(400).json({ error: 'Passkey registration failed' });
    }
  } catch (error) {
    console.error('Passkey verification error:', error);
    res.status(500).json({ error: 'Failed to verify registration' });
  }
}

export async function loginWithPasskey(req, res) {
  try {
    const db = await getDatabase();
    const { username } = req.body;

    const user = await db.get(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (!user || !user.passkey_credential_id) {
      return res.status(400).json({ error: 'No passkey found for this user' });
    }

    const options = await generateAuthenticationOptions({
      rpID: process.env.RP_ID || 'localhost',
      allowCredentials: [{
        id: base64urlToArrayBuffer(user.passkey_credential_id),
        type: 'public-key'
      }],
      userVerification: 'required'
    });

    await db.run(
      'UPDATE users SET current_challenge = ? WHERE id = ?',
      [options.challenge, user.id]
    );

    res.json(options);
  } catch (error) {
    console.error('Passkey login error:', error);
    res.status(500).json({ error: 'Failed to generate authentication options' });
  }
}

export async function verifyPasskeyLogin(req, res) {
  try {
    const { username } = req.body;
    const db = await getDatabase();

    const user = await db.get(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge: user.current_challenge,
      expectedOrigin: process.env.ORIGIN || 'http://localhost:3000',
      expectedRPID: process.env.RP_ID || 'localhost',
      authenticator: {
        credentialID: base64urlToArrayBuffer(user.passkey_credential_id),
        credentialPublicKey: base64urlToArrayBuffer(user.passkey_public_key),
      },
    });

    if (verification.verified) {
      // Clear challenge and generate token
      await db.run(
        'UPDATE users SET current_challenge = NULL WHERE id = ?',
        [user.id]
      );

      const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ token });
    } else {
      res.status(401).json({ error: 'Invalid passkey' });
    }
  } catch (error) {
    console.error('Passkey verification error:', error);
    res.status(500).json({ error: 'Failed to verify passkey' });
  }
}