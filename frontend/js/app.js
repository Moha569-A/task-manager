/**
 * App shell + hash router.
 *
 *  #/login, #/register  →  auth view (public)
 *  #/                   →  dashboard
 *  #/tasks              →  task list
 *  #/board              →  kanban board
 *
 * The router is a guard: no JWT in localStorage → everything redirects to
 * #/login; a valid session on an auth page → straight to the dashboard.
 */
import { api, clearSession, getToken, getUser, setSession } from "./api.js";
import { openTaskModal } from "./task-modal.js";
import { avatarInitials, escapeHtml, icon, toast } from "./ui.js";
import { renderAuth } from "./views/auth.js";
import { renderBoard } from "./views/board.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderTasks } from "./views/tasks.js";

const NAV = [
  { hash: "#/", label: "Dashboard", icon: "dashboard", title: "Dashboard", render: renderDashboard },
  { hash: "#/tasks", label: "My Tasks", icon: "tasks", title: "My Tasks", render: renderTasks },
  { hash: "#/board", label: "Board", icon: "board", title: "Board", render: renderBoard },
];

function currentRoute() {
  const hash = window.location.hash || "#/";
  return NAV.find((n) => n.hash === hash) || NAV[0];
}

function start() {
  const root = document.getElementById("root");
  const hash = window.location.hash || "#/";
  const isAuthRoute = hash.startsWith("#/login") || hash.startsWith("#/register");
  const token = getToken();

  document.body.classList.remove("sidebar-open");

  if (!token && !isAuthRoute) {
    window.location.hash = "#/login";
    return;
  }
  if (token && isAuthRoute) {
    window.location.hash = "#/";
    return;
  }
  if (!token) {
    renderAuth(hash, root);
    return;
  }
  renderShell(root);
}

function renderShell(root) {
  const user = getUser() || { full_name: "User", email: "" };
  const route = currentRoute();

  root.innerHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <span class="logo-mark solid">${icon("zap", 16)}</span>
        <span class="logo-text">TaskFlow</span>
      </div>
      <nav class="nav">
        ${NAV.map(
          (n) => `
          <a class="nav-item ${n.hash === route.hash ? "active" : ""}" href="${n.hash}">
            ${icon(n.icon, 19)}<span>${n.label}</span>
          </a>`
        ).join("")}
      </nav>
      <div class="sidebar-foot">
        <div class="user-chip">
          <span class="avatar">${escapeHtml(avatarInitials(user.full_name))}</span>
          <div class="user-meta">
            <div class="user-name">${escapeHtml(user.full_name)}</div>
            <div class="user-email">${escapeHtml(user.email)}</div>
          </div>
        </div>
        <button class="icon-btn" id="logout-btn" title="Sign out">${icon("logout", 18)}</button>
      </div>
    </aside>
    <div class="sidebar-overlay" id="sidebar-overlay"></div>

    <div class="main">
      <header class="topbar">
        <button class="icon-btn hamburger" id="hamburger" aria-label="Open menu">${icon("menu", 20)}</button>
        <h1 class="page-title">${route.title}</h1>
        <div class="topbar-spacer"></div>
        <button class="btn btn-primary" id="new-task-btn">${icon("plus", 16)}<span>New task</span></button>
      </header>
      <main class="content" id="view-root"></main>
    </div>`;

  // Sidebar (mobile drawer) ----------------------------------------------
  const hamburger = root.querySelector("#hamburger");
  const overlay = root.querySelector("#sidebar-overlay");
  hamburger.addEventListener("click", () => document.body.classList.toggle("sidebar-open"));
  overlay.addEventListener("click", () => document.body.classList.remove("sidebar-open"));
  root.querySelectorAll(".nav-item").forEach((a) =>
    a.addEventListener("click", () => document.body.classList.remove("sidebar-open"))
  );

  // Global "New task" button ----------------------------------------------
  root.querySelector("#new-task-btn").addEventListener("click", () => {
    openTaskModal(null, refresh);
  });

  // Logout ------------------------------------------------------------------
  root.querySelector("#logout-btn").addEventListener("click", () => {
    clearSession();
    toast("Signed out", "info");
    window.location.hash = "#/login";
  });

  refresh();
  syncUser();
}

function refresh() {
  const route = currentRoute();
  const viewRoot = document.getElementById("view-root");
  if (viewRoot) route.render(viewRoot);
}

/** Re-fetch the profile so the sidebar always shows fresh data. */
async function syncUser() {
  try {
    const me = await api("/auth/me");
    setSession(getToken(), me);
    const nameEl = document.querySelector(".user-name");
    const emailEl = document.querySelector(".user-email");
    const avatarEl = document.querySelector(".avatar");
    if (nameEl) nameEl.textContent = me.full_name;
    if (emailEl) emailEl.textContent = me.email;
    if (avatarEl) avatarEl.textContent = avatarInitials(me.full_name);
  } catch {
    /* 401 is handled globally in api.js */
  }
}

window.addEventListener("hashchange", start);
window.addEventListener("DOMContentLoaded", start);
