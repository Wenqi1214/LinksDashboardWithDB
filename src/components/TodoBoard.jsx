import { useMemo, useState } from "react";

function byLane(items, lane) {
  return items
    .filter((i) => i.lane === lane)
    .sort((a, b) => Number(a.done) - Number(b.done) || a.sort_order - b.sort_order || a.id - b.id);
}

function LaneEditor({
  title,
  lane,
  items,
  onCreate,
  onUpdate,
  onToggle,
  onDelete,
  onClear,
}) {
  const [draft, setDraft] = useState("");

  return (
    <article className="card">
      <div className="laneHead">
        <h2>{title}</h2>
        <button className="ghostBtn" onClick={() => onClear(lane)}>Clear</button>
      </div>

      <div className="todoList">
        {items.map((item) => (
          <label key={item.id} className={`todoItem ${Number(item.done) ? "done" : ""}`}>
            <input type="checkbox" checked={Boolean(item.done)} onChange={() => onToggle(item.id)} />
            <input
              className="todoTextInput"
              defaultValue={item.title}
              onBlur={(e) => onUpdate(item.id, { title: e.target.value.trim() || "Untitled" })}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
            />
            <button className="iconBtn danger" onClick={() => onDelete(item.id)}>⌫</button>
          </label>
        ))}

        <label className="todoItem drafting">
          <input type="checkbox" disabled />
          <input
            className="todoTextInput"
            placeholder="Type and press Enter"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              const titleText = draft.trim();
              if (!titleText) return;
              await onCreate({ title: titleText, lane });
              setDraft("");
            }}
          />
          <span />
        </label>
      </div>
    </article>
  );
}

export default function TodoBoard({
  items,
  onCreate,
  onUpdate,
  onToggle,
  onDelete,
  onClear,
}) {
  const todayItems = useMemo(() => byLane(items, "today"), [items]);
  const nextItems = useMemo(() => byLane(items, "next"), [items]);

  return (
    <section className="todoWrap">
      <section className="todoGrid">
        <LaneEditor
          title="Today"
          lane="today"
          items={todayItems}
          onCreate={onCreate}
          onUpdate={onUpdate}
          onToggle={onToggle}
          onDelete={onDelete}
          onClear={onClear}
        />
        <LaneEditor
          title="Next Step"
          lane="next"
          items={nextItems}
          onCreate={onCreate}
          onUpdate={onUpdate}
          onToggle={onToggle}
          onDelete={onDelete}
          onClear={onClear}
        />
      </section>
    </section>
  );
}
