// routes/stocks.js
// API endpoints for the Stocks section.
//
// GET /api/stocks           - list all stocks
// PUT /api/stocks/:id       - update sample price and record history
// GET /api/history/:stockId - return price history for a stock

const express = require('express');
const router  = express.Router();
const db      = require('../db');

// ─── GET /api/stocks ──────────────────────────────────────────────────────────
// Returns all stocks with their details.
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT stock_id, symbol, company_name, current_price, sector, risk_level
      FROM stocks
      ORDER BY sector, symbol
    `);
    res.json(rows);
  } catch (err) {
    console.error('Stocks fetch error:', err.message);
    res.status(500).json({ error: 'Could not retrieve stocks.' });
  }
});

// ─── PUT /api/stocks/:id ──────────────────────────────────────────────────────
// Updates the sample price of a stock AND inserts a record into price_history.
// Both operations are wrapped in a DATABASE TRANSACTION so they either both
// succeed or both fail — this keeps the data consistent.
router.put('/:id', async (req, res) => {
  const stockId  = parseInt(req.params.id);
  const newPrice = parseFloat(req.body.current_price);

  // Validate inputs
  if (isNaN(stockId) || stockId <= 0) {
    return res.status(400).json({ error: 'Invalid stock ID.' });
  }
  if (isNaN(newPrice) || newPrice <= 0) {
    return res.status(400).json({ error: 'Price must be a positive number.' });
  }

  // Get a single connection from the pool to use for the transaction
  const conn = await db.getConnection();

  try {
    // --- BEGIN TRANSACTION ---
    // A transaction groups multiple SQL statements together.
    // If any statement fails, we ROLLBACK to undo all changes.
    await conn.beginTransaction();

    // Step 1: Update the current price in the stocks table
    const [updateResult] = await conn.query(
      'UPDATE stocks SET current_price = ? WHERE stock_id = ?',
      [newPrice, stockId]
    );

    if (updateResult.affectedRows === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: 'Stock not found.' });
    }

    // Step 2: Insert the new price into price_history
    await conn.query(
      'INSERT INTO price_history (stock_id, price) VALUES (?, ?)',
      [stockId, newPrice]
    );

    // --- COMMIT TRANSACTION ---
    // Both statements succeeded, so we commit (save) the changes.
    await conn.commit();
    conn.release();

    res.json({ message: 'Sample price updated and history recorded.' });

  } catch (err) {
    // If anything went wrong, rollback to keep data consistent
    await conn.rollback();
    conn.release();
    console.error('Price update error:', err.message);
    res.status(500).json({ error: 'Could not update price.' });
  }
});

// ─── GET /api/history/:stockId ────────────────────────────────────────────────
// Returns price history records for a specific stock.
router.get('/history/:stockId', async (req, res) => {
  const stockId = parseInt(req.params.stockId);

  if (isNaN(stockId) || stockId <= 0) {
    return res.status(400).json({ error: 'Invalid stock ID.' });
  }

  try {
    const [rows] = await db.query(`
      SELECT history_id, price, recorded_at
      FROM price_history
      WHERE stock_id = ?
      ORDER BY recorded_at ASC
    `, [stockId]);

    res.json(rows);
  } catch (err) {
    console.error('History fetch error:', err.message);
    res.status(500).json({ error: 'Could not retrieve price history.' });
  }
});

module.exports = router;
