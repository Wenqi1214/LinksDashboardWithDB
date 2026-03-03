import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

export default function App() {
    const [categories, setCategories] = useState([]);
    const [links, setLinks] = useState([]);

    const [newCat, setNewCat] = useState("");
    const [form, setForm] = useState({ id: null, name: "", url: "", category_id: "" });
    const [themeMode, setThemeMode] = useState(
        () => localStorage.getItem("theme-mode") || "system"
    );

    useEffect(() => {
        localStorage.setItem("theme-mode", themeMode);

        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const resolved = themeMode === "system" ? (prefersDark ? "dark" : "light") : themeMode;

        document.documentElement.dataset.theme = resolved;
        document.documentElement.dataset.themeMode = themeMode;
    }, [themeMode]);

    async function load() {
        const [cRes, lRes] = await Promise.all([
            axios.get("/api/categories"),
            axios.get("/api/links"),
        ]);
        setCategories(cRes.data);
        setLinks(lRes.data);
    }

    useEffect(() => {
        load();
    }, []);

    async function addCategory() {
        try {
            await axios.post("/api/categories", { name: newCat });
            setNewCat("");
            await load();
        } catch (err) {
            console.error("addCategory failed:", err);
            alert("addCategory failed — check console + Network tab");
        }
    }

    async function deleteCategory(id) {
        await axios.delete(`/api/categories/${id}`);
        await load();
    }

    async function submitLink() {
        const payload = {
            name: form.name,
            url: form.url,
            category_id: Number(form.category_id),
        };

        if (!payload.name || !payload.url || !payload.category_id) return;

        if (form.id == null) {
            await axios.post("/api/links", payload);
        } else {
            await axios.put(`/api/links/${form.id}`, payload);
        }

        setForm({ id: null, name: "", url: "", category_id: "" });
        await load();
    }

    async function deleteLink(id) {
        await axios.delete(`/api/links/${id}`);
        await load();
    }

    function startEdit(link) {
        setForm({
            id: link.id,
            name: link.name,
            url: link.url,
            category_id: String(link.category_id),
        });
    }

    const grouped = categories.map((c) => ({
        ...c,
        links: links.filter((l) => l.category_id === c.id),
    }));

    return (
        <div className="page">
            <div className="topbar">
                <h1 className="title">LinkDash</h1>

                <div className="row">
                    <button onClick={() => setThemeMode("light")}>Light</button>
                    <button onClick={() => setThemeMode("dark")}>Dark</button>
                    <button onClick={() => setThemeMode("system")}>System</button>
                </div>
            </div>

            {/* Add/Delete Categories */}
            <section className="card">
                <h2>Categories</h2>
                <div className="row">
                    <input
                        placeholder="New category name"
                        value={newCat}
                        onChange={(e) => setNewCat(e.target.value)}
                    />
                    <button onClick={addCategory}>Add</button>
                </div>

                <div className="chips">
                    {categories.map((c) => (
                        <div key={c.id} className="chip">
                            <span>{c.name}</span>
                            <button className="danger" onClick={() => deleteCategory(c.id)}>
                                Delete
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* Add/Edit Link */}
            <section className="card">
                <h2>{form.id == null ? "Add Link" : "Edit Link"}</h2>
                <div className="row">
                    <input
                        placeholder="Name"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                    <input
                        placeholder="URL (https://...)"
                        value={form.url}
                        onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                    />
                    <select
                        value={form.category_id}
                        onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                    >
                        <option value="">Choose category</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <button onClick={submitLink}>{form.id == null ? "Add" : "Save"}</button>
                    {form.id != null && (
                        <button onClick={() => setForm({ id: null, name: "", url: "", category_id: "" })}>
                            Cancel
                        </button>
                    )}
                </div>
            </section>

            {/* Display grouped links */}
            <main className="grid">
                {grouped.map((c) => (
                    <section key={c.id} className="card">
                        <h3>{c.name}</h3>
                        {c.links.length === 0 ? (
                            <div className="muted">No links yet.</div>
                        ) : (
                            c.links.map((l) => (
                                <div key={l.id} className="linkRow">
                                    <a href={l.url} target="_blank" rel="noreferrer">{l.name}</a>
                                    <div className="actions">
                                        <button onClick={() => startEdit(l)}>Edit</button>
                                        <button className="danger" onClick={() => deleteLink(l.id)}>Delete</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </section>
                ))}
            </main>
        </div>
    );
}