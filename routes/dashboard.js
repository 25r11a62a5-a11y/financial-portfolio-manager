// routes/dashboard.js
// API endpoint: GET /api/summary
// Returns dashboard totals calculated directly from MySQL.

const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/summary
// Calculates: total investment, current value, profit/loss, holding count.
// Uses SQL aggregate functions (SUM, COUNT) and a JOIN across holdings and stocks.
// investor_id = 1 is our seeded demo investor.
router.get('/', async (req, res) => {
  try {
    // --- Main summary query ---
    // JOIN holdings with stocks to get current prices.
    // SUM(quantity * purchase_price)   = total money invested.
    // SUM(quantity * current_price)    = what the portfolio is worth today.
    const [rows] = await db.query(`
      SELECT
        COALESCE(SUM(h.quantity * h.purchase_price), 0)  AS total_investment,
        COALESCE(SUM(h.quantity * s.current_price),  0)  AS current_value,
        COUNT(h.holding_id)                               AS holding_count,
        COUNT(DISTINCT h.stock_id)                        AS distinct_stocks
      FROM holdings h
      JOIN stocks s ON h.stock_id = s.stock_id
      WHERE h.investor_id = 1
    `);

    const summary = rows[0];

    // Calculate profit/loss
    const investment = parseFloat(summary.total_investment) || 0;
    const value      = parseFloat(summary.current_value)    || 0;
    const pnl        = value - investment;

    // Percentage: avoid division by zero when portfolio is empty
    const pnlPct = investment > 0
      ? ((pnl / investment) * 100).toFixed(2)
      : '0.00';

    // --- Recent holdings query (for the dashboard table) ---
    const [recent] = await db.query(`
      SELECT
        h.holding_id,
        s.symbol,
        s.company_name,
        h.quantity,
        h.purchase_price,
        s.current_price,
        (h.quantity * h.purchase_price)                        AS invested,
        (h.quantity * s.current_price)                         AS current_val,
        (h.quantity * s.current_price - h.quantity * h.purchase_price) AS pnl,
        h.purchase_date,
        s.sector,
        s.risk_level
      FROM holdings h
      JOIN stocks s ON h.stock_id = s.stock_id
      WHERE h.investor_id = 1
      ORDER BY h.purchase_date DESC
      LIMIT 10
    `);

    // --- Sector allocation for pie chart ---
    const [sectors] = await db.query(`
      SELECT
        s.sector,
        SUM(h.quantity * s.current_price) AS sector_value
      FROM holdings h
      JOIN stocks s ON h.stock_id = s.stock_id
      WHERE h.investor_id = 1
      GROUP BY s.sector
      ORDER BY sector_value DESC
    `);

    res.json({
      total_investment:  investment,
      current_value:     value,
      pnl:               parseFloat(pnl.toFixed(2)),
      pnl_pct:           parseFloat(pnlPct),
      holding_count:     parseInt(summary.holding_count),
      distinct_stocks:   parseInt(summary.distinct_stocks),
      recent_holdings:   recent,
      sector_allocation: sectors
    });

  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).json({ error: 'Failed to load dashboard data.' });
  }
});

module.exports = router;
