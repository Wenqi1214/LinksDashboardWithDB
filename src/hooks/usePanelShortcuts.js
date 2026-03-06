import { useEffect } from "react";

const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function usePanelShortcuts({ enabled, panels, onPick }) {
  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.repeat) return;
      if (!/^[1-9]$/.test(event.key)) return;

      const active = document.activeElement;
      if (active?.isContentEditable) return;
      if (active && INPUT_TAGS.has(active.tagName)) return;

      const index = Number(event.key) - 1;
      const panel = panels[index];
      if (!panel) return;

      event.preventDefault();
      onPick(panel.id);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, panels, onPick]);
}
