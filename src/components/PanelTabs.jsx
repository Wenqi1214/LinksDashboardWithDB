import { useLayoutEffect, useMemo, useRef, useState } from "react";

export default function PanelTabs({
  panels,
  activeTab,
  onSelectPanel,
  onSelectFocus,
  onSelectTodo,
}) {
  const refs = useRef(new Map());
  const containerRef = useRef(null);
  const [slider, setSlider] = useState({ left: 0, width: 0, ready: false });

  const items = useMemo(
    () => [
      ...panels.map((panel, index) => ({
        id: `panel:${panel.id}`,
        label: panel.name,
        badge: String(index + 1),
        onClick: () => onSelectPanel(panel.id),
      })),
      { id: "divider-a", label: "|", divider: true },
      { id: "focus", label: "Focus", onClick: onSelectFocus },
      { id: "todo", label: "To Do", onClick: onSelectTodo },
    ],
    [panels, onSelectPanel, onSelectFocus, onSelectTodo]
  );

  useLayoutEffect(() => {
    const activeEl = refs.current.get(activeTab);
    const container = containerRef.current;
    if (!activeEl || !container) return;

    const containerRect = container.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    setSlider({
      left: activeRect.left - containerRect.left,
      width: activeRect.width,
      ready: true,
    });
  }, [activeTab, items.length]);

  return (
    <div ref={containerRef} className="panelStrip panelStripSlider">
      <div
        className={`tabSlider ${slider.ready ? "ready" : ""}`}
        style={{ transform: `translateX(${slider.left}px)`, width: `${slider.width}px` }}
      />
      {items.map((item) =>
        item.divider ? (
          <span key={item.id} className="tabDivider" aria-hidden>
            |
          </span>
        ) : (
          <button
            key={item.id}
            ref={(el) => {
              if (!el) refs.current.delete(item.id);
              else refs.current.set(item.id, el);
            }}
            className={activeTab === item.id ? "tabBtn tabActive sliderActive" : "tabBtn"}
            onClick={item.onClick}
            title={item.badge ? `Shortcut: ${item.badge}` : item.label}
          >
            {item.badge && <span className="tabIndex">{item.badge}</span>}
            {item.label}
          </button>
        )
      )}
    </div>
  );
}
