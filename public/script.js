/* ============================================================
   script.js — Financial Portfolio Manager
   Handles navigation, API calls, and DOM updates.
   All data comes from the Express backend (/api/*).
   ============================================================ */

// ── Utility helpers ───────────────────────────────────────────────────────────

/** Format a number as Indian Rupees with 2 decimal places */
function fmt(n) {
  const num = parseFloat(n) || 0;
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Return a risk badge HTML string based on the risk level */
function riskBadge(level) {
  const cls = { Low: 'badge-low', Medium: 'badge-medium', High: 'badge-high' }[level] || 'badge-medium';
  return `<span class="badge ${cls}">${level}</span>`;
}

/** Show a form message (success or error) */
function showMsg(elId, text, type) {
  const el = document.getElementById(elId);
  el.textContent = text;
  el.className = 'form-message ' + type;  // 'success' or 'error'
  // Auto-hide after 5 seconds
  setTimeout(() => { el.className = 'form-message'; el.textContent = ''; }, 5000);
}

// ── Navigation ────────────────────────────────────────────────────────────────

// All nav links and section panels
const navLinks  = document.querySelectorAll('.nav-link');
const sections  = document.querySelectorAll('.section');
const navToggle = document.getElementById('navToggle');
const navLinksContainer = document.querySelector('.nav-links');

// Toggle mobile menu
navToggle.addEventListener('click', () => {
  navLinksContainer.classList.toggle('open');
});

// Switch sections when a nav link is clicked
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = link.dataset.section;   // e.g. "dashboard"

    // Update active link style
    navLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');

    // Show the matching section, hide others
    sections.forEach(s => s.classList.remove('active'));
    document.getElementById('section-' + target).classList.add('active');

    // Close mobile menu
    navLinksContainer.classList.remove('open');

    // Load data for the activated section
    if (target === 'dashboard') loadDashboard();
    if (target === 'holdings')  { loadHoldings(); loadStockOptions(); }
    if (target === 'stocks')    loadStocks();
    if (target === 'risk')      loadRisk();
  });
});

// ── Chart instances (kept so we can destroy before re-drawing) ─────────────────
let sectorChartInst     = null;
let historyChartInst    = null;
let riskSectorChartInst = null;

// ── DASHBOARD ─────────────────────────────────────────────────────────────────

async function loadDashboard() {
  try {
    const res  = await fetch('/api/summary');
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Server error');

    // Update summary cards
    document.getElementById('totalInvestment').textContent = fmt(data.total_investment);
    document.getElementById('currentValue').textContent    = fmt(data.current_value);
    document.getElementById('holdingCount').textContent    = data.holding_count;
    document.getElementById('distinctStocks').textContent  = `${data.distinct_stocks} stock(s)`;

    // P&L — colour-coded
    const pnlEl  = document.getElementById('pnlAmount');
    const pctEl  = document.getElementById('pnlPercent');
    const sign   = data.pnl >= 0 ? '+' : '';
    pnlEl.textContent  = sign + fmt(data.pnl);
    pnlEl.className    = 'card-value ' + (data.pnl >= 0 ? 'pnl-positive' : 'pnl-negative');
    pctEl.textContent  = `(${sign}${data.pnl_pct}%)`;
    pctEl.className    = 'card-sub '   + (data.pnl >= 0 ? 'pnl-positive' : 'pnl-negative');

    // Sector chart
    drawSectorChart(data.sector_allocation, 'sectorChart', 'sectorChartInst');

    // Recent holdings table
    const tbody = document.getElementById('recentHoldingsBody');
    if (!data.recent_holdings || data.recent_holdings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="loading-cell">No holdings yet. Add one in My Holdings.</td></tr>';
      return;
    }
    tbody.innerHTML = data.recent_holdings.map(h => {
      const pnlClass = parseFloat(h.pnl) >= 0 ? 'pnl-positive' : 'pnl-negative';
      return `<tr>
        <td><strong>${h.symbol}</strong></td>
        <td>${h.company_name}</td>
        <td>${h.quantity}</td>
        <td>${fmt(h.purchase_price)}</td>
        <td>${fmt(h.current_price)}</td>
        <td>${fmt(h.invested)}</td>
        <td>${fmt(h.current_val)}</td>
        <td class="${pnlClass}">${parseFloat(h.pnl) >= 0 ? '+' : ''}${fmt(h.pnl)}</td>
        <td>${riskBadge(h.risk_level)}</td>
      </tr>`;
    }).join('');

  } catch (err) {
    console.error('Dashboard load error:', err);
    document.getElementById('totalInvestment').textContent = 'Error';
    document.getElementById('recentHoldingsBody').innerHTML =
      `<tr><td colspan="9" class="loading-cell">Could not load dashboard. Is the server running and MySQL connected?</td></tr>`;
  }
}

