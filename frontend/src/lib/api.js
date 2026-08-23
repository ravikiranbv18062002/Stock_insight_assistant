// All requests go through nginx's same-origin /api proxy (see nginx.conf.template),
// so the browser never makes a cross-origin request and CORS never enters the
// picture. The actual backend address is a runtime setting (BACKEND_URL env var
// on the nginx container), not something baked into this bundle.
const API_BASE = "/api";

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = "GET", token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiError(
      "Could not reach the server. Check that the API is running and reachable.",
      0
    );
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const detail = data?.detail || `Request failed (${res.status})`;
    throw new ApiError(
      typeof detail === "string" ? detail : "Request failed",
      res.status
    );
  }

  return data;
}

export const api = {
  health: () => request("/health"),
  register: (email, password) =>
    request("/auth/register", { method: "POST", body: { email, password } }),
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: { email, password } }),
  chat: (token, question, conversationId) =>
    request("/chat", {
      method: "POST",
      token,
      body: {
        question,
        conversation_id: conversationId ?? null,
      },
    }),
};

export { ApiError };
