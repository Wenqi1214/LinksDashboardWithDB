import axios from "axios";
import { useLocalData } from "../lib/runtime";
import {
  localClearTodoLane,
  localCreateTodoItem,
  localDeleteTodoItem,
  localGetTodoItems,
  localToggleTodoItem,
  localUpdateTodoItem,
} from "../lib/localDataApi";

const api = axios.create({ baseURL: "/api" });

export async function getTodoItems() {
  if (useLocalData) return localGetTodoItems();
  const res = await api.get("/todo/items");
  return res.data;
}

export async function createTodoItem(payload) {
  if (useLocalData) return localCreateTodoItem(payload);
  const res = await api.post("/todo/items", payload);
  return res.data;
}

export async function updateTodoItem(id, payload) {
  if (useLocalData) return localUpdateTodoItem(id, payload);
  const res = await api.put(`/todo/items/${id}`, payload);
  return res.data;
}

export async function toggleTodoItem(id) {
  if (useLocalData) return localToggleTodoItem(id);
  const res = await api.put(`/todo/items/${id}/toggle`);
  return res.data;
}

export async function deleteTodoItem(id) {
  if (useLocalData) return localDeleteTodoItem(id);
  const res = await api.delete(`/todo/items/${id}`);
  return res.data;
}

export async function clearTodoLane(lane) {
  if (useLocalData) return localClearTodoLane(lane);
  const res = await api.delete("/todo/clear", { params: { lane } });
  return res.data;
}