/** Draw (or redraw) a doughnut chart for sector allocation */
function drawSectorChart(sectors, canvasId, instanceKey) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  // Destroy old chart if it exists to avoid "Canvas already in use" error
  if (instanceKey === 'sectorChartInst' && sectorChartInst) {
    sectorChartInst.destroy();
    sectorChartInst = null;
  }
  if (instanceKey === 'riskSectorChartInst' && riskSectorChartInst) {
    riskSectorChartInst.destroy();
    riskSectorChartInst = null;
  }

  if (!sectors || sectors.length === 0) {
    canvas.style.display = 'none';
    return;
  }
  canvas.style.display = '';

  const labels = sectors.map(s => s.sector || s.symbol);
  const values = sectors.map(s => parseFloat(s.sector_value || s.stock_value) || 0);

  // Simple blue-palette colours
  const colours = [
    '#1a3a6b','#2e5fa3','#4a85d4','#6ba3e8','#9bbff0',
    '#c2d8f8','#e0ebff','#8fa8cc','#3d6f9a','#5580b0'
  ];

  const chart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colours.slice(0, labels.length),
        borderColor: '#fff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'right', labels: { font: { size: 13 } } },
        tooltip: {
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct   = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
              return ` ₹${ctx.raw.toLocaleString('en-IN', {maximumFractionDigits:2})} (${pct}%)`;
            }
          }
        }
      }
    }
  });

  if (instanceKey === 'sectorChartInst')     sectorChartInst     = chart;
  if (instanceKey === 'riskSectorChartInst') riskSectorChartInst = chart;
}

// ── MY HOLDINGS ───────────────────────────────────────────────────────────────

async function loadHoldings() {
  try {
    const res  = await fetch('/api/holdings');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');

    const tbody = document.getElementById('holdingsBody');
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="13" class="loading-cell">No holdings found. Add one using the form above.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map((h, i) => {
      const pnlClass = parseFloat(h.pnl) >= 0 ? 'pnl-positive' : 'pnl-negative';
      return `<tr>
        <td>${i + 1}</td>
        <td><strong>${h.symbol}</strong></td>
        <td>${h.company_name}</td>
        <td>${h.sector}</td>
        <td>${h.quantity}</td>
        <td>${fmt(h.purchase_price)}</td>
        <td>${fmt(h.current_price)}</td>
        <td>${fmt(h.invested)}</td>
        <td>${fmt(h.current_val)}</td>
        <td class="${pnlClass}">${parseFloat(h.pnl) >= 0 ? '+' : ''}${fmt(h.pnl)}</td>
        <td>${h.purchase_date ? h.purchase_date.substring(0,10) : '-'}</td>
        <td>${riskBadge(h.risk_level)}</td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="deleteHolding(${h.holding_id}, '${h.symbol}')">
            Delete
          </button>
        </td>
      </tr>`;
    }).join('');

  } catch (err) {
    console.error('Holdings load error:', err);
    document.getElementById('holdingsBody').innerHTML =
      `<tr><td colspan="13" class="loading-cell">Could not load holdings. Check server connection.</td></tr>`;
  }
}

/** Populate the stock dropdown in the Add Holding form */
async function loadStockOptions() {
  try {
    const res  = await fetch('/api/holdings/options');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');

    const sel = document.getElementById('selectStock');
    // Clear existing options except the placeholder
    sel.innerHTML = '<option value="">-- Select a stock --</option>';
    data.forEach(s => {
      const opt = document.createElement('option');
      opt.value       = s.stock_id;
      opt.textContent = `${s.symbol} — ${s.company_name} (₹${parseFloat(s.current_price).toFixed(2)})`;
      sel.appendChild(opt);
    });
  } catch (err) {
    console.error('Options load error:', err);
  }
}

