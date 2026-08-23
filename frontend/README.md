# Stock Insight Assistant — Frontend

A React (Vite) frontend for the Stock Insight Assistant chat-service API.
Dark terminal-inspired UI, JWT auth, markdown + table rendering for answers
(chat-service returns markdown tables for price data), and a live `/health`
status indicator.

## How it talks to the backend — no backend changes required

The browser **never calls the backend directly**. It calls this app's own
`/api/*` routes, and a reverse proxy in front of the static files forwards
those to wherever the real backend is running:

```
Browser → /api/chat  (same origin, no CORS)
            │
            ▼
   nginx (or Vite dev server) → BACKEND_URL/chat  (server-to-server, no CORS)
            │
            ▼
      chat-service (completely unmodified)
```

Because the browser only ever talks to one origin, **CORS never enters the
picture** — chat-service's code and API contract stay exactly as they are.
The only thing that changes between environments is where the proxy points,
which is a runtime setting, not something baked into the app.

## 1. Local development

```bash
npm install
cp .env.example .env   # edit VITE_DEV_BACKEND if chat-service isn't on :8020
npm run dev
```
Runs on `http://localhost:5173`. Vite's dev server proxies `/api/*` to
`VITE_DEV_BACKEND` (default `http://localhost:8020`). This value is only
used by the dev server process itself — it is never sent to the browser or
bundled into any JS.

## 2. Building for production

```bash
npm run build
```
Outputs static files to `dist/`. Notice there's **no backend URL to set
here** — the build output is generic and works against any backend, because
routing happens at the proxy layer (nginx), not inside the bundled
JavaScript.

## 3. Docker — pointing at a specific backend instance

```bash
docker build -t stock-insight-frontend .
docker run -p 8080:80 -e BACKEND_URL=http://<backend-host>:<port> stock-insight-frontend
```
`BACKEND_URL` is read by nginx **at container startup** (via the official
nginx image's template + `envsubst` mechanism — see `nginx.conf.template`
and the `NGINX_ENVSUBST_FILTER` setting in the `Dockerfile`), not at build
time. This is the key difference from a typical "bake the API URL into the
JS bundle" setup: the exact same image can be pointed at a different backend
instance just by changing this one env var — no rebuild needed. Useful if
you have multiple backend instances (dev/staging, or a NodePort IP that
changed after a node was replaced) and don't want to rebuild the frontend
every time.

If `BACKEND_URL` isn't set, it falls back to `http://localhost:8020` (set
as a default in the Dockerfile).

## 4. Deploying to AWS alongside the existing backend services

This frontend is built to slot into the same pipeline as the 3 backend
services, with the reverse-proxy approach carrying over cleanly:
- Push a 4th ECR repo: `stock-insight/frontend`
- Add a matrix entry for `frontend` in the existing GitHub Actions workflow
  (no `--build-arg` needed for the backend URL, since it's a runtime setting
  now — simpler than the typical build-time approach)
- Deploy as its own Kubernetes Deployment + Service. Set `BACKEND_URL` as a
  plain environment variable in the Deployment manifest, pointed at
  chat-service's internal cluster DNS name if both run in the same cluster
  (e.g. `http://chat-service:8020` — same internal-networking pattern
  chat-service already uses to reach retrieval-service), or at its external
  NodePort/LoadBalancer address if the frontend is deployed separately.
- Because `BACKEND_URL` is a runtime env var, updating it later (say, after
  chat-service's LoadBalancer finally provisions and you want to switch off
  NodePort) is just a `kubectl set env` / manifest change and pod restart —
  not a rebuild.

## 5. Known limitation (by design, not a bug)

**No conversation history endpoint exists on the backend.** chat-service
only exposes `POST /chat` (which returns a `conversation_id`) — there's no
`GET /conversations` or `GET /messages`, and this project intentionally
doesn't add one (no backend changes). So conversation titles and message
text are kept in the browser's `localStorage`, scoped per logged-in email:

- History is local to the browser/device where it was created.
- Clearing browser storage clears the local display copy only — the
  backend's `conversations`/`messages` tables in Postgres are untouched.
- Logging in as the same user from a different device starts with an empty
  sidebar, even though old conversations still exist in the database.

If persistent cross-device history matters later, the fix is adding
`GET /conversations` and `GET /conversations/{id}/messages` to chat-service
(reading from its existing `Conversation`/`Message` tables) — a backend
change, deliberately left out of this pass since you asked to keep the API
as-is.

## Project structure

```
src/
  lib/api.js                 fetch wrapper — calls /api/* (same-origin, proxied)
  context/AuthContext.jsx    JWT + user session (localStorage-backed)
  hooks/useConversations.js  client-side conversation/message storage
  components/                Sidebar, MessageBubble, Composer, StatusPill, etc.
  pages/AuthPage.jsx         login / register
  pages/ChatPage.jsx         main chat UI
nginx.conf.template          reverse proxy config; ${BACKEND_URL} filled in at
                              container startup, not build time
```
