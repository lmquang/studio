import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const apiTarget = `http://127.0.0.1:${process.env.GOFF_MGMT_SERVER_PORT || "8080"}`;

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    allowedHosts: ["goff.local"],
    proxy: { "/api": apiTarget, "/auth": apiTarget, "/swagger": apiTarget },
  },
  test: { environment: "jsdom", restoreMocks: true },
});
