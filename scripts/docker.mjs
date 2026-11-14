#!/usr/bin/env node
// Ciclo de vida do ambiente Docker local. Escrito em Node para funcionar igual no PowerShell, cmd e bash.
// Uso: node scripts/docker.mjs <up|down|reset|mobile|mobile:android|mobile:ios|mobile:ui|report> [args extras do Playwright]
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";

const URLS = {
  site: "http://localhost:3000",
  studio: "http://localhost:56323",
  mail: "http://localhost:56324",
  ui: "http://localhost:9323",
};
const MOBILE_CONFIG = "e2e/mobile/playwright.config.ts";
// CLI chamado direto com node: os atalhos de node_modules/.bin gerados no Windows não rodam no Linux.
const PLAYWRIGHT = ["node", "node_modules/@playwright/test/cli.js", "test", "--config", MOBILE_CONFIG];
const REPORT = join(root, "e2e", "results", "report", "index.html");

function run(cmd, args, { allowFail = false, env } = {}) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  const options = { cwd: root, stdio: "inherit", env: { ...process.env, ...env } };
  // No Windows o npx é um .cmd e precisa de shell: monta a linha com aspas (argumentos fixos ou do próprio desenvolvedor).
  const quote = (a) => (/^[\w@%+=:,./*-]+$/.test(a) ? a : `"${a.replace(/"/g, '\\"')}"`);
  const r = isWindows ? spawnSync([cmd, ...args].map(quote).join(" "), { ...options, shell: true }) : spawnSync(cmd, args, options);
  if (r.error) throw r.error;
  if (r.status !== 0 && !allowFail) process.exit(r.status ?? 1);
  return r.status ?? 1;
}

/** Versão exata do @playwright/test: a imagem do container de simulação usa a mesma. */
function playwrightVersion() {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const v = pkg.devDependencies?.["@playwright/test"];
  if (!/^\d+\.\d+\.\d+$/.test(v ?? "")) {
    console.error(`@playwright/test deve ter versão exata no package.json (sem ^ ou ~). Encontrado: ${v}`);
    process.exit(1);
  }
  return v;
}

const compose = (args, opts) => run("docker", ["compose", ...args], { ...opts, env: { PLAYWRIGHT_VERSION: playwrightVersion(), ...opts?.env } });
const supabase = (args, opts) => run("npx", ["supabase", ...args], opts);

function ensureEnvFile() {
  if (existsSync(join(root, ".env"))) return;
  copyFileSync(join(root, ".env.example"), join(root, ".env"));
  console.log("Criado .env a partir de .env.example (valores locais de teste).");
}

function up() {
  ensureEnvFile();
  supabase(["start"]);
  compose(["up", "-d", "--build", "--wait", "app"]);
  console.log(`
Ambiente no ar:
  Site ............ ${URLS.site}
  Supabase Studio . ${URLS.studio}
  E-mails de teste  ${URLS.mail}
  Painel .......... ${URLS.site}/admin  (admin@barbearia.local / admin-local-123)
`);
}

function down() {
  compose(["--profile", "mobile", "down", "--remove-orphans"]);
  supabase(["stop"]);
}

function reset() {
  supabase(["db", "reset"]);
}

/** Garante o app no ar (sem rebuild) antes da simulação. */
function ensureApp() {
  ensureEnvFile();
  compose(["up", "-d", "--wait", "app"]);
}

/** Remove simulações anteriores que ficaram rodando (ex.: modo visual encerrado à força segura a porta 9323). */
function removeStaleMobile() {
  const r = spawnSync("docker", ["ps", "-aq", "--filter", "label=com.docker.compose.project=barbearia", "--filter", "label=com.docker.compose.service=mobile"], {
    encoding: "utf8",
  });
  const ids = (r.stdout ?? "").split(/s+/).filter(Boolean);
  if (ids.length) run("docker", ["rm", "-f", ...ids]);
}

function prepareMobile() {
  removeStaleMobile();
  reset();
  ensureApp();
}

function mobile(projectArgs, extra) {
  prepareMobile();
  const status = compose(["--profile", "mobile", "run", "--rm", "mobile", ...PLAYWRIGHT, ...projectArgs, ...extra], {
    allowFail: true,
  });
  console.log(`\nRelatório: npm run docker:report  (${REPORT})`);
  process.exit(status);
}

function mobileUi(extra) {
  prepareMobile();
  console.log(`\nModo visual da simulação: abra ${URLS.ui} no navegador (Ctrl+C para encerrar).\n`);
  const status = compose(
    ["--profile", "mobile", "run", "--rm", "mobile", ...PLAYWRIGHT, "--ui", "--ui-host=0.0.0.0", "--ui-port=9323", ...extra],
    { allowFail: true },
  );
  process.exit(status);
}

function report() {
  if (!existsSync(REPORT)) {
    console.error(`Relatório não encontrado em ${REPORT}. Rode antes: npm run docker:mobile`);
    process.exit(1);
  }
  const opener = isWindows ? ["cmd", ["/c", "start", "", REPORT]] : process.platform === "darwin" ? ["open", [REPORT]] : ["xdg-open", [REPORT]];
  spawnSync(opener[0], opener[1], { stdio: "ignore", detached: true });
  console.log(`Relatório aberto: ${REPORT}`);
}

const [command, ...extra] = process.argv.slice(2);
const commands = {
  up: () => up(),
  down: () => down(),
  reset: () => reset(),
  mobile: () => mobile([], extra),
  "mobile:android": () => mobile(["--project=android-*"], extra),
  "mobile:ios": () => mobile(["--project=ios-*"], extra),
  "mobile:ui": () => mobileUi(extra),
  report: () => report(),
};

if (!commands[command]) {
  console.error(`Comando desconhecido: ${command ?? "(nenhum)"}. Use: ${Object.keys(commands).join(", ")}`);
  process.exit(1);
}
commands[command]();
