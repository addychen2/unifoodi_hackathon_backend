// src/routes/api.js
import express from 'express';
import { body } from 'express-validator';
import { 
  createItem, 
  getItems, 
  getItem, 
  updateItem, 
  deleteItem 
} from '../controllers/itemController.js';
import { authenticate } from '../middleware/auth.js';

export const router = express.Router();

// All routes in this file require authentication
router.use(authenticate);

// Create item
router.post('/items',
  [
    body('name').notEmpty().trim().escape(),
    body('description').optional().trim().escape()
  ],
  createItem
);

// Get all items for authenticated user
router.get('/items', getItems);

// Get single item
router.get('/items/:id', getItem);

// Update item
router.put('/items/:id',
  [
    body('name').notEmpty().trim().escape(),
    body('description').optional().trim().escape()
  ],
  updateItem
);

// Delete item
router.delete('/items/:id', deleteItem);