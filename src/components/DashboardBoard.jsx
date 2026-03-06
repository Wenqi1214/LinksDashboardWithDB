import { useRef, useState } from "react";
const DRAG_MIME = "application/x-linkdash-drag";

function moveInArray(list, fromIndex, toIndex) {
  const next = [...list];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export default function DashboardBoard({
  grouped,
  onDeleteCategory,
  onEditLink,
  onDeleteLink,
  onCategoryReorder,
  onLinksReorder,
}) {
  const [dragItem, setDragItem] = useState(null);
  const dragItemRef = useRef(null);
  const [categoryHoverId, setCategoryHoverId] = useState(null);
  const [linkHover, setLinkHover] = useState(null);

  function setDrag(payload) {
    dragItemRef.current = payload;
    setDragItem(payload);
  }

  function getCurrentDrag(e) {
    if (dragItemRef.current) return dragItemRef.current;
    if (dragItem) return dragItem;
    try {
      const rawCustom = e?.dataTransfer?.getData(DRAG_MIME);
      if (rawCustom) return JSON.parse(rawCustom);

      const rawText = e?.dataTransfer?.getData("text/plain");
      if (rawText && rawText.trim().startsWith("{")) return JSON.parse(rawText);
      return null;
    } catch (_e) {
      return null;
    }
  }

  function clearDrag() {
    dragItemRef.current = null;
    setDragItem(null);
    setCategoryHoverId(null);
    setLinkHover(null);
  }

  function handleCategoryDrop(targetCategoryId, e) {
    const currentDrag = getCurrentDrag(e);
    if (!currentDrag || currentDrag.type !== "category") return;
    if (currentDrag.categoryId === targetCategoryId) return;

    const ids = grouped.map((c) => c.id);
    const from = ids.indexOf(currentDrag.categoryId);
    const to = ids.indexOf(targetCategoryId);
    if (from < 0 || to < 0) return;

    const orderedIds = moveInArray(ids, from, to);
    onCategoryReorder(orderedIds);
    clearDrag();
  }

  function handleCategoryDropAtEnd(e) {
    const currentDrag = getCurrentDrag(e);
    if (!currentDrag || currentDrag.type !== "category") return;
    const ids = grouped.map((c) => c.id);
    const from = ids.indexOf(currentDrag.categoryId);
    if (from < 0 || from === ids.length - 1) return;

    const orderedIds = moveInArray(ids, from, ids.length - 1);
    onCategoryReorder(orderedIds);
    clearDrag();
  }

  function handleLinkDrop(targetCategoryId, targetLinkId = null, e) {
    const currentDrag = getCurrentDrag(e);
    if (!currentDrag || currentDrag.type !== "link") return;
    if (targetCategoryId === currentDrag.fromCategoryId && targetLinkId === currentDrag.linkId) return;

    const byCategory = {};
    grouped.forEach((category) => {
      byCategory[category.id] = category.links.map((link) => link.id);
    });

    const sourceIds = byCategory[currentDrag.fromCategoryId] || [];
    byCategory[currentDrag.fromCategoryId] = sourceIds.filter((id) => id !== currentDrag.linkId);

    const targetIds = byCategory[targetCategoryId] || [];
    const insertIndex =
      targetLinkId == null ? targetIds.length : Math.max(targetIds.indexOf(targetLinkId), 0);
    targetIds.splice(insertIndex, 0, currentDrag.linkId);
    byCategory[targetCategoryId] = targetIds;

    const items = Object.entries(byCategory).flatMap(([categoryId, ids]) =>
      ids.map((id, index) => ({
        id,
        category_id: Number(categoryId),
        sort_order: index,
      }))
    );

    onLinksReorder(items);
    clearDrag();
  }

  return (
    <>
      <main className="grid">
        {grouped.map((category) => (
          <section
            key={category.id}
            className={`card column ${categoryHoverId === category.id ? "dropActive" : ""}`}
            onDragOver={(e) => {
              const currentDrag = getCurrentDrag(e);
              if (currentDrag?.type === "category") {
                e.preventDefault();
                setCategoryHoverId(category.id);
              }
              if (currentDrag?.type === "link") {
                e.preventDefault();
                setLinkHover({ categoryId: category.id, linkId: null });
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              const currentDrag = getCurrentDrag(e);
              if (currentDrag?.type === "category") handleCategoryDrop(category.id, e);
              if (currentDrag?.type === "link") handleLinkDrop(category.id, null, e);
            }}
          >
            <header className="columnHead">
              <div className="headLeft">
                <span
                  className="dragHandle"
                  draggable
                  onDragStart={(e) => {
                    const payload = { type: "category", categoryId: category.id };
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
                    e.dataTransfer.setData("text/plain", JSON.stringify(payload));
                    setDrag(payload);
                  }}
                  onDragEnd={clearDrag}
                  title="Drag to reorder category"
                >
                  ::
                </span>
                <h3>{category.name}</h3>
              </div>
              <button
                className="iconBtn danger"
                title="Delete category"
                onClick={() => onDeleteCategory(category.id)}
              >
                x
              </button>
            </header>

            <div
              className={`columnBody ${
                getCurrentDrag()?.type === "link" &&
                linkHover?.categoryId === category.id &&
                linkHover?.linkId == null
                  ? "dropActiveSoft"
                  : ""
              }`}
              onDragOver={(e) => {
                const currentDrag = getCurrentDrag(e);
                if (currentDrag?.type === "link") {
                  e.preventDefault();
                  setLinkHover({ categoryId: category.id, linkId: null });
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleLinkDrop(category.id, null, e);
              }}
            >
              {category.links.length === 0 ? (
                <div className="muted">Drop links here</div>
              ) : (
                category.links.map((link) => (
                  <article
                    key={link.id}
                    draggable
                    className={`linkRow ${
                      getCurrentDrag()?.type === "link" && linkHover?.linkId === link.id
                        ? "dropActiveSoft"
                        : ""
                    }`}
                    onDragStart={(e) => {
                      const payload = { type: "link", linkId: link.id, fromCategoryId: category.id };
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
                      e.dataTransfer.setData("text/plain", JSON.stringify(payload));
                      setDrag(payload);
                    }}
                    onDragEnd={clearDrag}
                    onDragOver={(e) => {
                      const currentDrag = getCurrentDrag(e);
                      if (currentDrag?.type === "link") {
                        e.preventDefault();
                        setLinkHover({ categoryId: category.id, linkId: link.id });
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleLinkDrop(category.id, link.id, e);
                    }}
                  >
                    <span
                      className="dragHandle"
                      aria-hidden
                      title="Drag to reorder/move link"
                    >
                      ::
                    </span>
                    <div className="linkBody">
                      <a href={link.url} target="_blank" rel="noreferrer" draggable={false}>
                        {link.name}
                      </a>
                      {link.description && <p className="linkDesc">{link.description}</p>}
                    </div>
                    <div className="actions">
                      <button className="iconBtn" title="Edit link" onClick={() => onEditLink(link)}>
                        ✎
                      </button>
                      <button
                        className="iconBtn danger"
                        title="Delete link"
                        onClick={() => onDeleteLink(link.id)}
                      >
                        ⌫
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        ))}

        {grouped.length > 1 && (
          <section
            className="card dropTail"
            onDragOver={(e) => {
              const currentDrag = getCurrentDrag(e);
              if (currentDrag?.type === "category") {
                e.preventDefault();
                setCategoryHoverId(-1);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleCategoryDropAtEnd(e);
            }}
          >
            <div className="muted">Drop category here to move to end</div>
          </section>
        )}
      </main>
    </>
  );
}
