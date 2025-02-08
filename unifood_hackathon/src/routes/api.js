import express from 'express';
import { body, validationResult } from 'express-validator';
import { createItem, getItems } from '../controllers/itemController.js';

export const router = express.Router();

// Create item endpoint
router.post('/items',
  [
    body('name').notEmpty().trim(),
    body('description').optional().trim()
  ],
  createItem
);

// Get items endpoint
router.get('/items', getItems);

// src/controllers/itemController.js
import { getDatabase } from '../database/init.js';

export async function createItem(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const db = await getDatabase();
    const { name, description } = req.body;

    const result = await db.run(
      'INSERT INTO items (name, description) VALUES (?, ?)',
      [name, description]
    );

    res.status(201).json({
      id: result.lastID,
      name,
      description
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create item' });
  }
}

export async function getItems(req, res) {
  try {
    const db = await getDatabase();
    const items = await db.all('SELECT * FROM items');
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve items' });
  }
}