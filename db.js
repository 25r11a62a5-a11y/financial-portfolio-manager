// db.js
// This file creates and exports a MySQL connection pool.
// A pool reuses connections instead of opening a new one for every request,
// which is more efficient. We import mysql2 and read credentials from .env.

require('dotenv').config(); // Load .env file variables into process.env

const mysql = require('mysql2');

// Create a connection pool using environment variables
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'financial_portfolio',
  waitForConnections: true,
  connectionLimit:    10
});

// Export the pool with promise support so we can use async/await in routes
module.exports = pool.promise();
