# Financial Portfolio Manager
### B.Tech DBMS College Project

A simple web application to manage stock investment holdings, track portfolio values, and understand basic investment risk — built with **Node.js**, **Express.js**, **MySQL**, and plain HTML/CSS/JavaScript.

> ⚠️ All stock prices are **illustrative sample data**. This project does not connect to any live market feed.

---

## Project Structure

```
financial-portfolio/
├── server.js          ← Express server (entry point)
├── db.js              ← MySQL connection pool
├── package.json
├── .env.example       ← Copy this to .env and fill in your MySQL details
├── .gitignore
├── database.sql       ← Run this in MySQL Workbench to set up the database
├── routes/
│   ├── dashboard.js   ← GET /api/summary
│   ├── holdings.js    ← GET/POST/DELETE /api/holdings
│   ├── stocks.js      ← GET/PUT /api/stocks, GET /api/stocks/history/:id
│   └── risk.js        ← GET /api/risk
└── public/
    ├── index.html     ← Single-page frontend
    ├── style.css      ← Stylesheet
    └── script.js      ← Frontend JavaScript
```

---

## Setup Instructions

### Step 1 — Install Node.js

1. Go to https://nodejs.org and download the **LTS** version.
2. Run the installer. Keep all default options.
3. Open **PowerShell** or **Command Prompt** and verify:
   ```
   node --version
   npm --version
   ```
   Both commands should print a version number.

### Step 2 — Install MySQL

1. Go to https://dev.mysql.com/downloads/installer/ and download **MySQL Installer for Windows**.
2. Run the installer. Choose **Developer Default** setup.
3. Set a **root password** during setup — remember this password, you will need it.
4. MySQL Workbench is installed automatically with Developer Default.

### Step 3 — Create the Database

1. Open **MySQL Workbench**.
2. Connect to your local MySQL server (localhost, root, your password).
3. In the top menu, click **File → Open SQL Script…**
4. Browse to this project folder and select **database.sql**.
5. Click the ⚡ (lightning bolt) button to run the entire script.
6. In the left panel under **Schemas**, refresh and confirm you see `financial_portfolio` with its tables.

### Step 4 — Configure Environment Variables

1. In the project folder, find the file **`.env.example`**.
2. **Copy** it and rename the copy to **`.env`** (no `.example` extension).
3. Open `.env` in any text editor and fill in your MySQL details:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=financial_portfolio
PORT=3000
```

> ⚠️ Never share your `.env` file. It is listed in `.gitignore` and will not be uploaded to Git.

### Step 5 — Install Node Packages

Open **PowerShell** or **Command Prompt**, navigate to the project folder:

```powershell
cd "C:\Users\Krishna\Desktop\mywedsite"
npm install
```

This installs `express`, `mysql2`, and `dotenv` (already in `package.json`).

### Step 6 — Start the Server

```powershell
npm start
```

You should see:
```
─────────────────────────────────────────────
  Financial Portfolio Manager
  Server running at http://localhost:3000
─────────────────────────────────────────────
```

### Step 7 — Open the Application

Open your browser and go to:

**http://localhost:3000**

---

## API Endpoints Reference

| Method | Endpoint                    | Description                          |
|--------|-----------------------------|--------------------------------------|
| GET    | /api/summary                | Dashboard totals                     |
| GET    | /api/holdings               | All holdings with P&L                |
| GET    | /api/holdings/options       | Stock list for add-holding dropdown  |
| POST   | /api/holdings               | Add a new holding                    |
| DELETE | /api/holdings/:id           | Delete a holding                     |
| GET    | /api/stocks                 | All stocks                           |
| PUT    | /api/stocks/:id             | Update sample price + log history    |
| GET    | /api/stocks/history/:stockId| Price history for one stock          |
| GET    | /api/risk                   | Portfolio allocation and warnings    |

---

## Troubleshooting

### "Error: connect ECONNREFUSED 127.0.0.1:3306"
- MySQL is not running. Open **Services** in Windows, find **MySQL80** and start it.
- Or open MySQL Workbench and check the connection.

### "Access denied for user 'root'@'localhost'"
- Wrong password in your `.env` file. Double-check `DB_PASSWORD`.

### "Unknown database 'financial_portfolio'"
- You haven't run `database.sql` yet. Follow Step 3 above.

### "Port 3000 is already in use"
- Change `PORT=3001` in your `.env` file and restart.
- Or find and stop the other process using port 3000.

### Dashboard shows "Could not load dashboard"
- Check the terminal where you ran `npm start` for error messages.
- Make sure MySQL is running and `.env` credentials are correct.

### npm install errors
- Make sure you are inside the project folder when running the command.
- Try running PowerShell as Administrator.

---

## DBMS Concepts Used

| Concept                  | Description                                              |
|--------------------------|----------------------------------------------------------|
| CREATE DATABASE / TABLE  | Set up the database and all five tables                  |
| Primary Keys             | Auto-increment IDs in every table                        |
| Foreign Keys             | holdings → investors/stocks, transactions → holdings     |
| CHECK Constraints        | quantity > 0, risk_level IN ('Low','Medium','High')      |
| INSERT                   | Add holdings, log transactions, seed sample data         |
| SELECT with JOIN         | Dashboard totals combining holdings and stocks tables    |
| UPDATE                   | Update stock sample price                                |
| DELETE                   | Remove a holding and its transactions                    |
| SUM, COUNT (aggregates)  | Calculate total investment, current value, P&L           |
| GROUP BY                 | Sector and risk-level breakdowns                         |
| COALESCE                 | Handle empty portfolio (avoid NULL in totals)            |
| Parameterized Queries    | `?` placeholders prevent SQL injection                   |
| Database Transaction     | Price update + history insert as one atomic operation    |
| Indexes                  | Speed up frequent JOIN lookups                           |

---

## How Frontend ↔ Backend ↔ MySQL Works

```
Browser (HTML + JS)
       │
       │  HTTP request (fetch /api/summary)
       ▼
Express Server (server.js)
       │
       │  SQL query via mysql2
       ▼
MySQL Database
       │
       │  Result rows
       ▼
Express Server
       │
       │  JSON response
       ▼
Browser (updates the page)
```

---

## Faculty Q&A

**Q: What is a foreign key?**
A: A foreign key in one table points to the primary key of another table, enforcing that only valid references exist. For example, `holdings.investor_id` must match an `investor_id` in the `investors` table.

**Q: Why use parameterized queries?**
A: To prevent SQL injection attacks. Instead of putting user input directly into the SQL string, we use `?` placeholders and pass values separately so MySQL handles escaping safely.

**Q: What is a database transaction?**
A: A transaction groups multiple SQL statements so they either all succeed (COMMIT) or all fail together (ROLLBACK). In this project, updating a stock price and inserting the history record happen inside one transaction.

**Q: What does COALESCE do?**
A: COALESCE returns the first non-NULL value in a list. We use it so that when the portfolio is empty and SUM() returns NULL, we get 0 instead.

**Q: Why is a connection pool used instead of a single connection?**
A: A pool keeps several connections open and reuses them, which is more efficient than opening and closing a new database connection for every API request.

**Q: What is the difference between a primary key and a unique key?**
A: A primary key uniquely identifies each row and cannot be NULL. A unique key also enforces uniqueness but can allow NULL. For example, `stock.symbol` has a UNIQUE constraint but is not the primary key.
