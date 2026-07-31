import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Pure-logic suites only (engine, parsers, demo data source) — no DOM, no
// network, no database. Modules under test are server modules, so
// `server-only` is aliased to the no-op build the React Server Component
// bundler would resolve; importing it in a plain Node test otherwise throws.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url)
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
    },
  },
});
