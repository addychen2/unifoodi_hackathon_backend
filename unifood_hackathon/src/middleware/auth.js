// src/middleware/auth.js
import jwt from 'jsonwebtoken';

export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Add this to src/database/init.js after the existing code
let db;

export async function getDatabase() {
  if (!db) {
    db = await open({
      filename: 'database.sqlite',
      driver: sqlite3.Database
    });
  }
  return db;
}