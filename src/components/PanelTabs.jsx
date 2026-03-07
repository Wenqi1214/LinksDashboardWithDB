import { useLayoutEffect, useMemo, useRef, useState } from "react";

export default function PanelTabs({
  panels,
  activeTab,
  onSelectPanel,
  onSelectFocus,
  onSelectTodo,
  onAddPanel,
  onEditPanel,
  onPanelDragStateChange,
  onReorderPanels,
}) {
  const refs = useRef(new Map());
  const containerRef = useRef(null);
  const [slider, setSlider] = useState({ left: 0, top: 0, width: 0, height: 0, ready: false });
  const [dragPanelId, setDragPanelId] = useState(null);

  const items = useMemo(
    () => [
      ...panels.map((panel, index) => ({
        id: `panel:${panel.id}`,
        panelId: panel.id,
        label: panel.name,
        badge: String(index + 1),
        onClick: () => onSelectPanel(panel.id),
      })),
      { id: "divider-a", label: "|", divider: true },
      { id: "focus", label: "Focus", onClick: onSelectFocus },
      { id: "todo", label: "To Do", onClick: onSelectTodo },
      { id: "add-panel", label: "+", addPanel: true, onClick: onAddPanel },
    ],
    [panels, onSelectPanel, onSelectFocus, onSelectTodo, onAddPanel]
  );

  useLayoutEffect(() => {
    const activeEl = refs.current.get(activeTab);
    const container = containerRef.current;
    if (!activeEl || !container) return;

    setSlider({
      left: activeEl.offsetLeft,
      top: activeEl.offsetTop,
      width: activeEl.offsetWidth,
      height: activeEl.offsetHeight,
      ready: true,
    });
  }, [activeTab, items.length]);

  return (
    <div ref={containerRef} className="panelStrip panelStripSlider">
      <div
        className={`tabSlider ${slider.ready ? "ready" : ""}`}
        style={{
          transform: `translate(${slider.left}px, ${slider.top}px)`,
          width: `${slider.width}px`,
          height: `${slider.height}px`,
        }}
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
            className={
              item.addPanel
                ? "tabBtn tabAddBtn"
                : activeTab === item.id
                  ? "tabBtn tabActive sliderActive"
                  : "tabBtn"
            }
            onClick={item.onClick}
            title={item.badge ? `Shortcut: ${item.badge}` : item.label}
            draggable={Boolean(item.panelId)}
            onDoubleClick={() => {
              if (!item.panelId) return;
              onEditPanel?.(item.panelId, item.label);
            }}
            onDragStart={(e) => {
              if (!item.panelId) return;
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/panel-id", String(item.panelId));
              setDragPanelId(item.panelId);
              onPanelDragStateChange?.(item.panelId);
            }}
            onDragOver={(e) => {
              if (!item.panelId || dragPanelId == null) return;
              e.preventDefault();
            }}
            onDrop={(e) => {
              if (!item.panelId || dragPanelId == null) return;
              e.preventDefault();
              const sourceId = Number(dragPanelId);
              const targetId = Number(item.panelId);
              if (!sourceId || !targetId || sourceId === targetId) return;
              const ids = panels.map((p) => p.id);
              const from = ids.indexOf(sourceId);
              const to = ids.indexOf(targetId);
              if (from < 0 || to < 0) return;
              const next = [...ids];
              const [moved] = next.splice(from, 1);
              next.splice(to, 0, moved);
              onReorderPanels(next);
            }}
            onDragEnd={() => {
              setDragPanelId(null);
              onPanelDragStateChange?.(null);
            }}
          >
            {item.badge && <span className="tabIndex">{item.badge}</span>}
            {item.label}
          </button>
        )
      )}
    </div>
  );
}
