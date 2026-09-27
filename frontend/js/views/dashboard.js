/**
 * Dashboard view — stat cards, completion donut, weekly activity chart,
 * priority breakdown and recent activity. All numbers come from the
 * server-side aggregation at GET /api/dashboard/summary.
 */
import { api, getUser } from "../api.js";
import { openTaskModal } from "../task-modal.js";
import {
  dueChip,
  escapeHtml,
  greeting,
  icon,
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  spinner,
  STATUS_LABELS,
} from "../ui.js";

const CIRC = 2 * Math.PI * 52; // donut circumference for r=52

export async function renderDashboard(container) {
  container.innerHTML = spinner();

  let s;
  try {
    s = await api("/dashboard/summary");
  } catch (err) {
    container.innerHTML = emptyState("alert-circle", "Couldn't load your dashboard", err.message);
    return;
  }

  const user = getUser() || { full_name: "there" };
  const firstName = user.full_name.split(" ")[0];
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (s.total_tasks === 0) {
    container.innerHTML = `
      <header class="view-head">
        <h2>${greeting()}, ${escapeHtml(firstName)} 👋</h2>
        <p class="view-sub">${today}</p>
      </header>
      <div class="card hero-empty">
        <div class="empty-state">
          <span class="empty-icon">${icon("inbox", 28)}</span>
          <h3>Your workspace is ready</h3>
          <p>Create your first task and TaskFlow will start tracking your momentum right here.</p>
          <button class="btn btn-primary" id="first-task">${icon("plus", 16)} Create your first task</button>
        </div>
      </div>`;
    container.querySelector("#first-task").addEventListener("click", () =>
      openTaskModal(null, () => renderDashboard(container))
    );
    return;
  }

  const offset = CIRC * (1 - s.completion_rate / 100);
  const maxWeek = Math.max(1, ...s.completed_last_7_days.map((d) => d.count));
  const maxPrio = Math.max(1, ...Object.values(s.by_priority));

  container.innerHTML = `
    <header class="view-head">
      <h2>${greeting()}, ${escapeHtml(firstName)} 👋</h2>
      <p class="view-sub">${today} — here's where things stand.</p>
    </header>

    ${
      s.overdue > 0
        ? `<div class="alert-banner warn">
             ${icon("alert-circle", 17)}
             <span><strong>${s.overdue} task${s.overdue === 1 ? " is" : "s are"} overdue</strong>${
             s.due_today ? ` and ${s.due_today} due today` : ""
           }. <a class="link" href="#/tasks">Open your tasks</a></span>
           </div>`
        : ""
    }

    <div class="stat-grid">
      ${statCard("indigo", "layers", s.total_tasks, "Total tasks")}
      ${statCard("green", "check-circle", s.completed, "Completed")}
      ${statCard("blue", "clock", s.in_progress, "In progress")}
      ${statCard("slate", "inbox", s.pending, "Pending")}
    </div>

    <div class="grid-3">
      <section class="card">
        <h3>Completion rate</h3>
        <div class="donut-wrap">
          <svg class="donut" viewBox="0 0 120 120">
            <defs>
              <linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#6366f1"/>
                <stop offset="100%" stop-color="#a855f7"/>
              </linearGradient>
            </defs>
            <circle class="donut-track" cx="60" cy="60" r="52"/>
            <circle class="donut-fill" cx="60" cy="60" r="52"
                    stroke-dasharray="${CIRC.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"
                    transform="rotate(-90 60 60)"/>
            <text class="donut-center" x="60" y="67" text-anchor="middle">${s.completion_rate}%</text>
          </svg>
          <p class="muted">${s.completed} of ${s.total_tasks} tasks done${
            s.due_today ? ` · ${s.due_today} due today` : ""
          }</p>
        </div>
      </section>

      <section class="card">
        <h3>Completed this week</h3>
        <div class="bar-chart">
          ${s.completed_last_7_days
            .map((d) => {
              const h = Math.max(4, Math.round((d.count / maxWeek) * 100));
              const label = new Date(d.date + "T00:00:00").toLocaleDateString(undefined, {
                weekday: "short",
              });
              return `
              <div class="bar-col">
                <div class="bar" style="height:${h}%">
                  ${d.count > 0 ? `<span class="bar-count">${d.count}</span>` : ""}
                </div>
                <span class="bar-label">${label}</span>
              </div>`;
            })
            .join("")}
        </div>
      </section>

      <section class="card">
        <h3>By priority</h3>
        ${PRIORITY_ORDER.map((p) => {
          const count = s.by_priority[p] || 0;
          const w = Math.round((count / maxPrio) * 100);
          return `
          <div class="prio-row">
            <span class="prio-label prio-text-${p}">${PRIORITY_LABELS[p]}</span>
            <div class="prio-track"><div class="prio-fill ${p}" style="width:${w}%"></div></div>
            <span class="prio-count">${count}</span>
          </div>`;
        }).join("")}
      </section>
    </div>

    <section class="card">
      <div class="card-head">
        <h3 style="margin:0">Recent activity</h3>
        <a class="link" href="#/tasks">View all tasks</a>
      </div>
      <ul class="task-list">
        ${s.recent_tasks
          .map(
            (t) => `
          <li>
            <span class="status-dot ${t.status}" title="${STATUS_LABELS[t.status]}"></span>
            <span class="recent-title ${t.status === "completed" ? "done" : ""}">${escapeHtml(t.title)}</span>
            <span class="pill prio-${t.priority}">${icon("flag", 12)}${PRIORITY_LABELS[t.priority]}</span>
            ${dueChip(t)}
          </li>`
          )
          .join("")}
      </ul>
    </section>`;
}

function statCard(color, iconName, value, label) {
  return `
    <div class="stat-card">
      <span class="stat-icon ${color}">${icon(iconName, 22)}</span>
      <div>
        <div class="stat-value">${value}</div>
        <div class="stat-label">${label}</div>
      </div>
    </div>`;
}

function emptyState(iconName, title, message) {
  return `
    <div class="empty-state">
      <span class="empty-icon">${icon(iconName, 28)}</span>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
    </div>`;
}
