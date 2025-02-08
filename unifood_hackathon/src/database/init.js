import sqlite3 from 'sqlite3';

let db;

export function initializeDatabase() {
  if (!db) {
    db = new sqlite3.Database('database.sqlite', (err) => {
      if (err) {
        console.error('Error connecting to database:', err);
      } else {
        console.log('Connected to SQLite database');
        
        // Create tables
        db.run(`
          CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
      }
    });
  }
  return db;
}

export function getDatabase() {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}