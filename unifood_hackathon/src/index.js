import express from 'express';
import cors from 'cors';
import { body, validationResult } from 'express-validator';
import { initializeDatabase, getDatabase } from './database/init.js';

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
const db = initializeDatabase();

// Routes
app.post('/api/items',
  [
    body('name').notEmpty().trim(),
    body('description').optional().trim()
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description } = req.body;
    db.run(
      'INSERT INTO items (name, description) VALUES (?, ?)',
      [name, description],
      function(err) {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Failed to create item' });
        }
        res.status(201).json({
          id: this.lastID,
          name,
          description
        });
      }
    );
  }
);

app.get('/api/items', (req, res) => {
  db.all('SELECT * FROM items', [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to retrieve items' });
    }
    res.json(rows);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle cleanup
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});