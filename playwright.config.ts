import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  testIgnore: ["mobile/**"],
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", testIgnore: ["mobile/**", "admin*.spec.ts"], use: { ...devices["Desktop Chrome"], channel: "chromium" } },
    { name: "mobile", testIgnore: ["mobile/**", "admin*.spec.ts"], use: { ...devices["Pixel 7"], channel: "chromium" } },
    // O painel altera horários/configurações globais: roda depois dos demais, em série.
    {
      name: "admin",
      testMatch: /admin.*\.spec\.ts/,
      fullyParallel: false,
      dependencies: ["desktop", "mobile"],
      use: { ...devices["Desktop Chrome"], channel: "chromium" },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // Build de produção: comportamento real (cache, service worker) e sem compilação sob demanda.
        command: `npm run build && npx next start -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
        env: { ENABLE_STYLE_GUIDE: "1" },
      },
});
