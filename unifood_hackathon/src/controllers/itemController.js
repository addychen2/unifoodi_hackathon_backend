// src/controllers/itemController.js
import { validationResult } from 'express-validator';
import { getDatabase } from '../database/init.js';

export async function createItem(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const db = await getDatabase();
    const { name, description } = req.body;
    const { id: userId } = req.user;

    const result = await db.run(
      'INSERT INTO items (name, description, user_id) VALUES (?, ?, ?)',
      [name, description, userId]
    );

    const newItem = await db.get(
      'SELECT * FROM items WHERE id = ?',
      [result.lastID]
    );

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
}

export async function getItems(req, res) {
  try {
    const db = await getDatabase();
    const { id: userId } = req.user;

    const items = await db.all(
      'SELECT * FROM items WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    res.json(items);
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ error: 'Failed to retrieve items' });
  }
}

export async function getItem(req, res) {
  try {
    const db = await getDatabase();
    const { id } = req.params;
    const { id: userId } = req.user;

    const item = await db.get(
      'SELECT * FROM items WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ error: 'Failed to retrieve item' });
  }
}

export async function updateItem(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const db = await getDatabase();
    const { id } = req.params;
    const { name, description } = req.body;
    const { id: userId } = req.user;

    // First check if item exists and belongs to user
    const existingItem = await db.get(
      'SELECT * FROM items WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await db.run(
      'UPDATE items SET name = ?, description = ? WHERE id = ? AND user_id = ?',
      [name, description, id, userId]
    );

    const updatedItem = await db.get('SELECT * FROM items WHERE id = ?', [id]);
    res.json(updatedItem);
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
}

export async function deleteItem(req, res) {
  try {
    const db = await getDatabase();
    const { id } = req.params;
    const { id: userId } = req.user;

    // First check if item exists and belongs to user
    const existingItem = await db.get(
      'SELECT * FROM items WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await db.run(
      'DELETE FROM items WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
}