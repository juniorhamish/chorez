import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts", "vitest-localstorage-mock"],
    globals: true,
    env: {
      // Dummy value so importing `lib/db.ts` never throws during tests;
      // real DB access is always mocked with `vi.mock("@/lib/db", ...)`.
      DATABASE_URL: "postgres://test:test@localhost:5432/test",
    },
  },
});