/** Handle the Add Holding form submission */
document.getElementById('addHoldingForm').addEventListener('submit', async (e) => {
  e.preventDefault();   // Prevent page reload

  // Gather form values
  const stock_id       = document.getElementById('selectStock').value;
  const quantity       = document.getElementById('inputQty').value;
  const purchase_price = document.getElementById('inputPrice').value;
  const purchase_date  = document.getElementById('inputDate').value;

  // Frontend validation
  if (!stock_id)                           return showMsg('holdingFormMsg', 'Please select a stock.',           'error');
  if (!quantity || parseInt(quantity) <= 0) return showMsg('holdingFormMsg', 'Quantity must be at least 1.',   'error');
  if (!purchase_price || parseFloat(purchase_price) <= 0)
                                           return showMsg('holdingFormMsg', 'Enter a valid purchase price.',   'error');
  if (!purchase_date)                      return showMsg('holdingFormMsg', 'Please enter a purchase date.',   'error');

  try {
    const res  = await fetch('/api/holdings', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ stock_id, quantity, purchase_price, purchase_date })
    });
    const data = await res.json();

    if (!res.ok) {
      showMsg('holdingFormMsg', data.error || 'Could not add holding.', 'error');
    } else {
      showMsg('holdingFormMsg', '✔ Holding added successfully!', 'success');
      document.getElementById('addHoldingForm').reset();
      loadHoldings();   // Refresh the table
    }
  } catch (err) {
    showMsg('holdingFormMsg', 'Network error. Is the server running?', 'error');
  }
});

/** Delete a holding after confirmation */
async function deleteHolding(id, symbol) {
  // Simple browser confirmation — no extra login needed for a demo project
  if (!confirm(`Are you sure you want to delete the holding for ${symbol}?`)) return;

  try {
    const res  = await fetch(`/api/holdings/${id}`, { method: 'DELETE' });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Could not delete holding.');
    } else {
      loadHoldings();   // Refresh table after deletion
      // Also refresh dashboard if it is visible
      if (document.getElementById('section-dashboard').classList.contains('active')) {
        loadDashboard();
      }
    }
  } catch (err) {
    alert('Network error. Is the server running?');
  }
}

// ── STOCKS ────────────────────────────────────────────────────────────────────

async function loadStocks() {
  try {
    const res  = await fetch('/api/stocks');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');

    const tbody = document.getElementById('stocksBody');
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">No stocks found.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(s => `
      <tr>
        <td><strong>${s.symbol}</strong></td>
        <td>${s.company_name}</td>
        <td>${s.sector}</td>
        <td id="price-${s.stock_id}">${fmt(s.current_price)}</td>
        <td>${riskBadge(s.risk_level)}</td>
        <td>
          <form class="price-form" onsubmit="updatePrice(event, ${s.stock_id}, '${s.symbol}')">
            <input type="number" id="newprice-${s.stock_id}"
                   min="0.01" step="0.01"
                   placeholder="New price"
                   required />
            <button type="submit" class="btn btn-primary btn-sm">Update</button>
            <button type="button" class="btn btn-secondary btn-sm"
                    onclick="showHistory(${s.stock_id}, '${s.symbol}')">History</button>
          </form>
          <span id="priceMsg-${s.stock_id}" style="font-size:12px;"></span>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    console.error('Stocks load error:', err);
    document.getElementById('stocksBody').innerHTML =
      `<tr><td colspan="6" class="loading-cell">Could not load stocks.</td></tr>`;
  }
}

