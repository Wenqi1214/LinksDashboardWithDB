import axios from "axios";
import { useLocalData } from "../lib/runtime";

const api = axios.create({ baseURL: "/api" });

const VERSES = [
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
];

export async function getDailyVerse() {
  if (useLocalData) {
    const verse = VERSES[Math.floor(Math.random() * VERSES.length)];
    return { date: new Date().toISOString().slice(0, 10), ...verse };
  }
  const res = await api.get("/daily-verse", { params: { mode: "random" } });
  return res.data;
}
