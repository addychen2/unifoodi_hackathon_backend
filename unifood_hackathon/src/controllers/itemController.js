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

    res.status(201).json({
      id: result.lastID,
      name,
      description,
      userId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create item' });
  }
}

export async function getItems(req, res) {
  try {
    const db = await getDatabase();
    const { id: userId } = req.user;

    const items = await db.all(
      'SELECT * FROM items WHERE user_id = ?',
      [userId]
    );

    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve items' });
  }
}