/** Submit the Update Sample Price form */
async function updatePrice(event, stockId, symbol) {
  event.preventDefault();

  const newPrice = parseFloat(document.getElementById(`newprice-${stockId}`).value);
  const msgEl    = document.getElementById(`priceMsg-${stockId}`);

  if (isNaN(newPrice) || newPrice <= 0) {
    msgEl.textContent = 'Enter a valid price.';
    msgEl.style.color = '#c0392b';
    return;
  }

  try {
    const res  = await fetch(`/api/stocks/${stockId}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ current_price: newPrice })
    });
    const data = await res.json();

    if (!res.ok) {
      msgEl.textContent = data.error || 'Update failed.';
      msgEl.style.color = '#c0392b';
    } else {
      // Update the price cell immediately without reloading the whole page
      document.getElementById(`price-${stockId}`).textContent = fmt(newPrice);
      document.getElementById(`newprice-${stockId}`).value    = '';
      msgEl.textContent  = '✔ Updated!';
      msgEl.style.color  = '#1a7a1a';
      setTimeout(() => { msgEl.textContent = ''; }, 3000);
    }
  } catch (err) {
    msgEl.textContent = 'Network error.';
    msgEl.style.color = '#c0392b';
  }
}

/** Show price history chart for a stock */
async function showHistory(stockId, symbol) {
  const panel = document.getElementById('historyPanel');
  document.getElementById('historyStockName').textContent = symbol;
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const res  = await fetch(`/api/stocks/history/${stockId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const canvas = document.getElementById('historyChart');

    // Destroy previous chart instance
    if (historyChartInst) { historyChartInst.destroy(); historyChartInst = null; }

    if (!data || data.length === 0) {
      canvas.style.display = 'none';
      return;
    }
    canvas.style.display = '';

    const labels = data.map(r => r.recorded_at ? r.recorded_at.substring(0,10) : '');
    const prices = data.map(r => parseFloat(r.price));

    historyChartInst = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: `${symbol} Sample Price (₹)`,
          data:  prices,
          borderColor:     '#1a3a6b',
          backgroundColor: 'rgba(26,58,107,0.08)',
          pointBackgroundColor: '#2e5fa3',
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: false }
        },
        plugins: {
          legend: { display: true }
        }
      }
    });

  } catch (err) {
    console.error('History error:', err);
  }
}

// Close history panel
document.getElementById('closeHistoryBtn').addEventListener('click', () => {
  document.getElementById('historyPanel').style.display = 'none';
  if (historyChartInst) { historyChartInst.destroy(); historyChartInst = null; }
});

// ── RISK ANALYSIS ─────────────────────────────────────────────────────────────

async function loadRisk() {
  try {
    const res  = await fetch('/api/risk');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');

    // Warnings
    const warningsEl = document.getElementById('riskWarnings');
    if (data.warnings && data.warnings.length > 0) {
      warningsEl.innerHTML = data.warnings.map(w =>
        `<div class="warning-box"><strong>⚠️ ${w.type}:</strong> ${w.message}</div>`
      ).join('');
    } else {
      warningsEl.innerHTML = '<div class="warning-box" style="background:#d4edda;border-color:#c3e6cb;color:#155724;">✔ No concentration warnings. Portfolio appears reasonably diversified.</div>';
    }

    // Risk breakdown cards (Low / Medium / High)
    const riskMap = {};
    (data.risk_breakdown || []).forEach(r => { riskMap[r.risk_level] = r; });

    ['Low', 'Medium', 'High'].forEach(level => {
      const el = document.getElementById('risk' + level);
      if (el) {
        const r = riskMap[level];
        el.textContent = r ? `${fmt(r.risk_value)} (${r.percentage}%)` : '₹0.00 (0%)';
      }
    });

    // Stock allocation table
    const tbody = document.getElementById('riskBody');
    if (!data.stock_allocation || data.stock_allocation.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No holdings to analyse.</td></tr>';
    } else {
      tbody.innerHTML = data.stock_allocation.map(s => {
        const pctBar = `<div style="height:6px;background:#d1dae8;border-radius:3px;margin-top:4px;">
          <div style="height:6px;background:#1a3a6b;border-radius:3px;width:${Math.min(s.percentage,100)}%;"></div>
        </div>`;
        return `<tr>
          <td><strong>${s.symbol}</strong></td>
          <td>${s.company_name}</td>
          <td>${s.sector}</td>
          <td>${riskBadge(s.risk_level)}</td>
          <td>${s.total_qty}</td>
          <td>${fmt(s.stock_value)}</td>
          <td>${s.percentage}%${pctBar}</td>
        </tr>`;
      }).join('');
    }

    // Sector chart (reuse the drawSectorChart helper)
    drawSectorChart(data.sector_allocation, 'riskSectorChart', 'riskSectorChartInst');

  } catch (err) {
    console.error('Risk load error:', err);
    document.getElementById('riskBody').innerHTML =
      `<tr><td colspan="7" class="loading-cell">Could not load risk analysis.</td></tr>`;
  }
}

// ── Initial load ──────────────────────────────────────────────────────────────
// When the page first opens, load the dashboard
loadDashboard();
