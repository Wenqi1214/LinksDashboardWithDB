import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import {
  createCategory,
  createLink,
  createPanel,
  deleteCategory,
  deleteLink,
  deletePanel,
  getCategories,
  getCategorySnapshot,
  getLinks,
  getPanels,
  reorderCategories,
  reorderLinks,
  restoreCategory,
  updateLink,
} from "./api/dashboardApi";
import {
  addHour,
  createTimeTask,
  deleteTimeTask,
  getTaskChart,
  getTimeExport,
  getTimeSeries,
  getTimeTasks,
  removeHour,
} from "./api/timeApi";
import {
  clearTodoLane,
  createTodoItem,
  deleteTodoItem,
  getTodoItems,
  toggleTodoItem,
  updateTodoItem,
} from "./api/todoApi";
import { getDailyVerse } from "./api/verseApi";
import DashboardBoard from "./components/DashboardBoard";
import PanelTabs from "./components/PanelTabs";
import TimeTracker from "./components/TimeTracker";
import TodoBoard from "./components/TodoBoard";
import { usePanelShortcuts } from "./hooks/usePanelShortcuts";
import { useThemeMode } from "./hooks/useThemeMode";

function makeBlankForm() {
  return { id: null, name: "", url: "", category_id: "", description: "" };
}

function getGreeting(hour) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const palettes = [
  { id: "paper", label: "Paper" },
  { id: "solar", label: "Solar" },
  { id: "rose", label: "Rose" },
  { id: "coast", label: "Coast" },
];

