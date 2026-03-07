import {
  dateOnly,
  groupSum,
  loadState,
  maxSort,
  mondayOf,
  monthStart,
  nextId,
  weekStart,
  withState,
} from "./localStore";

function ensureUrl(url) {
  const trimmed = String(url || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export async function localGetPanels() {
  const state = loadState();
  return state.panels.slice().sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

export async function localCreatePanel(name) {
  return withState((state) => {
    const trimmed = String(name || "").trim();
    if (!trimmed) throw new Error("name is required");
    const id = nextId(state, "panel");
    const sort_order = maxSort(state.panels, () => true);
    const panel = { id, name: trimmed, sort_order };
    state.panels.push(panel);
    return panel;
  });
}

export async function localDeletePanel(panelId) {
  withState((state) => {
    if (state.panels.length <= 1) throw new Error("At least one panel must remain");
    state.panels = state.panels.filter((p) => p.id !== Number(panelId));
    const removedCategoryIds = state.categories
      .filter((c) => c.panel_id === Number(panelId))
      .map((c) => c.id);
    state.categories = state.categories.filter((c) => c.panel_id !== Number(panelId));
    state.links = state.links.filter((l) => !removedCategoryIds.includes(l.category_id));
  });
  return { ok: true };
}

export async function localReorderPanels(orderedIds) {
  withState((state) => {
    orderedIds.forEach((id, index) => {
      const row = state.panels.find((p) => p.id === Number(id));
      if (row) row.sort_order = index;
    });
  });
  return { ok: true };
}

export async function localUpdatePanel(panelId, payload) {
  withState((state) => {
    const row = state.panels.find((p) => p.id === Number(panelId));
    if (!row) throw new Error("Panel not found");
    row.name = String(payload?.name || "").trim() || row.name;
  });
  return { ok: true };
}

export async function localGetCategories(panelId) {
  const state = loadState();
  return state.categories
    .filter((c) => c.panel_id === Number(panelId))
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

export async function localCreateCategory(payload) {
  const panelId = Number(payload.panel_id);
  const name = String(payload.name || "").trim();
  return withState((state) => {
    if (!panelId || !name) throw new Error("name and panel_id are required");
    const id = nextId(state, "category");
    const sort_order = maxSort(state.categories, (c) => c.panel_id === panelId);
    const row = { id, panel_id: panelId, name, sort_order };
    state.categories.push(row);
    return row;
  });
}

export async function localDeleteCategory(categoryId) {
  withState((state) => {
    state.categories = state.categories.filter((c) => c.id !== Number(categoryId));
    state.links = state.links.filter((l) => l.category_id !== Number(categoryId));
  });
  return { ok: true };
}

export async function localUpdateCategory(categoryId, payload) {
  withState((state) => {
    const row = state.categories.find((c) => c.id === Number(categoryId));
    if (!row) throw new Error("Category not found");
    row.name = String(payload?.name || "").trim() || row.name;
  });
  return { ok: true };
}

export async function localGetCategorySnapshot(categoryId) {
  const state = loadState();
  const category = state.categories.find((c) => c.id === Number(categoryId));
  if (!category) throw new Error("Category not found");
  const links = state.links
    .filter((l) => l.category_id === Number(categoryId))
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  return { category, links };
}

export async function localRestoreCategory(snapshot) {
  return withState((state) => {
    const id = nextId(state, "category");
    const restored = {
      id,
      panel_id: Number(snapshot.category.panel_id),
      name: String(snapshot.category.name || "Restored"),
      sort_order: Number(snapshot.category.sort_order) || 0,
    };
    state.categories.push(restored);

    (snapshot.links || []).forEach((link, index) => {
      const linkId = nextId(state, "link");
      state.links.push({
        id: linkId,
        name: String(link.name || ""),
        url: ensureUrl(link.url),
        description: String(link.description || ""),
        category_id: id,
        sort_order: Number(link.sort_order) >= 0 ? Number(link.sort_order) : index,
      });
    });
    return { ok: true, category_id: id };
  });
}

export async function localReorderCategories(orderedIds) {
  withState((state) => {
    orderedIds.forEach((id, index) => {
      const row = state.categories.find((c) => c.id === Number(id));
      if (row) row.sort_order = index;
    });
  });
  return { ok: true };
}

export async function localGetLinks(panelId) {
  const state = loadState();
  const categories = state.categories.filter((c) => c.panel_id === Number(panelId));
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  return state.links
    .filter((l) => categoryMap.has(l.category_id))
    .map((l) => ({ ...l, category_name: categoryMap.get(l.category_id).name }))
    .sort((a, b) => {
      const ca = categoryMap.get(a.category_id);
      const cb = categoryMap.get(b.category_id);
      return (
        (ca?.sort_order || 0) - (cb?.sort_order || 0) ||
        a.sort_order - b.sort_order ||
        a.id - b.id
      );
    });
}

export async function localCreateLink(payload) {
  return withState((state) => {
    const id = nextId(state, "link");
    const category_id = Number(payload.category_id);
    const sort_order =
      Number.isInteger(Number(payload.sort_order)) && Number(payload.sort_order) >= 0
        ? Number(payload.sort_order)
        : maxSort(state.links, (l) => l.category_id === category_id);
    const row = {
      id,
      category_id,
      name: String(payload.name || "").trim(),
      url: ensureUrl(payload.url),
      description: String(payload.description || "").trim(),
      sort_order,
    };
    state.links.push(row);
    return row;
  });
}

export async function localUpdateLink(id, payload) {
  withState((state) => {
    const row = state.links.find((l) => l.id === Number(id));
    if (!row) return;
    row.name = String(payload.name || "").trim();
    row.url = ensureUrl(payload.url);
    row.description = String(payload.description || "").trim();
    row.category_id = Number(payload.category_id);
  });
  return { ok: true };
}

export async function localDeleteLink(id) {
  withState((state) => {
    state.links = state.links.filter((l) => l.id !== Number(id));
  });
  return { ok: true };
}

export async function localReorderLinks(items) {
  withState((state) => {
    items.forEach((item) => {
      const row = state.links.find((l) => l.id === Number(item.id));
      if (!row) return;
      row.category_id = Number(item.category_id);
      row.sort_order = Number(item.sort_order);
    });
  });
  return { ok: true };
}

export async function localGetTimeTasks() {
  const state = loadState();
  const week = weekStart();
  const month = monthStart();
  const today = dateOnly();
  return state.time_tasks
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    .map((task) => {
      const logs = state.time_logs.filter((l) => l.task_id === task.id);
      return {
        ...task,
        total_hours: logs.reduce((s, l) => s + Number(l.hours || 0), 0),
        week_hours: logs
          .filter((l) => l.log_date >= week)
          .reduce((s, l) => s + Number(l.hours || 0), 0),
        month_hours: logs
          .filter((l) => l.log_date >= month)
          .reduce((s, l) => s + Number(l.hours || 0), 0),
        today_hours: logs
          .filter((l) => l.log_date === today)
          .reduce((s, l) => s + Number(l.hours || 0), 0),
      };
    });
}

export async function localCreateTimeTask(payload) {
  return withState((state) => {
    const id = nextId(state, "time_task");
    const row = {
      id,
      name: String(payload.name || "").trim(),
      target_hours: Math.max(1, Number(payload.target_hours) || 100),
      sort_order: maxSort(state.time_tasks, () => true),
      created_at: new Date().toISOString(),
    };
    state.time_tasks.push(row);
    return row;
  });
}

export async function localDeleteTimeTask(id) {
  withState((state) => {
    state.time_tasks = state.time_tasks.filter((t) => t.id !== Number(id));
    state.time_logs = state.time_logs.filter((l) => l.task_id !== Number(id));
  });
  return { ok: true };
}

export async function localAddHour(taskId, logDate) {
  withState((state) => {
    state.time_logs.push({
      id: nextId(state, "time_log"),
      task_id: Number(taskId),
      log_date: dateOnly(logDate),
      hours: 1,
      created_at: new Date().toISOString(),
    });
  });
  return { ok: true };
}

export async function localRemoveHour(taskId, logDate) {
  withState((state) => {
    const date = dateOnly(logDate);
    const idx = [...state.time_logs]
      .map((l, i) => ({ l, i }))
      .filter((x) => x.l.task_id === Number(taskId) && x.l.log_date === date)
      .sort((a, b) => (a.l.created_at < b.l.created_at ? 1 : -1))[0]?.i;
    if (idx == null) return;
    state.time_logs.splice(idx, 1);
  });
  return { ok: true };
}

function buildPoints(logs, days) {
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  const map = groupSum(logs, (l) => l.log_date, (l) => l.hours);
  const points = [];
  const cursor = new Date(start);
  for (let i = 0; i < days; i += 1) {
    const key = dateOnly(cursor);
    points.push({ date: key, hours: map.get(key) || 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return points;
}

export async function localGetTaskChart(taskId, days = 40) {
  const state = loadState();
  const logs = state.time_logs.filter((l) => l.task_id === Number(taskId));
  return { points: buildPoints(logs, Math.min(90, Math.max(1, Number(days) || 40))) };
}

export async function localGetTimeSeries(view = "week") {
  const state = loadState();
  const tasks = state.time_tasks
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    .map((t) => ({ id: t.id, name: t.name }));

  if (tasks.length === 0) return { view, buckets: [], tasks: [] };

  let buckets = [];
  if (view === "year") {
    const year = new Date().getFullYear();
    buckets = Array.from({ length: 12 }, (_, m) => ({
      key: `${year}-${String(m + 1).padStart(2, "0")}`,
      label: String(m + 1),
    }));
  } else {
    const days = view === "month" ? 30 : 7;
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    const cursor = new Date(start);
    buckets = Array.from({ length: days }, () => {
      const key = dateOnly(cursor);
      const obj = { key, label: key.slice(5) };
      cursor.setDate(cursor.getDate() + 1);
      return obj;
    });
  }

  const taskSeries = tasks.map((task) => {
    const logs = state.time_logs.filter((l) => l.task_id === task.id);
    const grouped = groupSum(
      logs,
      (l) => (view === "year" ? l.log_date.slice(0, 7) : l.log_date),
      (l) => l.hours
    );
    return { id: task.id, name: task.name, values: buckets.map((b) => grouped.get(b.key) || 0) };
  });

  return { view, buckets, tasks: taskSeries };
}

export async function localGetTimeExport() {
  const state = loadState();
  const tasks = await localGetTimeTasks();
  return {
    generated_at: new Date().toISOString(),
    tasks: tasks.map((task) => {
      const logs = state.time_logs.filter((l) => l.task_id === task.id);
      const byDayMap = groupSum(logs, (l) => l.log_date, (l) => l.hours);
      const byWeekMap = groupSum(logs, (l) => mondayOf(l.log_date), (l) => l.hours);
      const byMonthMap = groupSum(logs, (l) => l.log_date.slice(0, 7), (l) => l.hours);
      const toArr = (map) =>
        [...map.entries()]
          .sort((a, b) => (a[0] < b[0] ? -1 : 1))
          .map(([period, hours]) => ({ period, hours }));

      return {
        task_id: task.id,
        task_name: task.name,
        target_hours: task.target_hours,
        total_hours: task.total_hours,
        by_day: toArr(byDayMap),
        by_week: toArr(byWeekMap),
        by_month: toArr(byMonthMap),
      };
    }),
  };
}

export async function localGetTodoItems() {
  const state = loadState();
  return state.todo_items
    .slice()
    .sort((a, b) => a.lane.localeCompare(b.lane) || a.done - b.done || a.sort_order - b.sort_order || a.id - b.id);
}

export async function localCreateTodoItem(payload) {
  return withState((state) => {
    const lane = payload.lane === "next" ? "next" : "today";
    const row = {
      id: nextId(state, "todo_item"),
      title: String(payload.title || "").trim() || "Untitled",
      lane,
      done: 0,
      sort_order: maxSort(state.todo_items, (i) => i.lane === lane && Number(i.done) === 0),
      created_at: new Date().toISOString(),
      done_at: null,
    };
    state.todo_items.push(row);
    return row;
  });
}

export async function localUpdateTodoItem(id, payload) {
  withState((state) => {
    const row = state.todo_items.find((i) => i.id === Number(id));
    if (!row) return;
    row.title = String(payload.title || "").trim() || "Untitled";
    if (payload.lane === "today" || payload.lane === "next") row.lane = payload.lane;
  });
  return { ok: true };
}

export async function localToggleTodoItem(id) {
  withState((state) => {
    const row = state.todo_items.find((i) => i.id === Number(id));
    if (!row) return;
    const done = Number(row.done) ? 0 : 1;
    row.done = done;
    row.done_at = done ? new Date().toISOString() : null;
    row.sort_order = maxSort(state.todo_items, (i) => i.lane === row.lane && Number(i.done) === done);
  });
  return { ok: true };
}

export async function localDeleteTodoItem(id) {
  withState((state) => {
    state.todo_items = state.todo_items.filter((i) => i.id !== Number(id));
  });
  return { ok: true };
}

export async function localClearTodoLane(lane) {
  withState((state) => {
    state.todo_items = state.todo_items.filter((i) => i.lane !== lane);
  });
  return { ok: true };
}
