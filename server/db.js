/* eslint-env node */
const path = require("path");
const Database = require("better-sqlite3");

const DB_FILE = path.join(__dirname, "data.sqlite");
console.log("[DB] Using SQLite file:", DB_FILE);

const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function tableExists(name) {
  const row = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
  ).get(name);
  return Boolean(row);
}

function hasColumn(table, column) {
  if (!tableExists(table)) return false;
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  return columns.some((c) => c.name === column);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS panels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
`);

if (!tableExists("categories")) {
  db.exec(`
    CREATE TABLE categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      panel_id INTEGER NOT NULL DEFAULT 1,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (panel_id) REFERENCES panels(id) ON DELETE CASCADE
    );
  `);
} else {
  if (!hasColumn("categories", "panel_id")) {
    db.exec("ALTER TABLE categories ADD COLUMN panel_id INTEGER NOT NULL DEFAULT 1");
  }
  if (!hasColumn("categories", "sort_order")) {
    db.exec("ALTER TABLE categories ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0");
  }
}

if (!tableExists("links")) {
  db.exec(`
    CREATE TABLE links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );
  `);
} else {
  if (!hasColumn("links", "description")) {
    db.exec("ALTER TABLE links ADD COLUMN description TEXT NOT NULL DEFAULT ''");
  }
  if (!hasColumn("links", "sort_order")) {
    db.exec("ALTER TABLE links ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0");
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS time_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    target_hours INTEGER NOT NULL DEFAULT 100,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS time_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    log_date TEXT NOT NULL,
    hours INTEGER NOT NULL DEFAULT 1 CHECK(hours > 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES time_tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS todo_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    lane TEXT NOT NULL CHECK(lane IN ('today', 'next')),
    done INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    done_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_categories_panel_sort ON categories(panel_id, sort_order, id);
  CREATE INDEX IF NOT EXISTS idx_links_cat_sort ON links(category_id, sort_order, id);
  CREATE INDEX IF NOT EXISTS idx_time_logs_task_date ON time_logs(task_id, log_date);
  CREATE INDEX IF NOT EXISTS idx_todo_lane_sort ON todo_items(lane, done, sort_order, id);
  CREATE INDEX IF NOT EXISTS idx_todo_done_at ON todo_items(done_at);
`);

const panelCount = db.prepare("SELECT COUNT(*) AS count FROM panels").get().count;
if (panelCount === 0) {
  db.prepare("INSERT INTO panels (name, sort_order) VALUES (?, ?)").run("Work", 0);
  db.prepare("INSERT INTO panels (name, sort_order) VALUES (?, ?)").run("Personal", 1);
}

if (tableExists("categories")) {
  const defaultPanel = db.prepare("SELECT id FROM panels ORDER BY sort_order, id LIMIT 1").get();
  if (defaultPanel) {
    db.prepare("UPDATE categories SET panel_id=? WHERE panel_id IS NULL OR panel_id=0").run(defaultPanel.id);
  }

  const categories = db.prepare(
    "SELECT id FROM categories ORDER BY panel_id, sort_order, name, id"
  ).all();
  const updateCategorySort = db.prepare("UPDATE categories SET sort_order=? WHERE id=?");
  categories.forEach((row, idx) => {
    updateCategorySort.run(idx, row.id);
  });
}

if (tableExists("links")) {
  const links = db.prepare(
    "SELECT id, category_id FROM links ORDER BY category_id, sort_order, name, id"
  ).all();
  const updateLinkSort = db.prepare("UPDATE links SET sort_order=? WHERE id=?");
  let groupSort = 0;
  let lastCategory = null;
  links.forEach((row) => {
    if (row.category_id !== lastCategory) {
      lastCategory = row.category_id;
      groupSort = 0;
    }
    updateLinkSort.run(groupSort, row.id);
    groupSort += 1;
  });
}

module.exports = db;
