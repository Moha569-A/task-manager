/**
 * API client — the single place where we talk to the backend.
 *
 * Responsibilities:
 *  - build /api URLs with query params
 *  - attach the JWT (Authorization: Bearer …) from localStorage
 *  - normalise error responses into an ApiError with a friendly message
 *  - globally handle 401s (expired token → kick the user to the login screen)
 */
const API_BASE = "/api";
const TOKEN_KEY = "taskflow_token";
const USER_KEY = "taskflow_user";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function api(path, { method = "GET", body, params } = {}) {
  const url = new URL(API_BASE + path, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }

  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Network error — is the server running?", 0);
  }

  // Any 401 outside of the login call itself means the session died.
  if (res.status === 401 && !path.startsWith("/auth/login")) {
    clearSession();
    if (window.location.hash !== "#/login") window.location.hash = "#/login";
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }

  if (!res.ok) {
    const detail = data && data.detail;
    let message = "Something went wrong. Please try again.";
    if (typeof detail === "string") message = detail;
    else if (Array.isArray(detail)) {
      message = detail.map((d) => d.msg || JSON.stringify(d)).join(" · ");
    }
    throw new ApiError(message, res.status);
  }
  return data;
}
