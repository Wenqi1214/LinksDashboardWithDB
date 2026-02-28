/* eslint-env node */
const path = require("path");
const Database = require("better-sqlite3");

const DB_FILE = path.join(__dirname, "data.sqlite");
console.log("[DB] Using SQLite file:", DB_FILE);

const db = new Database(DB_FILE);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL
  );
`);

module.exports = db;