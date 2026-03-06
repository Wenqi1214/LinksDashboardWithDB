import axios from "axios";
import { useLocalData } from "../lib/runtime";
import {
  localAddHour,
  localCreateTimeTask,
  localDeleteTimeTask,
  localGetTaskChart,
  localGetTimeExport,
  localGetTimeSeries,
  localGetTimeTasks,
  localRemoveHour,
} from "../lib/localDataApi";

const api = axios.create({ baseURL: "/api" });

export async function getTimeTasks() {
  if (useLocalData) return localGetTimeTasks();
  const res = await api.get("/time/tasks");
  return res.data;
}

export async function getTimeSeries(view = "week") {
  if (useLocalData) return localGetTimeSeries(view);
  const res = await api.get("/time/series", { params: { view } });
  return res.data;
}

export async function getTaskChart(taskId, days = 40) {
  if (useLocalData) return localGetTaskChart(taskId, days);
  const res = await api.get(`/time/tasks/${taskId}/chart`, { params: { days } });
  return res.data;
}

export async function getTimeExport() {
  if (useLocalData) return localGetTimeExport();
  const res = await api.get("/time/export");
  return res.data;
}

export async function createTimeTask(payload) {
  if (useLocalData) return localCreateTimeTask(payload);
  const res = await api.post("/time/tasks", payload);
  return res.data;
}

export async function deleteTimeTask(taskId) {
  if (useLocalData) return localDeleteTimeTask(taskId);
  const res = await api.delete(`/time/tasks/${taskId}`);
  return res.data;
}

export async function addHour(taskId, logDate) {
  if (useLocalData) return localAddHour(taskId, logDate);
  const res = await api.post(`/time/tasks/${taskId}/log`, { log_date: logDate, hours: 1 });
  return res.data;
}

export async function removeHour(taskId, logDate) {
  if (useLocalData) return localRemoveHour(taskId, logDate);
  const res = await api.delete(`/time/tasks/${taskId}/log`, { data: { log_date: logDate } });
  return res.data;
}
