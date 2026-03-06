const KEY = "linkdash-local-db-v1";

function isoNow() {
  return new Date().toISOString();
}

function defaultState() {
  return {
    counters: {
      panel: 2,
      category: 0,
      link: 0,
      time_task: 0,
      time_log: 0,
      todo_item: 0,
    },
    panels: [
      { id: 1, name: "Work", sort_order: 0 },
      { id: 2, name: "Personal", sort_order: 1 },
    ],
    categories: [],
    links: [],
    time_tasks: [],
    time_logs: [],
    todo_items: [],
    meta: { updated_at: isoNow() },
  };
}

export function loadState() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return defaultState();
  try {
    const parsed = JSON.parse(raw);
    return {
      ...defaultState(),
      ...parsed,
      counters: { ...defaultState().counters, ...(parsed.counters || {}) },
      meta: { ...(parsed.meta || {}), updated_at: parsed.meta?.updated_at || isoNow() },
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state) {
  state.meta = { ...(state.meta || {}), updated_at: isoNow() };
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function withState(mutator) {
  const state = loadState();
  const result = mutator(state);
  saveState(state);
  return result;
}

export function nextId(state, counterKey) {
  state.counters[counterKey] = (state.counters[counterKey] || 0) + 1;
  return state.counters[counterKey];
}

export function maxSort(items, predicate) {
  let max = -1;
  items.forEach((item) => {
    if (predicate(item)) max = Math.max(max, Number(item.sort_order) || 0);
  });
  return max + 1;
}

export function dateOnly(input = new Date()) {
  const date = input instanceof Date ? input : new Date(input);
  return date.toISOString().slice(0, 10);
}

export function weekStart(date = new Date()) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return dateOnly(d);
}

export function monthStart(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return dateOnly(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function groupSum(rows, keyFn, valueFn) {
  const map = new Map();
  rows.forEach((row) => {
    const key = keyFn(row);
    map.set(key, (map.get(key) || 0) + Number(valueFn(row) || 0));
  });
  return map;
}

export function mondayOf(dateString) {
  const d = new Date(`${dateString}T00:00:00`);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return dateOnly(d);
}
