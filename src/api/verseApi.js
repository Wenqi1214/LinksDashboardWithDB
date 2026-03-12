import axios from "axios";
import verses from "../../server/data/verses.json";
import { useLocalData } from "../lib/runtime";

const api = axios.create({ baseURL: "/api" });

function dateOnly(input = new Date()) {
  const d = input instanceof Date ? input : new Date(input);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getRandomVerse() {
  if (!Array.isArray(verses) || verses.length === 0) {
    throw new Error("Verse data is missing or empty");
  }

  return verses[Math.floor(Math.random() * verses.length)];
}

export async function getDailyVerse() {
  if (useLocalData) {
    return { date: dateOnly(), ...getRandomVerse() };
  }

  const res = await api.get("/daily-verse");
  return res.data;
}
