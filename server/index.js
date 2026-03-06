// server/index.js
const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/healthz", (_req, res) => res.status(200).send("ok"));

function normalizeUrl(url) {
  const trimmed = (url || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function normalizeDateInput(input) {
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  return new Date().toISOString().slice(0, 10);
}

function getWeekStart(date = new Date()) {
  const day = date.getDay();
  const diff = (day + 6) % 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - diff);
  return monday.toISOString().slice(0, 10);
}

function getMonthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

function getNextSortValue(table, whereSql, whereArgs = []) {
  const row = db.prepare(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS nextSort FROM ${table} ${whereSql}`
  ).get(...whereArgs);
  return row.nextSort;
}

function clampPositiveInt(value, fallback) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) return fallback;
  return num;
}

// ---------- Panels ----------
app.get("/api/panels", (_req, res) => {
  const rows = db
    .prepare("SELECT id, name, sort_order FROM panels ORDER BY sort_order, id")
    .all();
  res.json(rows);
});

app.post("/api/panels", (req, res) => {
  const name = (req.body?.name || "").trim();
  if (!name) return res.status(400).json({ error: "name is required" });

  const sortOrder = getNextSortValue("panels", "");
  try {
    const info = db
      .prepare("INSERT INTO panels (name, sort_order) VALUES (?, ?)")
      .run(name, sortOrder);
    res.json({ id: info.lastInsertRowid, name, sort_order: sortOrder });
  } catch (_e) {
    res.status(400).json({ error: "Panel name already exists" });
  }
});

app.delete("/api/panels/:id", (req, res) => {
  const panelId = Number(req.params.id);
  const total = db.prepare("SELECT COUNT(*) AS count FROM panels").get().count;
  if (total <= 1) {
    return res.status(400).json({ error: "At least one panel must remain" });
  }

  db.transaction(() => {
    db.prepare(
      "DELETE FROM links WHERE category_id IN (SELECT id FROM categories WHERE panel_id=?)"
    ).run(panelId);
    db.prepare("DELETE FROM categories WHERE panel_id=?").run(panelId);
    db.prepare("DELETE FROM panels WHERE id=?").run(panelId);
  })();

  res.json({ ok: true });
});

app.put("/api/panels/reorder", (req, res) => {
  const orderedIds = req.body?.orderedIds;
  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: "orderedIds array is required" });
  }

  const update = db.prepare("UPDATE panels SET sort_order=? WHERE id=?");
  db.transaction(() => {
    orderedIds.forEach((id, index) => update.run(index, Number(id)));
  })();

  res.json({ ok: true });
});

// ---------- Categories ----------
app.get("/api/categories", (req, res) => {
  const panelId = Number(req.query.panel_id);
  if (!panelId) return res.status(400).json({ error: "panel_id is required" });

  const rows = db
    .prepare(
      "SELECT id, panel_id, name, sort_order FROM categories WHERE panel_id=? ORDER BY sort_order, id"
    )
    .all(panelId);
  res.json(rows);
});

app.post("/api/categories", (req, res) => {
  const name = (req.body?.name || "").trim();
  const panelId = Number(req.body?.panel_id);
  if (!name || !panelId) {
    return res.status(400).json({ error: "name and panel_id are required" });
  }

  const sortOrder = getNextSortValue("categories", "WHERE panel_id=?", [panelId]);
  try {
    const info = db
      .prepare("INSERT INTO categories (panel_id, name, sort_order) VALUES (?, ?, ?)")
      .run(panelId, name, sortOrder);
    res.json({ id: info.lastInsertRowid, panel_id: panelId, name, sort_order: sortOrder });
  } catch (_e) {
    res.status(400).json({ error: "Category already exists" });
  }
});

app.delete("/api/categories/:id", (req, res) => {
  const id = Number(req.params.id);
  db.transaction(() => {
    db.prepare("DELETE FROM links WHERE category_id = ?").run(id);
    db.prepare("DELETE FROM categories WHERE id = ?").run(id);
  })();
  res.json({ ok: true });
});

app.get("/api/categories/:id/snapshot", (req, res) => {
  const id = Number(req.params.id);
  const category = db
    .prepare("SELECT id, panel_id, name, sort_order FROM categories WHERE id=?")
    .get(id);
  if (!category) return res.status(404).json({ error: "Category not found" });

  const links = db
    .prepare(
      "SELECT id, name, url, description, category_id, sort_order FROM links WHERE category_id=? ORDER BY sort_order, id"
    )
    .all(id);

  res.json({ category, links });
});

app.post("/api/categories/restore", (req, res) => {
  const category = req.body?.category;
  const links = Array.isArray(req.body?.links) ? req.body.links : [];
  if (!category?.name || !category?.panel_id) {
    return res.status(400).json({ error: "category payload is required" });
  }

  const restored = db.transaction(() => {
    const categorySort = Number.isInteger(Number(category.sort_order))
      ? Number(category.sort_order)
      : getNextSortValue("categories", "WHERE panel_id=?", [Number(category.panel_id)]);

    const info = db
      .prepare("INSERT INTO categories (panel_id, name, sort_order) VALUES (?, ?, ?)")
      .run(Number(category.panel_id), String(category.name).trim(), categorySort);
    const newCategoryId = info.lastInsertRowid;

    const insertLink = db.prepare(
      "INSERT INTO links (category_id, name, url, description, sort_order) VALUES (?, ?, ?, ?, ?)"
    );
    links.forEach((link, index) => {
      insertLink.run(
        Number(newCategoryId),
        String(link.name || "").trim(),
        normalizeUrl(link.url),
        String(link.description || "").trim(),
        Number.isInteger(Number(link.sort_order)) ? Number(link.sort_order) : index
      );
    });
    return { id: newCategoryId };
  })();

  res.json({ ok: true, category_id: restored.id });
});

app.put("/api/categories/reorder", (req, res) => {
  const orderedIds = req.body?.orderedIds;
  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: "orderedIds array is required" });
  }

  const update = db.prepare("UPDATE categories SET sort_order=? WHERE id=?");
  db.transaction(() => {
    orderedIds.forEach((id, index) => update.run(index, Number(id)));
  })();

  res.json({ ok: true });
});

// ---------- Links ----------
app.get("/api/links", (req, res) => {
  const panelId = Number(req.query.panel_id);
  if (!panelId) return res.status(400).json({ error: "panel_id is required" });

  const rows = db
    .prepare(`
      SELECT
        links.id,
        links.name,
        links.url,
        links.description,
        links.category_id,
        links.sort_order,
        categories.name AS category_name
      FROM links
      JOIN categories ON categories.id = links.category_id
      WHERE categories.panel_id = ?
      ORDER BY categories.sort_order, links.sort_order, links.id
    `)
    .all(panelId);
  res.json(rows);
});

app.post("/api/links", (req, res) => {
  const name = (req.body?.name || "").trim();
  const url = normalizeUrl(req.body?.url);
  const description = (req.body?.description || "").trim();
  const categoryId = Number(req.body?.category_id);
  const sortOrderInput = req.body?.sort_order;

  if (!name || !url || !categoryId) {
    return res.status(400).json({ error: "name, url, category_id are required" });
  }

  const sortOrder =
    Number.isInteger(Number(sortOrderInput)) && Number(sortOrderInput) >= 0
      ? Number(sortOrderInput)
      : getNextSortValue("links", "WHERE category_id=?", [categoryId]);
  const info = db
    .prepare(
      "INSERT INTO links (category_id, name, url, description, sort_order) VALUES (?, ?, ?, ?, ?)"
    )
    .run(categoryId, name, url, description, sortOrder);

  res.json({
    id: info.lastInsertRowid,
    category_id: categoryId,
    name,
    url,
    description,
    sort_order: sortOrder,
  });
});

app.put("/api/links/reorder", (req, res) => {
  const items = req.body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "items array is required" });
  }

  const update = db.prepare(
    "UPDATE links SET category_id=?, sort_order=? WHERE id=?"
  );
  db.transaction(() => {
    items.forEach((item) => {
      update.run(Number(item.category_id), Number(item.sort_order), Number(item.id));
    });
  })();

  res.json({ ok: true });
});

app.put("/api/links/:id", (req, res) => {
  const id = Number(req.params.id);
  const name = (req.body?.name || "").trim();
  const url = normalizeUrl(req.body?.url);
  const description = (req.body?.description || "").trim();
  const categoryId = Number(req.body?.category_id);

  if (!name || !url || !categoryId) {
    return res.status(400).json({ error: "name, url, category_id are required" });
  }

  db.prepare(
    "UPDATE links SET category_id=?, name=?, url=?, description=? WHERE id=?"
  ).run(categoryId, name, url, description, id);

  res.json({ ok: true });
});

app.delete("/api/links/:id", (req, res) => {
  db.prepare("DELETE FROM links WHERE id = ?").run(Number(req.params.id));
  res.json({ ok: true });
});

// ---------- Time Tracker ----------
app.get("/api/time/tasks", (_req, res) => {
  const weekStart = getWeekStart();
  const monthStart = getMonthStart();
  const today = new Date().toISOString().slice(0, 10);

  const rows = db
    .prepare(
      `
      SELECT
        t.id,
        t.name,
        t.target_hours,
        t.sort_order,
        COALESCE((SELECT SUM(hours) FROM time_logs l WHERE l.task_id=t.id), 0) AS total_hours,
        COALESCE((SELECT SUM(hours) FROM time_logs l WHERE l.task_id=t.id AND l.log_date >= ?), 0) AS week_hours,
        COALESCE((SELECT SUM(hours) FROM time_logs l WHERE l.task_id=t.id AND l.log_date >= ?), 0) AS month_hours,
        COALESCE((SELECT SUM(hours) FROM time_logs l WHERE l.task_id=t.id AND l.log_date = ?), 0) AS today_hours
      FROM time_tasks t
      ORDER BY t.sort_order, t.id
    `
    )
    .all(weekStart, monthStart, today);
  res.json(rows);
});

app.post("/api/time/tasks", (req, res) => {
  const name = (req.body?.name || "").trim();
  const targetHours = clampPositiveInt(req.body?.target_hours, 100);
  if (!name) return res.status(400).json({ error: "name is required" });

  const sortOrder = getNextSortValue("time_tasks", "");
  try {
    const info = db
      .prepare(
        "INSERT INTO time_tasks (name, target_hours, sort_order) VALUES (?, ?, ?)"
      )
      .run(name, targetHours, sortOrder);
    res.json({
      id: info.lastInsertRowid,
      name,
      target_hours: targetHours,
      sort_order: sortOrder,
    });
  } catch (_e) {
    res.status(400).json({ error: "Task already exists" });
  }
});

app.delete("/api/time/tasks/:id", (req, res) => {
  db.prepare("DELETE FROM time_tasks WHERE id=?").run(Number(req.params.id));
  res.json({ ok: true });
});

app.post("/api/time/tasks/:id/log", (req, res) => {
  const taskId = Number(req.params.id);
  const logDate = normalizeDateInput(req.body?.log_date);
  const hours = clampPositiveInt(req.body?.hours, 1);

  db.prepare(
    "INSERT INTO time_logs (task_id, log_date, hours) VALUES (?, ?, ?)"
  ).run(taskId, logDate, hours);
  res.json({ ok: true });
});

app.delete("/api/time/tasks/:id/log", (req, res) => {
  const taskId = Number(req.params.id);
  const logDate = normalizeDateInput(req.body?.log_date);
  const row = db
    .prepare(
      "SELECT id FROM time_logs WHERE task_id=? AND log_date=? ORDER BY created_at DESC, id DESC LIMIT 1"
    )
    .get(taskId, logDate);

  if (!row) return res.status(404).json({ error: "No log found to remove" });

  db.prepare("DELETE FROM time_logs WHERE id=?").run(row.id);
  res.json({ ok: true });
});

app.get("/api/time/summary", (_req, res) => {
  const weekStart = getWeekStart();
  const monthStart = getMonthStart();

  const summary = db
    .prepare(
      `
      SELECT
        COALESCE((SELECT SUM(hours) FROM time_logs), 0) AS total_hours,
        COALESCE((SELECT SUM(hours) FROM time_logs WHERE log_date >= ?), 0) AS week_hours,
        COALESCE((SELECT SUM(hours) FROM time_logs WHERE log_date >= ?), 0) AS month_hours
    `
    )
    .get(weekStart, monthStart);

  res.json(summary);
});

app.get("/api/time/chart", (_req, res) => {
  const days = 14;
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - (days - 1));
  const startIso = start.toISOString().slice(0, 10);

  const rows = db
    .prepare(
      `
      SELECT log_date, SUM(hours) AS total_hours
      FROM time_logs
      WHERE log_date >= ?
      GROUP BY log_date
      ORDER BY log_date
    `
    )
    .all(startIso);

  const map = new Map(rows.map((r) => [r.log_date, Number(r.total_hours)]));
  const points = [];
  const cursor = new Date(start);
  for (let i = 0; i < days; i += 1) {
    const date = cursor.toISOString().slice(0, 10);
    points.push({ date, hours: map.get(date) || 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  res.json({ points });
});

app.get("/api/time/tasks/:id/chart", (req, res) => {
  const taskId = Number(req.params.id);
  const daysInput = Number(req.query.days);
  const days = Number.isInteger(daysInput) && daysInput > 0 ? Math.min(daysInput, 90) : 40;
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - (days - 1));
  const startIso = start.toISOString().slice(0, 10);

  const rows = db
    .prepare(
      `
      SELECT log_date, SUM(hours) AS total_hours
      FROM time_logs
      WHERE task_id = ? AND log_date >= ?
      GROUP BY log_date
      ORDER BY log_date
    `
    )
    .all(taskId, startIso);

  const map = new Map(rows.map((r) => [r.log_date, Number(r.total_hours)]));
  const points = [];
  const cursor = new Date(start);
  for (let i = 0; i < days; i += 1) {
    const date = cursor.toISOString().slice(0, 10);
    points.push({ date, hours: map.get(date) || 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  res.json({ points });
});

app.get("/api/time/series", (req, res) => {
  const view = req.query.view === "year" || req.query.view === "month" ? req.query.view : "week";
  const today = new Date();
  const tasks = db
    .prepare("SELECT id, name FROM time_tasks ORDER BY sort_order, id")
    .all();

  if (tasks.length === 0) {
    return res.json({ view, buckets: [], tasks: [] });
  }

  let buckets = [];
  let rows = [];

  if (view === "year") {
    const year = today.getFullYear();
    for (let m = 0; m < 12; m += 1) {
      const date = new Date(year, m, 1);
      buckets.push({
        key: date.toISOString().slice(0, 7),
        label: `${m + 1}`,
      });
    }

    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    rows = db
      .prepare(
        `
        SELECT task_id, substr(log_date, 1, 7) AS bucket_key, SUM(hours) AS total_hours
        FROM time_logs
        WHERE log_date >= ? AND log_date <= ?
        GROUP BY task_id, bucket_key
      `
      )
      .all(start, end);
  } else {
    const days = view === "month" ? 30 : 7;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (days - 1));

    const cursor = new Date(startDate);
    for (let i = 0; i < days; i += 1) {
      const key = cursor.toISOString().slice(0, 10);
      buckets.push({ key, label: key.slice(5) });
      cursor.setDate(cursor.getDate() + 1);
    }

    const start = startDate.toISOString().slice(0, 10);
    rows = db
      .prepare(
        `
        SELECT task_id, log_date AS bucket_key, SUM(hours) AS total_hours
        FROM time_logs
        WHERE log_date >= ?
        GROUP BY task_id, bucket_key
      `
      )
      .all(start);
  }

  const rowMap = new Map(rows.map((r) => [`${r.task_id}|${r.bucket_key}`, Number(r.total_hours)]));
  const taskSeries = tasks.map((task) => ({
    id: task.id,
    name: task.name,
    values: buckets.map((bucket) => rowMap.get(`${task.id}|${bucket.key}`) || 0),
  }));

  res.json({ view, buckets, tasks: taskSeries });
});

app.get("/api/time/export", (_req, res) => {
  const tasks = db
    .prepare(
      `
      SELECT
        t.id,
        t.name,
        t.target_hours,
        COALESCE((SELECT SUM(hours) FROM time_logs l WHERE l.task_id=t.id), 0) AS total_hours
      FROM time_tasks t
      ORDER BY t.sort_order, t.id
    `
    )
    .all();

  const byDayRows = db
    .prepare(
      `
      SELECT task_id, log_date AS period, SUM(hours) AS hours
      FROM time_logs
      GROUP BY task_id, period
      ORDER BY task_id, period
    `
    )
    .all();

  const byWeekRows = db
    .prepare(
      `
      SELECT
        task_id,
        date(log_date, '-' || ((CAST(strftime('%w', log_date) AS INTEGER) + 6) % 7) || ' days') AS period,
        SUM(hours) AS hours
      FROM time_logs
      GROUP BY task_id, period
      ORDER BY task_id, period
    `
    )
    .all();

  const byMonthRows = db
    .prepare(
      `
      SELECT
        task_id,
        substr(log_date, 1, 7) AS period,
        SUM(hours) AS hours
      FROM time_logs
      GROUP BY task_id, period
      ORDER BY task_id, period
    `
    )
    .all();

  function buildMap(rows) {
    const map = new Map();
    rows.forEach((row) => {
      if (!map.has(row.task_id)) map.set(row.task_id, []);
      map.get(row.task_id).push({ period: row.period, hours: Number(row.hours) || 0 });
    });
    return map;
  }

  const dayMap = buildMap(byDayRows);
  const weekMap = buildMap(byWeekRows);
  const monthMap = buildMap(byMonthRows);

  res.json({
    generated_at: new Date().toISOString(),
    tasks: tasks.map((task) => ({
      task_id: task.id,
      task_name: task.name,
      target_hours: Number(task.target_hours) || 0,
      total_hours: Number(task.total_hours) || 0,
      by_day: dayMap.get(task.id) || [],
      by_week: weekMap.get(task.id) || [],
      by_month: monthMap.get(task.id) || [],
    })),
  });
});

// ---------- To Do ----------
app.get("/api/todo/items", (_req, res) => {
  const rows = db
    .prepare(
      `
      SELECT id, title, lane, done, sort_order, created_at, done_at
      FROM todo_items
      ORDER BY lane, done, sort_order, id
    `
    )
    .all();
  res.json(rows);
});

app.post("/api/todo/items", (req, res) => {
  const title = (req.body?.title || "").trim();
  const lane = req.body?.lane === "next" ? "next" : "today";
  if (!title) return res.status(400).json({ error: "title is required" });

  const sortOrder = getNextSortValue("todo_items", "WHERE lane=? AND done=0", [lane]);
  const info = db
    .prepare(
      "INSERT INTO todo_items (title, lane, done, sort_order, done_at) VALUES (?, ?, 0, ?, NULL)"
    )
    .run(title, lane, sortOrder);
  res.json({ id: info.lastInsertRowid, title, lane, done: 0, sort_order: sortOrder });
});

app.put("/api/todo/items/:id", (req, res) => {
  const id = Number(req.params.id);
  const title = (req.body?.title || "").trim();
  if (!title) return res.status(400).json({ error: "title is required" });

  const lane = req.body?.lane === "next" ? "next" : req.body?.lane === "today" ? "today" : null;
  if (lane) {
    db.prepare("UPDATE todo_items SET title=?, lane=? WHERE id=?").run(title, lane, id);
  } else {
    db.prepare("UPDATE todo_items SET title=? WHERE id=?").run(title, id);
  }
  res.json({ ok: true });
});

app.put("/api/todo/items/:id/toggle", (req, res) => {
  const id = Number(req.params.id);
  const item = db
    .prepare("SELECT id, lane, done FROM todo_items WHERE id=?")
    .get(id);
  if (!item) return res.status(404).json({ error: "Item not found" });

  const nextDone = item.done ? 0 : 1;
  const sortOrder = getNextSortValue("todo_items", "WHERE lane=? AND done=?", [
    item.lane,
    nextDone,
  ]);
  const doneAt = nextDone ? new Date().toISOString() : null;

  db.prepare("UPDATE todo_items SET done=?, sort_order=?, done_at=? WHERE id=?").run(
    nextDone,
    sortOrder,
    doneAt,
    id
  );
  res.json({ ok: true });
});

app.delete("/api/todo/items/:id", (req, res) => {
  db.prepare("DELETE FROM todo_items WHERE id=?").run(Number(req.params.id));
  res.json({ ok: true });
});

app.delete("/api/todo/clear", (req, res) => {
  const lane = req.query.lane === "next" ? "next" : req.query.lane === "today" ? "today" : null;
  if (!lane) return res.status(400).json({ error: "lane is required (today|next)" });

  db.prepare("DELETE FROM todo_items WHERE lane=?").run(lane);
  res.json({ ok: true });
});

app.get("/api/todo/history", (_req, res) => {
  const rows = db
    .prepare(
      `
      SELECT id, title, lane, done_at
      FROM todo_items
      WHERE done=1 AND done_at IS NOT NULL
      ORDER BY done_at DESC
      LIMIT 120
    `
    )
    .all();

  const byDate = {};
  rows.forEach((row) => {
    const date = row.done_at.slice(0, 10);
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push({ id: row.id, title: row.title, lane: row.lane });
  });

  res.json({
    dates: Object.entries(byDate).map(([date, items]) => ({ date, items })),
  });
});

// ---------- Daily Verse ----------
const DAILY_VERSES = [
  {
    ref: "Isaiah 41:10",
    zh_ref: "赛 41:10",
    zh: "你不要害怕，因为我与你同在；不要惊惶，因为我是你的神。我必坚固你，我必帮助你；我必用我公义的右手扶持你。",
    en: "Fear not, for I am with you; be not dismayed, for I am your God. I will strengthen you, I will help you, I will uphold you with my righteous right hand.",
  },
  {
    ref: "Philippians 4:13",
    zh_ref: "腓 4:13",
    zh: "我靠着那加给我力量的，凡事都能做。",
    en: "I can do all things through him who strengthens me.",
  },
  {
    ref: "Psalm 23:1",
    zh_ref: "诗 23:1",
    zh: "耶和华是我的牧者，我必不至缺乏。",
    en: "The Lord is my shepherd; I shall not want.",
  },
  {
    ref: "Joshua 1:9",
    zh_ref: "书 1:9",
    zh: "你当刚强壮胆！不要惧怕，也不要惊惶，因为你无论往哪里去，耶和华你的神必与你同在。",
    en: "Be strong and courageous. Do not be frightened, and do not be dismayed, for the Lord your God is with you wherever you go.",
  },
  {
    ref: "Romans 8:28",
    zh_ref: "罗 8:28",
    zh: "我们晓得万事都互相效力，叫爱神的人得益处。",
    en: "And we know that for those who love God all things work together for good.",
  },
  {
    ref: "Matthew 11:28",
    zh_ref: "太 11:28",
    zh: "凡劳苦担重担的人，可以到我这里来，我就使你们得安息。",
    en: "Come to me, all who labor and are heavy laden, and I will give you rest.",
  },
  {
    ref: "Psalm 46:1",
    zh_ref: "诗 46:1",
    zh: "神是我们的避难所，是我们的力量，是我们在患难中随时的帮助。",
    en: "God is our refuge and strength, a very present help in trouble.",
  },
];

app.get("/api/daily-verse", (_req, res) => {
  const mode = _req.query.mode === "random" ? "random" : "daily";
  const date = new Date().toISOString().slice(0, 10);
  let verse;
  if (mode === "random") {
    const idx = Math.floor(Math.random() * DAILY_VERSES.length);
    verse = DAILY_VERSES[idx];
  } else {
    const daysSinceEpoch = Math.floor(new Date(date).getTime() / 86400000);
    verse =
      DAILY_VERSES[
        ((daysSinceEpoch % DAILY_VERSES.length) + DAILY_VERSES.length) % DAILY_VERSES.length
      ];
  }
  res.json({ date, ...verse });
});

const PORT = 8787;
app.listen(PORT, () => console.log(`Server running: http://localhost:${PORT}`));
