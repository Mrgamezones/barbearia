import { defineConfig, devices } from "@playwright/test";
import { MOBILE_DEVICES } from "./devices";

// Simulação Android/iOS. Roda no container `mobile` (npm run docker:mobile), que compartilha a rede do app:
// http://localhost:3000 é contexto seguro nos dois motores, então o service worker funciona sem HTTPS.
const baseURL = process.env.MOBILE_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: ".",
  outputDir: "../results/artifacts",
  globalSetup: "./global-setup.ts",
  // Cenários de um arquivo em sequência; aparelhos/arquivos em paralelo (dados isolados por aparelho).
  fullyParallel: false,
  workers: Number(process.env.MOBILE_WORKERS ?? 2),
  retries: 0,
  forbidOnly: true,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { outputFolder: "../results/report", open: "never" }]],
  use: {
    baseURL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    serviceWorkers: "allow",
    // Evidência (não comparação visual): screenshot ao fim de cada cenário + página inteira anexada nas telas principais.
    screenshot: "on",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },
  projects: MOBILE_DEVICES.map(({ project, device }) => ({ name: project, use: { ...devices[device] } })),
});
