// src/database/init.js
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcrypt';

let db;

export async function initializeDatabase() {
  if (!db) {
    db = await open({
      filename: process.env.DB_PATH || '/app/data/database.sqlite',
      driver: sqlite3.Database
    });

    // Create users table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        passkey_credential_id TEXT UNIQUE,
        passkey_public_key TEXT,
        current_challenge TEXT,
        failed_attempts INTEGER DEFAULT 0,
        last_attempt_time DATETIME,
        locked_until DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create items table with user_id foreign key
    await db.exec(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    console.log('Database initialized successfully');
  }
  return db;
}

export async function getDatabase() {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}

export async function closeDatabase() {
  if (db) {
    await db.close();
    db = null;
    console.log('Database connection closed');
  }
}