// routes/holdings.js
// API endpoints for managing holdings.
//
// GET    /api/holdings        - list all holdings with calculated values
// GET    /api/options         - list stocks for the add-holding dropdown
// POST   /api/holdings        - add a new holding
// DELETE /api/holdings/:id    - delete a holding

const express = require('express');
const router  = express.Router();
const db      = require('../db');

// ─── GET /api/holdings ───────────────────────────────────────────────────────
// Returns all holdings for the demo investor (investor_id = 1).
// Uses a JOIN to get stock details and calculates current value and P&L.
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        h.holding_id,
        h.investor_id,
        h.stock_id,
        s.symbol,
        s.company_name,
        s.sector,
        s.risk_level,
        h.quantity,
        h.purchase_price,
        s.current_price,
        h.purchase_date,
        (h.quantity * h.purchase_price)                               AS invested,
        (h.quantity * s.current_price)                                AS current_val,
        (h.quantity * s.current_price - h.quantity * h.purchase_price) AS pnl
      FROM holdings h
      JOIN stocks s ON h.stock_id = s.stock_id
      WHERE h.investor_id = 1
      ORDER BY h.purchase_date DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Holdings fetch error:', err.message);
    res.status(500).json({ error: 'Could not retrieve holdings.' });
  }
});

// ─── GET /api/options ────────────────────────────────────────────────────────
// Returns the list of stocks for the dropdown in the Add Holding form.
router.get('/options', async (req, res) => {
  try {
    const [stocks] = await db.query(`
      SELECT stock_id, symbol, company_name, current_price, sector, risk_level
      FROM stocks
      ORDER BY symbol
    `);
    res.json(stocks);
  } catch (err) {
    console.error('Options fetch error:', err.message);
    res.status(500).json({ error: 'Could not retrieve stock options.' });
  }
});

// ─── POST /api/holdings ──────────────────────────────────────────────────────
// Adds a new holding for the demo investor.
// Uses a parameterized query to prevent SQL injection.
router.post('/', async (req, res) => {
  const { stock_id, quantity, purchase_price, purchase_date } = req.body;

  // --- Backend validation ---
  if (!stock_id || !quantity || !purchase_price || !purchase_date) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const qty   = parseInt(quantity);
  const price = parseFloat(purchase_price);
  const sid   = parseInt(stock_id);

  if (isNaN(sid)   || sid   <= 0) return res.status(400).json({ error: 'Invalid stock selected.'   });
  if (isNaN(qty)   || qty   <= 0) return res.status(400).json({ error: 'Quantity must be a positive number.' });
  if (isNaN(price) || price <= 0) return res.status(400).json({ error: 'Purchase price must be a positive number.' });

  // Validate date format (basic check)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(purchase_date)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
  }

  try {
    // Check the stock exists before inserting
    const [stockRows] = await db.query('SELECT stock_id FROM stocks WHERE stock_id = ?', [sid]);
    if (stockRows.length === 0) {
      return res.status(404).json({ error: 'Stock not found.' });
    }

    // Insert the new holding (investor_id = 1 for the demo user)
    const [result] = await db.query(
      `INSERT INTO holdings (investor_id, stock_id, quantity, purchase_price, purchase_date)
       VALUES (1, ?, ?, ?, ?)`,
      [sid, qty, price, purchase_date]
    );

    // Also log a BUY transaction
    await db.query(
      `INSERT INTO transactions (holding_id, transaction_type, quantity)
       VALUES (?, 'BUY', ?)`,
      [result.insertId, qty]
    );

    res.status(201).json({
      message:    'Holding added successfully.',
      holding_id: result.insertId
    });
  } catch (err) {
    console.error('Add holding error:', err.message);
    res.status(500).json({ error: 'Could not add holding.' });
  }
});

// ─── DELETE /api/holdings/:id ─────────────────────────────────────────────────
// Deletes a holding by holding_id.
// Only deletes holdings belonging to investor_id = 1 for safety.
router.delete('/:id', async (req, res) => {
  const holdingId = parseInt(req.params.id);

  if (isNaN(holdingId) || holdingId <= 0) {
    return res.status(400).json({ error: 'Invalid holding ID.' });
  }

  try {
    // Delete related transactions first (because of the foreign key)
    await db.query('DELETE FROM transactions WHERE holding_id = ?', [holdingId]);

    // Now delete the holding (only if it belongs to our demo investor)
    const [result] = await db.query(
      'DELETE FROM holdings WHERE holding_id = ? AND investor_id = 1',
      [holdingId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Holding not found.' });
    }

    res.json({ message: 'Holding deleted successfully.' });
  } catch (err) {
    console.error('Delete holding error:', err.message);
    res.status(500).json({ error: 'Could not delete holding.' });
  }
});

module.exports = router;
