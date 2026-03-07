import { useEffect, useState } from "react";

const ALLOWED_PALETTES = new Set([
  "blank",
  "pastel-blue-special",
  "girl-holding-rose",
  "easter",
  "pasteltones",
  "thoughts",
  "lonestar",
  "pastelclass",
  "walkalong",
  "evensadness",
]);
const DEFAULT_PALETTE = "pastel-blue-special";

export function useThemeMode() {
  const [themeMode, setThemeMode] = useState(
    () => localStorage.getItem("theme-mode") || "system"
  );
  const [themePalette, setThemePalette] = useState(
    () => {
      const saved = localStorage.getItem("theme-palette");
      return saved && ALLOWED_PALETTES.has(saved) ? saved : DEFAULT_PALETTE;
    }
  );

  useEffect(() => {
    localStorage.setItem("theme-mode", themeMode);
    localStorage.setItem("theme-palette", themePalette);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = themeMode === "system" ? (media.matches ? "dark" : "light") : themeMode;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.dataset.themeMode = themeMode;
      document.documentElement.dataset.palette = themePalette;
    };

    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [themeMode, themePalette]);

  return { themeMode, setThemeMode, themePalette, setThemePalette };
}
