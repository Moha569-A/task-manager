/**
 * Auth view — split-screen login / register pages.
 */
import { api, setSession } from "../api.js";
import { escapeHtml, icon, toast } from "../ui.js";

const DEMO_EMAIL = "demo@taskflow.app";
const DEMO_PASSWORD = "demo1234";

function brandPanel() {
  return `
    <section class="auth-brand">
      <div class="brand-inner">
        <div class="brand-logo">
          <span class="logo-mark">${icon("zap", 17)}</span>
          TaskFlow
        </div>
        <h1 class="brand-title">Plan less.<br />Ship more.</h1>
        <p class="brand-sub">
          TaskFlow is the lightweight task hub for fast-moving people and teams —
          organize work, track progress and hit deadlines without the bloat.
        </p>
        <ul class="brand-features">
          <li>${icon("board", 18)} Kanban board &amp; smart list views</li>
          <li>${icon("flag", 18)} Priorities, due dates &amp; overdue alerts</li>
          <li>${icon("trending-up", 18)} Live dashboard of your momentum</li>
        </ul>
        <div class="brand-mock" aria-hidden="true">
          <div class="mock-col"><span class="mock-dot pending"></span><div class="mock-card"></div><div class="mock-card short"></div></div>
          <div class="mock-col"><span class="mock-dot progress"></span><div class="mock-card short"></div><div class="mock-card"></div></div>
          <div class="mock-col"><span class="mock-dot done"></span><div class="mock-card"></div><div class="mock-card short"></div></div>
        </div>
      </div>
    </section>`;
}

export function renderAuth(route, root) {
  const isRegister = route.startsWith("#/register");

  root.innerHTML = `
    <div class="auth-page">
      ${brandPanel()}
      <section class="auth-form-wrap">
        <div class="auth-form-card">
          <div class="auth-mobile-logo">
            <span class="logo-mark solid">${icon("zap", 16)}</span> TaskFlow
          </div>
          <h2>${isRegister ? "Create your account" : "Welcome back"}</h2>
          <p class="auth-sub">
            ${isRegister
              ? "Free forever for individuals. Takes 20 seconds."
              : "Sign in to pick up where you left off."}
          </p>

          <div class="alert-banner" id="auth-error" hidden></div>

          <form id="auth-form" novalidate>
            ${
              isRegister
                ? `<div class="field">
                     <label for="af-name">Full name</label>
                     <input id="af-name" name="full_name" placeholder="Ada Lovelace" autocomplete="name" />
                   </div>`
                : ""
            }
            <div class="field">
              <label for="af-email">Email</label>
              <input id="af-email" name="email" type="email" placeholder="you@company.com" autocomplete="email" />
            </div>
            <div class="field">
              <label for="af-password">Password${isRegister ? ' <span class="hint">· min 8 characters</span>' : ""}</label>
              <input id="af-password" name="password" type="password" placeholder="••••••••"
                     autocomplete="${isRegister ? "new-password" : "current-password"}" />
            </div>
            ${
              isRegister
                ? `<div class="field">
                     <label for="af-confirm">Confirm password</label>
                     <input id="af-confirm" name="confirm" type="password" placeholder="••••••••" autocomplete="new-password" />
                   </div>`
                : ""
            }
            <button type="submit" class="btn btn-primary btn-block" id="auth-submit">
              ${isRegister ? "Create account" : "Sign in"}
            </button>
          </form>

          <p class="auth-switch">
            ${
              isRegister
                ? `Already have an account? <a href="#/login">Sign in</a>`
                : `New to TaskFlow? <a href="#/register">Create an account</a>`
            }
          </p>

          <div class="demo-hint">
            <span>${icon("zap", 14)}</span>
            <div>
              Try the live demo —
              <button type="button" id="demo-login">demo@taskflow.app</button> · demo1234
            </div>
          </div>
        </div>
      </section>
    </div>`;

  const form = root.querySelector("#auth-form");
  const errorBox = root.querySelector("#auth-error");
  const submitBtn = root.querySelector("#auth-submit");

  function showError(msg) {
    errorBox.innerHTML = `${icon("alert-circle", 16)}<span>${escapeHtml(msg)}</span>`;
    errorBox.hidden = false;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.hidden = true;

    const data = {
      email: form.elements.email.value.trim(),
      password: form.elements.password.value,
    };

    if (isRegister) {
      data.full_name = form.elements.full_name.value.trim();
      const confirm = form.elements.confirm.value;
      if (data.full_name.length < 2) return showError("Please enter your full name.");
      if (data.password.length < 8) return showError("Password must be at least 8 characters.");
      if (data.password !== confirm) return showError("Passwords do not match.");
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) return showError("Please enter a valid email address.");

    submitBtn.disabled = true;
    submitBtn.textContent = isRegister ? "Creating account…" : "Signing in…";
    try {
      const res = await api(isRegister ? "/auth/register" : "/auth/login", {
        method: "POST",
        body: data,
      });
      setSession(res.access_token, res.user);
      toast(isRegister ? `Welcome aboard, ${res.user.full_name.split(" ")[0]}!` : `Welcome back, ${res.user.full_name.split(" ")[0]}!`);
      window.location.hash = "#/";
    } catch (err) {
      showError(err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = isRegister ? "Create account" : "Sign in";
    }
  });

  root.querySelector("#demo-login").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = "Signing in…";
    try {
      const res = await api("/auth/login", {
        method: "POST",
        body: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
      });
      setSession(res.access_token, res.user);
      toast(`Signed in as ${res.user.full_name}`);
      window.location.hash = "#/";
    } catch (err) {
      showError(err.message);
      btn.disabled = false;
      btn.textContent = DEMO_EMAIL;
    }
  });
}
