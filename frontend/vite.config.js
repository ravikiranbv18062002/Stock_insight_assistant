import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Local dev only: Vite's own dev server proxies /api to the backend, the same
// way nginx does in production. The browser only ever talks to the Vite dev
// server's origin — set VITE_DEV_BACKEND to point at wherever chat-service is
// actually running (defaults to the standard local port from the backend
// project). This value is used by Vite itself, not bundled into client code.
const devBackend = process.env.VITE_DEV_BACKEND || "http://localhost:8020";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: devBackend,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  preview: {
    host: true,
    port: 4173,
  },
});
