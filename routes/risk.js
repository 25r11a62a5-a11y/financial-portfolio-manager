// routes/risk.js
// API endpoint: GET /api/risk
// Returns portfolio allocation by stock and by sector,
// and identifies concentration risks.

const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/risk
// Calculates what percentage of the portfolio each stock represents.
// If one stock is more than 40% of the total, it flags a concentration warning.
router.get('/', async (req, res) => {
  try {
    // Total portfolio value (for percentage calculations)
    const [[totRow]] = await db.query(`
      SELECT COALESCE(SUM(h.quantity * s.current_price), 0) AS total
      FROM holdings h
      JOIN stocks s ON h.stock_id = s.stock_id
      WHERE h.investor_id = 1
    `);
    const total = parseFloat(totRow.total) || 0;

    // Per-stock allocation
    // GROUP BY to aggregate multiple holdings of the same stock
    const [stockAlloc] = await db.query(`
      SELECT
        s.stock_id,
        s.symbol,
        s.company_name,
        s.sector,
        s.risk_level,
        SUM(h.quantity)                    AS total_qty,
        SUM(h.quantity * s.current_price)  AS stock_value
      FROM holdings h
      JOIN stocks s ON h.stock_id = s.stock_id
      WHERE h.investor_id = 1
      GROUP BY s.stock_id, s.symbol, s.company_name, s.sector, s.risk_level
      ORDER BY stock_value DESC
    `);

    // Per-sector allocation
    const [sectorAlloc] = await db.query(`
      SELECT
        s.sector,
        SUM(h.quantity * s.current_price) AS sector_value
      FROM holdings h
      JOIN stocks s ON h.stock_id = s.stock_id
      WHERE h.investor_id = 1
      GROUP BY s.sector
      ORDER BY sector_value DESC
    `);

    // Risk category breakdown (how much is Low / Medium / High risk)
    const [riskBreakdown] = await db.query(`
      SELECT
        s.risk_level,
        SUM(h.quantity * s.current_price) AS risk_value
      FROM holdings h
      JOIN stocks s ON h.stock_id = s.stock_id
      WHERE h.investor_id = 1
      GROUP BY s.risk_level
      ORDER BY risk_value DESC
    `);

    // Add percentage to each stock and flag concentration warnings
    const warnings = [];
    const stocksWithPct = stockAlloc.map(row => {
      const val = parseFloat(row.stock_value);
      const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';

      // Concentration warning: one stock > 40% of portfolio
      if (total > 0 && (val / total) > 0.40) {
        warnings.push({
          type:    'Concentration Warning',
          message: `${row.symbol} makes up ${pct}% of your portfolio. Consider diversifying.`
        });
      }
      return { ...row, stock_value: val, percentage: parseFloat(pct) };
    });

    // Add percentage to sectors
    const sectorsWithPct = sectorAlloc.map(row => {
      const val = parseFloat(row.sector_value);
      const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
      return { sector: row.sector, sector_value: val, percentage: parseFloat(pct) };
    });

    // Add percentage to risk breakdown
    const riskWithPct = riskBreakdown.map(row => {
      const val = parseFloat(row.risk_value);
      const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
      return { risk_level: row.risk_level, risk_value: val, percentage: parseFloat(pct) };
    });

    res.json({
      total_value:      total,
      stock_allocation: stocksWithPct,
      sector_allocation: sectorsWithPct,
      risk_breakdown:   riskWithPct,
      warnings:         warnings
    });

  } catch (err) {
    console.error('Risk analysis error:', err.message);
    res.status(500).json({ error: 'Could not load risk analysis.' });
  }
});

module.exports = router;
