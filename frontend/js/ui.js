/**
 * UI kit — icons, toasts, modals and small shared helpers.
 * Everything renders to plain HTML strings; no framework needed.
 */

// ---------------------------------------------------------------- icons
const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  tasks: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  board: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  "check-circle": '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  "alert-circle": '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  "trending-up": '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  "arrow-left": '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  "arrow-right": '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
};

export function icon(name, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
}

// ---------------------------------------------------------------- labels
export const STATUS_LABELS = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};
export const STATUS_ORDER = ["pending", "in_progress", "completed"];
export const PRIORITY_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};
export const PRIORITY_ORDER = ["urgent", "high", "medium", "low"];

// ---------------------------------------------------------------- helpers
export function escapeHtml(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

export function avatarInitials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Human-friendly due-date chip: "Overdue · Sep 10", "Due today", … */
export function dueMeta(dueDate, status) {
  if (!dueDate) return null;
  const d = new Date(dueDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  if (status === "completed") return { text: label, cls: "" };
  if (diff < 0) return { text: `Overdue · ${label}`, cls: "overdue" };
  if (diff === 0) return { text: "Due today", cls: "today" };
  if (diff === 1) return { text: "Due tomorrow", cls: "soon" };
  return { text: label, cls: "" };
}

export function dueChip(task) {
  const meta = dueMeta(task.due_date, task.status);
  if (!meta) return "";
  return `<span class="due ${meta.cls}">${icon("calendar", 13)}${escapeHtml(meta.text)}</span>`;
}

export function spinner() {
  return `<div class="loading"><div class="spinner"></div></div>`;
}

// ---------------------------------------------------------------- toasts
export function toast(message, type = "success") {
  let wrap = document.querySelector(".toast-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "toast-wrap";
    document.body.appendChild(wrap);
  }
  const iconName = type === "error" ? "alert-circle" : type === "info" ? "info" : "check-circle";
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.innerHTML = `${icon(iconName === "info" ? "check-circle" : iconName, 17)}<span>${escapeHtml(message)}</span>`;
  wrap.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 300);
  }, 3200);
}

// ---------------------------------------------------------------- modals
export function openModal(contentHtml, { width = 520 } = {}) {
  closeModal();
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal" style="max-width:${width}px">${contentHtml}</div>`;
  overlay.addEventListener("mousedown", (e) => {
    if (e.target === overlay) closeModal();
  });
  overlay.querySelectorAll("[data-close]").forEach((b) =>
    b.addEventListener("click", closeModal)
  );
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("show"));
  const first = overlay.querySelector("input:not([type=hidden]), textarea");
  if (first) setTimeout(() => first.focus(), 60);
  return overlay;
}

export function closeModal() {
  const overlay = document.querySelector(".modal-overlay");
  if (overlay) overlay.remove();
}

export function confirmDialog(title, message) {
  return new Promise((resolve) => {
    const overlay = openModal(
      `
      <div class="confirm-body">
        <div class="confirm-icon">${icon("alert-circle", 26)}</div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
        <div class="modal-actions confirm-actions">
          <button type="button" class="btn btn-ghost" data-no>Cancel</button>
          <button type="button" class="btn btn-danger" data-yes>Delete</button>
        </div>
      </div>`,
      { width: 400 }
    );
    overlay.querySelector("[data-no]").addEventListener("click", () => {
      closeModal();
      resolve(false);
    });
    overlay.querySelector("[data-yes]").addEventListener("click", () => {
      closeModal();
      resolve(true);
    });
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});
