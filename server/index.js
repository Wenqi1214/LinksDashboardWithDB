// server/index.js
const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/healthz", (req, res) => res.status(200).send("ok"));
// ---------- Categories ----------
app.get("/api/categories", (req, res) => {
    const rows = db.prepare("SELECT * FROM categories ORDER BY name").all();
    res.json(rows);
});

app.post("/api/categories", (req, res) => {
    const name = (req.body?.name || "").trim();
    if (!name) return res.status(400).json({ error: "name is required" });

    try {
        const info = db.prepare("INSERT INTO categories (name) VALUES (?)").run(name);
        res.json({ id: info.lastInsertRowid, name });
    } catch (e) {
        return res.status(400).json({ error: "Category already exists" });
    }
});

app.delete("/api/categories/:id", (req, res) => {
    db.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
});

// ---------- Links ----------
app.get("/api/links", (req, res) => {
    const rows = db.prepare(`
    SELECT links.id, links.name, links.url, links.category_id, categories.name AS category_name
    FROM links
    JOIN categories ON categories.id = links.category_id
    ORDER BY categories.name, links.name
  `).all();
    res.json(rows);
});

app.post("/api/links", (req, res) => {
    const name = (req.body?.name || "").trim();
    const url = (req.body?.url || "").trim();
    const category_id = Number(req.body?.category_id);

    if (!name || !url || !category_id) {
        return res.status(400).json({ error: "name, url, category_id are required" });
    }

    const info = db
        .prepare("INSERT INTO links (category_id, name, url) VALUES (?, ?, ?)")
        .run(category_id, name, url);

    res.json({ id: info.lastInsertRowid, category_id, name, url });
});

app.put("/api/links/:id", (req, res) => {
    const name = (req.body?.name || "").trim();
    const url = (req.body?.url || "").trim();
    const category_id = Number(req.body?.category_id);

    if (!name || !url || !category_id) {
        return res.status(400).json({ error: "name, url, category_id are required" });
    }

    db.prepare("UPDATE links SET category_id=?, name=?, url=? WHERE id=?")
        .run(category_id, name, url, req.params.id);

    res.json({ ok: true });
});

app.delete("/api/links/:id", (req, res) => {
    db.prepare("DELETE FROM links WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
});

const PORT = 8787;
app.listen(PORT, () => console.log(`Server running: http://localhost:${PORT}`));