export default function App() {
  const [panels, setPanels] = useState([]);
  const [activeTab, setActiveTab] = useState("focus");
  const [categories, setCategories] = useState([]);
  const [links, setLinks] = useState([]);

  const [newCategory, setNewCategory] = useState("");
  const [newPanelName, setNewPanelName] = useState("");
  const [form, setForm] = useState(makeBlankForm);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [panelModalOpen, setPanelModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  const [timeTasks, setTimeTasks] = useState([]);
  const [taskCharts, setTaskCharts] = useState({});
  const [seriesView, setSeriesView] = useState("week");
  const [timeSeries, setTimeSeries] = useState({ view: "week", buckets: [], tasks: [] });
  const [todoItems, setTodoItems] = useState([]);
  const [verse, setVerse] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const [confirmState, setConfirmState] = useState(null);
  const [undoState, setUndoState] = useState(null);
  const undoTimerRef = useRef(null);
  const verseRef = useRef(null);

  const { themeMode, setThemeMode, themePalette, setThemePalette } = useThemeMode();

  const activePanelId = activeTab.startsWith("panel:")
    ? Number(activeTab.replace("panel:", ""))
    : null;

  const setUndo = useCallback((nextUndo) => {
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    setUndoState(nextUndo);
    undoTimerRef.current = window.setTimeout(() => setUndoState(null), 8000);
  }, []);

  useEffect(
    () => () => {
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    },
    []
  );

  const loadTracker = useCallback(async () => {
    const tasks = await getTimeTasks();
    const charts = await Promise.all(
      tasks.map(async (task) => {
        const chart = await getTaskChart(task.id, 40);
        return [task.id, chart.points || []];
      })
    );
    setTimeTasks(tasks);
    setTaskCharts(Object.fromEntries(charts));
  }, []);

  const loadTimeSeries = useCallback(async (view) => {
    const data = await getTimeSeries(view);
    setTimeSeries(data);
  }, []);

  const loadTodo = useCallback(async () => {
    const items = await getTodoItems();
    setTodoItems(items);
  }, []);

  const loadVerse = useCallback(async () => {
    const currentRef = verseRef.current?.ref;
    let selected = await getDailyVerse();
    if (currentRef && selected.ref === currentRef) {
      const second = await getDailyVerse();
      if (second.ref !== currentRef) selected = second;
    }
    verseRef.current = selected;
    setVerse(selected);
  }, []);

  const loadDashboard = useCallback(async (panelId) => {
    const [cats, lks] = await Promise.all([getCategories(panelId), getLinks(panelId)]);
    setCategories(cats);
    setLinks(lks);
  }, []);

  const loadPanels = useCallback(async () => {
    const allPanels = await getPanels();
    setPanels(allPanels);

    const savedPanelId = Number(localStorage.getItem("active-panel-id"));
    const firstPanelId = allPanels[0]?.id ?? null;
    const initialPanelId = allPanels.some((p) => p.id === savedPanelId)
      ? savedPanelId
      : firstPanelId;

    if (initialPanelId) setActiveTab(`panel:${initialPanelId}`);
    else setActiveTab("focus");
  }, []);

  useEffect(() => {
    loadPanels();
    loadTracker();
    loadTodo();
    loadVerse();
  }, [loadPanels, loadTracker, loadTodo, loadVerse]);

  useEffect(() => {
    loadTimeSeries(seriesView);
  }, [loadTimeSeries, seriesView]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!activePanelId) return;
    localStorage.setItem("active-panel-id", String(activePanelId));
    loadDashboard(activePanelId);
    setForm(makeBlankForm());
  }, [activePanelId, loadDashboard]);

  usePanelShortcuts({
    enabled: true,
    panels,
    onPick: (panelId) => setActiveTab(`panel:${panelId}`),
  });

  const grouped = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        links: links
          .filter((link) => link.category_id === category.id)
          .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
      })),
    [categories, links]
  );

  async function handleCreatePanel(name) {
    await createPanel(name);
    const allPanels = await getPanels();
    setPanels(allPanels);
    const latest = allPanels[allPanels.length - 1];
    if (latest) setActiveTab(`panel:${latest.id}`);
  }

  async function submitPanelModal() {
    const name = newPanelName.trim();
    if (!name) return;
    await handleCreatePanel(name);
    setNewPanelName("");
    setPanelModalOpen(false);
  }

  async function handleDeleteCurrentPanel(panelId) {
    setConfirmState({
      title: "Delete panel?",
      message: "Categories and links in this panel will be removed.",
      onConfirm: async () => {
        await deletePanel(panelId);
        await loadPanels();
      },
    });
  }

  async function handleAddCategory(nameInput) {
    const panelId = activePanelId;
    if (!panelId) return;
    const name = nameInput.trim();
    if (!name) return;

    await createCategory({ panel_id: panelId, name });
    setNewCategory("");
    await loadDashboard(panelId);
  }

  async function handleDeleteCategory(categoryId) {
    if (!activePanelId) return;
    setConfirmState({
      title: "Delete category?",
      message: "All links in this category will also be deleted.",
      onConfirm: async () => {
        const snapshot = await getCategorySnapshot(categoryId);
        await deleteCategory(categoryId);
        await loadDashboard(activePanelId);
        setUndo({
          message: `Deleted category: ${snapshot.category.name}`,
          onUndo: async () => {
            await restoreCategory(snapshot);
            await loadDashboard(activePanelId);
          },
        });
      },
    });
  }

  async function handleSubmitLink() {
    const payload = {
      name: form.name.trim(),
      url: form.url.trim(),
      description: form.description.trim(),
      category_id: Number(form.category_id),
    };
    if (!payload.name || !payload.url || !payload.category_id) return;

    if (form.id == null) await createLink(payload);
    else await updateLink(form.id, payload);

    setLinkModalOpen(false);
    setForm(makeBlankForm());
    if (activePanelId) await loadDashboard(activePanelId);
  }

  async function handleDeleteLink(linkId) {
    if (!activePanelId) return;
    const snapshot = links.find((link) => link.id === linkId);
    if (!snapshot) return;

    setConfirmState({
      title: "Delete link?",
      message: `Remove "${snapshot.name}" from this category?`,
      onConfirm: async () => {
        await deleteLink(linkId);
        await loadDashboard(activePanelId);
        setUndo({
          message: `Deleted link: ${snapshot.name}`,
          onUndo: async () => {
            await createLink({
              name: snapshot.name,
              url: snapshot.url,
              description: snapshot.description || "",
              category_id: snapshot.category_id,
              sort_order: snapshot.sort_order,
            });
            await loadDashboard(activePanelId);
          },
        });
      },
    });
  }

  function handleStartEdit(link) {
    setForm({
      id: link.id,
      name: link.name,
      url: link.url,
      category_id: String(link.category_id),
      description: link.description || "",
    });
    setLinkModalOpen(true);
  }

  async function handleCategoryReorder(orderedIds) {
    if (!activePanelId) return;
    await reorderCategories(orderedIds);
    await loadDashboard(activePanelId);
  }

  async function handleLinksReorder(items) {
    if (!activePanelId) return;
    await reorderLinks(items);
    await loadDashboard(activePanelId);
  }

  async function exportFocusExcel() {
    const data = await getTimeExport();
    const rows = [];
    rows.push(["Section", "Task", "Period", "Hours", "Target", "Total"]);

    data.tasks.forEach((task) => {
      rows.push(["SUMMARY", task.task_name, "", "", task.target_hours, task.total_hours]);
      task.by_day.forEach((row) => rows.push(["DAY", task.task_name, row.period, row.hours, "", ""]));
      task.by_week.forEach((row) => rows.push(["WEEK", task.task_name, row.period, row.hours, "", ""]));
      task.by_month.forEach((row) =>
        rows.push(["MONTH", task.task_name, row.period, row.hours, "", ""])
      );
    });

    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `focus-detailed-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportFocusPdf() {
    const data = await getTimeExport();
    const summaryRows = data.tasks
      .map(
        (task) => `
          <tr>
            <td>${task.task_name}</td>
            <td>${task.target_hours}</td>
            <td>${task.total_hours}</td>
            <td>${task.by_day.length}</td>
          </tr>
        `
      )
      .join("");

    const detailRows = data.tasks
      .flatMap((task) => [
        ...task.by_month.map(
          (r) => `
            <tr><td>${task.task_name}</td><td>MONTH</td><td>${r.period}</td><td>${r.hours}</td></tr>
          `
        ),
        ...task.by_week.map(
          (r) => `
            <tr><td>${task.task_name}</td><td>WEEK</td><td>${r.period}</td><td>${r.hours}</td></tr>
          `
        ),
        ...task.by_day.map(
          (r) => `
            <tr><td>${task.task_name}</td><td>DAY</td><td>${r.period}</td><td>${r.hours}</td></tr>
          `
        ),
      ])
      .join("");

    const win = window.open("", "_blank", "width=1080,height=800");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Focus Detailed Export</title>
          <style>
            body { font-family: monospace; padding: 18px; }
            h1, h2 { font-size: 14px; margin: 0 0 10px; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
            th, td { border: 1px solid #999; padding: 6px 8px; font-size: 11px; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Focus Detailed Export (${new Date().toLocaleDateString()})</h1>
          <h2>Summary</h2>
          <table>
            <thead><tr><th>Task</th><th>Target</th><th>Total</th><th>Days Logged</th></tr></thead>
            <tbody>${summaryRows}</tbody>
          </table>
          <h2>Detail (Month / Week / Day)</h2>
          <table>
            <thead><tr><th>Task</th><th>Granularity</th><th>Period</th><th>Hours</th></tr></thead>
            <tbody>${detailRows}</tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  const clockText = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateText = now.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="page">
      <header className="topbar">
        <div className="headerLeft">
          <h1 className="title">LINKDASH COMMAND CENTER</h1>
          <p className="muted">
            {getGreeting(now.getHours())}. {dateText} {clockText}
          </p>
          <PanelTabs
            panels={panels}
            activeTab={activeTab}
            onSelectPanel={(id) => setActiveTab(`panel:${id}`)}
            onSelectFocus={() => setActiveTab("focus")}
            onSelectTodo={() => setActiveTab("todo")}
          />
        </div>

        {verse && (
          <div className="verseCard">
            <span className="verseDot" onClick={() => loadVerse()} title="Next verse" />
            <p className="verseZh">"{verse.zh}"</p>
            <p className="verseEn">"{verse.en}"</p>
            <p className="verseRef">
              {verse.zh_ref} / {verse.ref}
            </p>
          </div>
        )}
      </header>

      <section className="quickActions">
        {activePanelId && (
          <>
            <button
              className="ghostBtn"
              onClick={() => {
                setForm(makeBlankForm());
                setLinkModalOpen(true);
              }}
            >
              + Link
            </button>
            <button className="ghostBtn" onClick={() => setCategoryModalOpen(true)}>
              + Category
            </button>
          </>
        )}
        <button className="ghostBtn" onClick={() => setPanelModalOpen(true)}>
          + Panel
        </button>
        {activePanelId && panels.length > 1 && (
          <button
            className="iconBtn danger"
            title="Delete current panel"
            onClick={() => handleDeleteCurrentPanel(activePanelId)}
          >
            x
          </button>
        )}
      </section>

      {activePanelId && (
        <DashboardBoard
          grouped={grouped}
          onDeleteCategory={handleDeleteCategory}
          onEditLink={handleStartEdit}
          onDeleteLink={handleDeleteLink}
          onCategoryReorder={handleCategoryReorder}
          onLinksReorder={handleLinksReorder}
        />
      )}

      {activeTab === "focus" && (
        <TimeTracker
          tasks={timeTasks}
          taskCharts={taskCharts}
          seriesView={seriesView}
          timeSeries={timeSeries}
          onChangeSeriesView={(view) => {
            setSeriesView(view);
          }}
          onAddTask={async (payload) => {
            await createTimeTask(payload);
            await loadTracker();
            await loadTimeSeries(seriesView);
          }}
          onDeleteTask={async (taskId) => {
            setConfirmState({
              title: "Delete task?",
              message: "Time logs under this task will be removed.",
              onConfirm: async () => {
                await deleteTimeTask(taskId);
                await loadTracker();
                await loadTimeSeries(seriesView);
              },
            });
          }}
          onAddHour={async (taskId, date) => {
            await addHour(taskId, date);
            await loadTracker();
            await loadTimeSeries(seriesView);
          }}
          onRemoveHour={async (taskId, date) => {
            try {
              await removeHour(taskId, date);
            } catch (_e) {
              // ignore when there is no log for today
            }
            await loadTracker();
            await loadTimeSeries(seriesView);
          }}
          onExportExcel={exportFocusExcel}
          onExportPdf={exportFocusPdf}
        />
      )}

      {activeTab === "todo" && (
        <TodoBoard
          items={todoItems}
          onCreate={async (payload) => {
            await createTodoItem(payload);
            await loadTodo();
          }}
          onUpdate={async (id, payload) => {
            await updateTodoItem(id, payload);
            await loadTodo();
          }}
          onToggle={async (id) => {
            await toggleTodoItem(id);
            await loadTodo();
          }}
          onDelete={(id) => {
            setConfirmState({
              title: "Delete to-do item?",
              message: "This item will be permanently removed.",
              onConfirm: async () => {
                await deleteTodoItem(id);
                await loadTodo();
              },
            });
          }}
          onClear={(lane) => {
            setConfirmState({
              title: `Clear ${lane === "today" ? "Today" : "Next Step"}?`,
              message: "This will remove all items in this column.",
              onConfirm: async () => {
                await clearTodoLane(lane);
                await loadTodo();
              },
            });
          }}
        />
      )}

      {confirmState && (
        <div className="overlay" onClick={() => setConfirmState(null)}>
          <section className="confirmCard card" onClick={(e) => e.stopPropagation()}>
            <h3>{confirmState.title}</h3>
            <p className="muted">{confirmState.message}</p>
            <div className="row">
              <button onClick={() => setConfirmState(null)}>Cancel</button>
              <button
                className="danger"
                onClick={async () => {
                  const handler = confirmState.onConfirm;
                  setConfirmState(null);
                  await handler();
                }}
              >
                Confirm
              </button>
            </div>
          </section>
        </div>
      )}

      {linkModalOpen && (
        <div className="overlay" onClick={() => setLinkModalOpen(false)}>
          <section className="confirmCard card" onClick={(e) => e.stopPropagation()}>
            <h3>{form.id == null ? "Add Link" : "Edit Link"}</h3>
            <div className="modalFields">
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
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <input
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="row">
              <button onClick={() => setLinkModalOpen(false)}>Cancel</button>
              <button className="primary" onClick={handleSubmitLink}>
                {form.id == null ? "Add" : "Save"}
              </button>
            </div>
          </section>
        </div>
      )}

      {panelModalOpen && (
        <div className="overlay" onClick={() => setPanelModalOpen(false)}>
          <section className="confirmCard card" onClick={(e) => e.stopPropagation()}>
            <h3>New Panel</h3>
            <div className="modalFields">
              <input
                placeholder="Panel name"
                value={newPanelName}
                onChange={(e) => setNewPanelName(e.target.value)}
              />
            </div>
            <div className="row">
              <button onClick={() => setPanelModalOpen(false)}>Cancel</button>
              <button className="primary" onClick={submitPanelModal}>
                Add
              </button>
            </div>
          </section>
        </div>
      )}

      {categoryModalOpen && (
        <div className="overlay" onClick={() => setCategoryModalOpen(false)}>
          <section className="confirmCard card" onClick={(e) => e.stopPropagation()}>
            <h3>New Category</h3>
            <div className="modalFields">
              <input
                placeholder="Category name"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
            </div>
            <div className="row">
              <button onClick={() => setCategoryModalOpen(false)}>Cancel</button>
              <button
                className="primary"
                onClick={async () => {
                  await handleAddCategory(newCategory);
                  setCategoryModalOpen(false);
                }}
              >
                Add
              </button>
            </div>
          </section>
        </div>
      )}

      {undoState && (
        <div className="undoToast card">
          <span>{undoState.message}</span>
          <button
            onClick={async () => {
              const handler = undoState.onUndo;
              setUndoState(null);
              await handler();
            }}
          >
            Undo
          </button>
        </div>
      )}

      <aside className="themeDock card floatingThemeDock">
        <div className="themeField">
          <label htmlFor="mode-select">Mode</label>
          <select
            id="mode-select"
            value={themeMode}
            onChange={(e) => setThemeMode(e.target.value)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </div>
        <div className="themeField">
          <label htmlFor="palette-select">Palette</label>
          <select
            id="palette-select"
            value={themePalette}
            onChange={(e) => setThemePalette(e.target.value)}
          >
            {palettes.map((palette) => (
              <option key={palette.id} value={palette.id}>
                {palette.label}
              </option>
            ))}
          </select>
        </div>
      </aside>
    </div>
  );
}
