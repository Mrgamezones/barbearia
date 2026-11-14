// Sobe o servidor Next em uma porta, verifica as URLs informadas e encerra o processo filho.
// Uso: node scripts/smoke.mjs <start|dev> <porta> <caminho> [caminho...]
import { spawn } from "node:child_process";
const [mode = "start", port = "3100", ...paths] = process.argv.slice(2);
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", mode, "-p", port], { stdio: ["ignore", "pipe", "pipe"], env: process.env });
let log = "";
child.stdout.on("data", (d) => (log += d));
child.stderr.on("data", (d) => (log += d));
const stop = (code) => { child.kill(); setTimeout(() => process.exit(code), 300); };
const deadline = Date.now() + 90_000;
async function main() {
  const targets = paths.length ? paths : ["/"];
  for (;;) {
    try { await fetch(`http://localhost:${port}/`); break; } catch {}
    if (Date.now() > deadline) { console.error("timeout\n" + log); return stop(1); }
    await new Promise((r) => setTimeout(r, 1000));
  }
  let fail = 0;
  for (const p of targets) {
    const res = await fetch(`http://localhost:${port}${p}`, { redirect: "manual" });
    console.log(res.status, p);
    if (res.status >= 500) fail = 1;
  }
  stop(fail);
}
main();
