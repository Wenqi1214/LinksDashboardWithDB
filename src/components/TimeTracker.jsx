import { useMemo, useState } from "react";

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function TaskChart({ points = [] }) {
  const maxHours = Math.max(1, ...points.map((p) => Number(p.hours) || 0));

  return (
    <div className="taskChart">
      {points.map((point) => {
        const hours = Number(point.hours) || 0;
        const height = Math.max(4, Math.round((hours / maxHours) * 100));
        return (
          <div key={point.date} className="taskChartBarWrap" title={`${point.date}: ${hours}h`}>
            <div className="taskChartBar" style={{ height: `${height}%` }} />
          </div>
        );
      })}
    </div>
  );
}

export default function TimeTracker({
  tasks,
  taskCharts,
  seriesView,
  timeSeries,
  onChangeSeriesView,
  onAddTask,
  onDeleteTask,
  onAddHour,
  onRemoveHour,
  onExportExcel,
  onExportPdf,
}) {
  const [taskName, setTaskName] = useState("");
  const [targetHours, setTargetHours] = useState("100");
  const currentDate = useMemo(() => todayDate(), []);

  async function submitTask() {
    const trimmed = taskName.trim();
    if (!trimmed) return;

    await onAddTask({
      name: trimmed,
      target_hours: Number(targetHours) || 100,
    });
    setTaskName("");
    setTargetHours("100");
  }

  const activeTasks = tasks.filter((task) => Number(task.total_hours) < Number(task.target_hours));
  const completedTasks = tasks.filter((task) => Number(task.total_hours) >= Number(task.target_hours));
  const maxSeriesValue = Math.max(
    1,
    ...(timeSeries.tasks || []).flatMap((task) => task.values || [0])
  );

  return (
    <section className="trackerWrap">
      <section className="card">
        <h2>Focus Time Tracker</h2>
        <p className="muted">
          Task 独立计时。每个 task 自己统计，不再混合总时长。勾 +1h / -1h 记录今天投入。
        </p>
        <div className="row">
          <input
            placeholder="Task name (e.g. English)"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
          />
          <input
            type="number"
            min="1"
            placeholder="Target hours"
            value={targetHours}
            onChange={(e) => setTargetHours(e.target.value)}
          />
          <button onClick={submitTask}>Add Task</button>
        </div>
      </section>

      <section className="card">
        <div className="seriesHead">
          <h2>Task Activity</h2>
          <div className="seriesTabs">
            {["week", "month", "year"].map((view) => (
              <button
                key={view}
                className={seriesView === view ? "tabBtn tabActive" : "tabBtn"}
                onClick={() => onChangeSeriesView(view)}
              >
                {view}
              </button>
            ))}
          </div>
        </div>
        <div className="seriesChart">
          {(timeSeries.buckets || []).map((bucket, idx) => (
            <div key={bucket.key} className="seriesGroup">
              <div className="seriesBars">
                {(timeSeries.tasks || []).map((task) => {
                  const value = task.values[idx] || 0;
                  const height = value === 0 ? 2 : Math.round((value / maxSeriesValue) * 100);
                  return (
                    <div
                      key={task.id}
                      className="seriesBar"
                      style={{ height: `${Math.max(2, height)}%` }}
                      title={`${task.name}: ${value}h`}
                    />
                  );
                })}
              </div>
              <span>{bucket.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="trackerTasks">
        {activeTasks.map((task) => {
          const total = Number(task.total_hours) || 0;
          const target = Number(task.target_hours) || 100;
          const filled = Math.min(total, target);
          const overflow = total - target;
          const points = taskCharts[task.id] || [];

          return (
            <article key={task.id} className="card taskCard">
              <header className="taskHead">
                <div>
                  <h3>{task.name}</h3>
                  <p className="muted">
                    Total {total}h / Target {target}h | Week {task.week_hours}h | Month{" "}
                    {task.month_hours}h | Today {task.today_hours}h
                  </p>
                </div>
                <div className="actions">
                  <button onClick={() => onAddHour(task.id, currentDate)}>+1h</button>
                  <button
                    disabled={Number(task.today_hours) === 0}
                    onClick={() => onRemoveHour(task.id, currentDate)}
                  >
                    -1h
                  </button>
                  <button className="danger" onClick={() => onDeleteTask(task.id)}>
                    Delete
                  </button>
                </div>
              </header>

              <TaskChart points={points} />

              <div className="hourGrid">
                {Array.from({ length: target }).map((_, index) => {
                  const isFilled = index < filled;
                  const isAddAction = index === total && total < target;
                  const isRemoveAction =
                    index === total - 1 && Number(task.today_hours) > 0 && total > 0;

                  return (
                    <button
                      key={index}
                      className={`hourCell ${isFilled ? "filled" : ""} ${
                        isAddAction || isRemoveAction ? "clickable" : ""
                      }`}
                      onClick={() => {
                        if (isAddAction) onAddHour(task.id, currentDate);
                        if (isRemoveAction) onRemoveHour(task.id, currentDate);
                      }}
                      disabled={!isAddAction && !isRemoveAction}
                      title={isAddAction ? "Add 1 hour" : isRemoveAction ? "Remove 1 hour" : ""}
                    />
                  );
                })}
              </div>
              {overflow > 0 && <p className="muted">+{overflow}h beyond target</p>}
            </article>
          );
        })}

        {activeTasks.length === 0 && <section className="card muted">No active task.</section>}
      </section>

      {completedTasks.length > 0 && (
        <section className="card">
          <h2>Completed Focus Tasks</h2>
          <div className="medalGrid">
            {completedTasks.map((task) => (
              <article key={task.id} className="medal">
                <strong>🏅 {task.name}</strong>
                <p className="muted">
                  Completed {task.total_hours}h / target {task.target_hours}h
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="card exportBar">
        <span className="muted">Export current focus progress</span>
        <div className="actions">
          <button onClick={onExportExcel}>
            Export Excel
          </button>
          <button onClick={onExportPdf}>
            Export PDF
          </button>
        </div>
      </section>
    </section>
  );
}
