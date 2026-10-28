// server.js
// Main entry point for the Financial Portfolio Manager backend.
// Starts an Express web server on port 3000.

require('dotenv').config(); // Load .env variables first

const express = require('express');
const path    = require('path');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
// Parse incoming JSON request bodies (for POST and PUT requests)
app.use(express.json());

// Serve static files (HTML, CSS, JS) from the /public folder
app.use(express.static(path.join(__dirname, 'public')));

// ─── API Routes ───────────────────────────────────────────────────────────────
// Each route file handles a specific section of the application.
const dashboardRoutes = require('./routes/dashboard');
const holdingsRoutes  = require('./routes/holdings');
const stocksRoutes    = require('./routes/stocks');
const riskRoutes      = require('./routes/risk');

app.use('/api/summary',  dashboardRoutes);   // Dashboard totals
app.use('/api/holdings', holdingsRoutes);    // Holdings CRUD + /options
app.use('/api/stocks',   stocksRoutes);      // Stocks list + price update + history
app.use('/api/risk',     riskRoutes);        // Risk analysis

// ─── Catch-all: serve index.html for any unmatched GET request ────────────────
// This lets the single-page frontend handle its own navigation.
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start the server ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('─────────────────────────────────────────────');
  console.log('  Financial Portfolio Manager');
  console.log(`  Server running at http://localhost:${PORT}`);
  console.log('─────────────────────────────────────────────');
});
