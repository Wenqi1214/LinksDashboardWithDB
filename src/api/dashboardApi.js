import axios from "axios";
import { useLocalData } from "../lib/runtime";
import {
  localCreateCategory,
  localCreateLink,
  localCreatePanel,
  localDeleteCategory,
  localDeleteLink,
  localDeletePanel,
  localGetCategories,
  localGetCategorySnapshot,
  localGetLinks,
  localGetPanels,
  localReorderCategories,
  localReorderLinks,
  localRestoreCategory,
  localUpdateLink,
} from "../lib/localDataApi";

const api = axios.create({ baseURL: "/api" });

export async function getPanels() {
  if (useLocalData) return localGetPanels();
  const res = await api.get("/panels");
  return res.data;
}

export async function createPanel(name) {
  if (useLocalData) return localCreatePanel(name);
  const res = await api.post("/panels", { name });
  return res.data;
}

export async function deletePanel(panelId) {
  if (useLocalData) return localDeletePanel(panelId);
  const res = await api.delete(`/panels/${panelId}`);
  return res.data;
}

export async function getCategories(panelId) {
  if (useLocalData) return localGetCategories(panelId);
  const res = await api.get("/categories", { params: { panel_id: panelId } });
  return res.data;
}

export async function createCategory(payload) {
  if (useLocalData) return localCreateCategory(payload);
  const res = await api.post("/categories", payload);
  return res.data;
}

export async function deleteCategory(categoryId) {
  if (useLocalData) return localDeleteCategory(categoryId);
  const res = await api.delete(`/categories/${categoryId}`);
  return res.data;
}

export async function getCategorySnapshot(categoryId) {
  if (useLocalData) return localGetCategorySnapshot(categoryId);
  const res = await api.get(`/categories/${categoryId}/snapshot`);
  return res.data;
}

export async function restoreCategory(snapshot) {
  if (useLocalData) return localRestoreCategory(snapshot);
  const res = await api.post("/categories/restore", snapshot);
  return res.data;
}

export async function reorderCategories(orderedIds) {
  if (useLocalData) return localReorderCategories(orderedIds);
  const res = await api.put("/categories/reorder", { orderedIds });
  return res.data;
}

export async function getLinks(panelId) {
  if (useLocalData) return localGetLinks(panelId);
  const res = await api.get("/links", { params: { panel_id: panelId } });
  return res.data;
}

export async function createLink(payload) {
  if (useLocalData) return localCreateLink(payload);
  const res = await api.post("/links", payload);
  return res.data;
}

export async function updateLink(id, payload) {
  if (useLocalData) return localUpdateLink(id, payload);
  const res = await api.put(`/links/${id}`, payload);
  return res.data;
}

export async function deleteLink(id) {
  if (useLocalData) return localDeleteLink(id);
  const res = await api.delete(`/links/${id}`);
  return res.data;
}

export async function reorderLinks(items) {
  if (useLocalData) return localReorderLinks(items);
  const res = await api.put("/links/reorder", { items });
  return res.data;
}
