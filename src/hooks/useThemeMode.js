import { useEffect, useState } from "react";

export function useThemeMode() {
  const [themeMode, setThemeMode] = useState(
    () => localStorage.getItem("theme-mode") || "system"
  );
  const [themePalette, setThemePalette] = useState(
    () => localStorage.getItem("theme-palette") || "paper"
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
