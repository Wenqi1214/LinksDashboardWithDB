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
  {
    ref: "Psalm 27:1",
    zh_ref: "诗 27:1",
    zh: "耶和华是我的亮光，是我的拯救，我还怕谁呢？",
    en: "The Lord is my light and my salvation; whom shall I fear?",
  },
  {
    ref: "Psalm 46:1",
    zh_ref: "诗 46:1",
    zh: "神是我们的避难所，是我们的力量，是我们在患难中随时的帮助。",
    en: "God is our refuge and strength, a very present help in trouble.",
  },
  {
    ref: "Psalm 121:1-2",
    zh_ref: "诗 121:1-2",
    zh: "我要向山举目，我的帮助从何而来？我的帮助从造天地的耶和华而来。",
    en: "I lift up my eyes to the hills. From where does my help come? My help comes from the Lord, who made heaven and earth.",
  },
  {
    ref: "Psalm 119:105",
    zh_ref: "诗 119:105",
    zh: "你的话是我脚前的灯，是我路上的光。",
    en: "Your word is a lamp to my feet and a light to my path.",
  },
  {
    ref: "Proverbs 3:5-6",
    zh_ref: "箴 3:5-6",
    zh: "你要专心仰赖耶和华，不可倚靠自己的聪明；在你一切所行的事上都要认定他，他必指引你的路。",
    en: "Trust in the Lord with all your heart, and do not lean on your own understanding. In all your ways acknowledge him, and he will make straight your paths.",
  },
  {
    ref: "Isaiah 40:31",
    zh_ref: "赛 40:31",
    zh: "但那等候耶和华的必重新得力；他们必如鹰展翅上腾。",
    en: "But they who wait for the Lord shall renew their strength; they shall mount up with wings like eagles.",
  },
  {
    ref: "Isaiah 26:3",
    zh_ref: "赛 26:3",
    zh: "坚心倚赖你的，你必保守他十分平安。",
    en: "You keep him in perfect peace whose mind is stayed on you, because he trusts in you.",
  },
  {
    ref: "Jeremiah 29:11",
    zh_ref: "耶 29:11",
    zh: "我知道我向你们所怀的意念，是赐平安的意念，不是降灾祸的意念。",
    en: "For I know the plans I have for you, declares the Lord, plans for welfare and not for evil.",
  },
  {
    ref: "Lamentations 3:22-23",
    zh_ref: "哀 3:22-23",
    zh: "我们不至消灭，是出于耶和华诸般的慈爱；每早晨这都是新的。",
    en: "The steadfast love of the Lord never ceases; his mercies never come to an end; they are new every morning.",
  },
  {
    ref: "Matthew 11:28",
    zh_ref: "太 11:28",
    zh: "凡劳苦担重担的人，可以到我这里来，我就使你们得安息。",
    en: "Come to me, all who labor and are heavy laden, and I will give you rest.",
  },
  {
    ref: "Matthew 6:33",
    zh_ref: "太 6:33",
    zh: "你们要先求他的国和他的义，这些东西都要加给你们了。",
    en: "Seek first the kingdom of God and his righteousness, and all these things will be added to you.",
  },
  {
    ref: "John 14:27",
    zh_ref: "约 14:27",
    zh: "我留下平安给你们，我将我的平安赐给你们。",
    en: "Peace I leave with you; my peace I give to you.",
  },
  {
    ref: "John 8:12",
    zh_ref: "约 8:12",
    zh: "我是世界的光。跟从我的，就不在黑暗里走，必要得着生命的光。",
    en: "I am the light of the world. Whoever follows me will not walk in darkness, but will have the light of life.",
  },
  {
    ref: "Romans 8:28",
    zh_ref: "罗 8:28",
    zh: "我们晓得万事都互相效力，叫爱神的人得益处。",
    en: "And we know that for those who love God all things work together for good.",
  },
  {
    ref: "Romans 15:13",
    zh_ref: "罗 15:13",
    zh: "但愿使人有盼望的神，因信将诸般的喜乐平安充满你们的心。",
    en: "May the God of hope fill you with all joy and peace in believing.",
  },
  {
    ref: "1 Corinthians 16:14",
    zh_ref: "林前 16:14",
    zh: "凡你们所做的都要凭爱心而做。",
    en: "Let all that you do be done in love.",
  },
  {
    ref: "2 Corinthians 12:9",
    zh_ref: "林后 12:9",
    zh: "我的恩典够你用的，因为我的能力是在人的软弱上显得完全。",
    en: "My grace is sufficient for you, for my power is made perfect in weakness.",
  },
  {
    ref: "Galatians 6:9",
    zh_ref: "加 6:9",
    zh: "我们行善，不可丧志；若不灰心，到了时候就要收成。",
    en: "Let us not grow weary of doing good, for in due season we will reap, if we do not give up.",
  },
  {
    ref: "Ephesians 3:20",
    zh_ref: "弗 3:20",
    zh: "神能照着运行在我们心里的大力，充充足足地成就一切，超过我们所求所想的。",
    en: "Now to him who is able to do far more abundantly than all that we ask or think.",
  },
  {
    ref: "Ephesians 6:10",
    zh_ref: "弗 6:10",
    zh: "你们要靠着主，倚赖他的大能大力，作刚强的人。",
    en: "Be strong in the Lord and in the strength of his might.",
  },
  {
    ref: "Philippians 4:6-7",
    zh_ref: "腓 4:6-7",
    zh: "应当一无挂虑，只要凡事借着祷告、祈求和感谢，将你们所要的告诉神。神所赐出人意外的平安必保守你们的心怀意念。",
    en: "Do not be anxious about anything... and the peace of God, which surpasses all understanding, will guard your hearts and your minds in Christ Jesus.",
  },
  {
    ref: "Philippians 1:6",
    zh_ref: "腓 1:6",
    zh: "那在你们心里动了善工的，必成全这工，直到耶稣基督的日子。",
    en: "He who began a good work in you will bring it to completion at the day of Jesus Christ.",
  },
  {
    ref: "Colossians 3:23",
    zh_ref: "西 3:23",
    zh: "无论做什么，都要从心里做，像是给主做的，不是给人做的。",
    en: "Whatever you do, work heartily, as for the Lord and not for men.",
  },
  {
    ref: "1 Thessalonians 5:16-18",
    zh_ref: "帖前 5:16-18",
    zh: "要常常喜乐，不住地祷告，凡事谢恩。",
    en: "Rejoice always, pray without ceasing, give thanks in all circumstances.",
  },
  {
    ref: "2 Timothy 1:7",
    zh_ref: "提后 1:7",
    zh: "因为神赐给我们的，不是胆怯的心，乃是刚强、仁爱、谨守的心。",
    en: "For God gave us a spirit not of fear but of power and love and self-control.",
  },
  {
    ref: "Hebrews 11:1",
    zh_ref: "来 11:1",
    zh: "信就是所望之事的实底，是未见之事的确据。",
    en: "Now faith is the assurance of things hoped for, the conviction of things not seen.",
  },
  {
    ref: "Hebrews 13:8",
    zh_ref: "来 13:8",
    zh: "耶稣基督昨日、今日、一直到永远，是一样的。",
    en: "Jesus Christ is the same yesterday and today and forever.",
  },
  {
    ref: "James 1:5",
    zh_ref: "雅 1:5",
    zh: "你们中间若有缺少智慧的，应当求那厚赐与众人也不斥责人的神。",
    en: "If any of you lacks wisdom, let him ask God, who gives generously to all without reproach.",
  },
  {
    ref: "James 1:12",
    zh_ref: "雅 1:12",
    zh: "忍受试探的人是有福的，因为他经过试验以后必得生命的冠冕。",
    en: "Blessed is the man who remains steadfast under trial.",
  },
  {
    ref: "1 Peter 5:7",
    zh_ref: "彼前 5:7",
    zh: "你们要将一切的忧虑卸给神，因为他顾念你们。",
    en: "Casting all your anxieties on him, because he cares for you.",
  },
  {
    ref: "1 John 4:18",
    zh_ref: "约壹 4:18",
    zh: "爱里没有惧怕；爱既完全，就把惧怕除去。",
    en: "There is no fear in love, but perfect love casts out fear.",
  },
  {
    ref: "Revelation 21:4",
    zh_ref: "启 21:4",
    zh: "神要擦去他们一切的眼泪，不再有死亡，也不再有悲哀、哭号、疼痛。",
    en: "He will wipe away every tear from their eyes, and death shall be no more.",
  },
];

export async function getDailyVerse() {
  if (useLocalData) {
    const today = (() => {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    })();
    const key = "linkdash-last-verse-idx";
    const last = Number(localStorage.getItem(key) || "-1");
    let next = Math.floor(Math.random() * VERSES.length);
    if (VERSES.length > 1 && next === last) {
      next = (next + 1 + Math.floor(Math.random() * (VERSES.length - 1))) % VERSES.length;
    }
    localStorage.setItem(key, String(next));
    const verse = VERSES[next];
    return { date: today, ...verse };
  }
  const res = await api.get("/daily-verse", { params: { mode: "random" } });
  return res.data;
}
