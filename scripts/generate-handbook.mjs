// Gera docs/vendas/apostila-vendas.pdf a partir de docs/vendas/apostila.html.
// Uso: npm run handbook:pdf
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "docs/vendas/apostila.html");
const output = resolve(root, "docs/vendas/apostila-vendas.pdf");

if (!existsSync(source)) {
  console.error(`Fonte não encontrada: ${source}`);
  process.exit(1);
}

let sections = 0;
let tooTall = [];
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const missing = [];
  page.on("requestfailed", (r) => missing.push(r.url()));
  await page.goto(pathToFileURL(source).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);

  const broken = await page.evaluate(() =>
    [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute("src")),
  );
  if (broken.length || missing.length) {
    console.error("Imagens que não carregaram:", [...new Set([...broken, ...missing])].join(", "));
    process.exitCode = 1;
  }

  // Mede as seções no layout de impressão (área útil da página A4: 263 mm de altura).
  await page.setViewportSize({ width: 680, height: 994 });
  await page.emulateMedia({ media: "print" });
  const heights = await page.evaluate(() =>
    [...document.querySelectorAll("section")].map((s) => ({
      title: s.querySelector("h1,h2")?.textContent?.trim() ?? "",
      mm: Math.round((s.getBoundingClientRect().height * 25.4) / 96),
      cover: s.classList.contains("capa"),
    })),
  );
  sections = heights.length;
  tooTall = heights.filter((h) => !h.cover && h.mm > 263).map((h) => `${h.title} (${h.mm} mm)`);

  await page.pdf({
    path: output,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
  });
} finally {
  await browser.close();
}

const kb = Math.round(statSync(output).size / 1024);
const pages = (readFileSync(output, "latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
console.log(`PDF gerado: ${output} (${pages} páginas, ${kb} KB)`);

// Cada seção foi pensada para caber em uma página; o sumário depende disso.
if (pages !== sections) {
  console.error(`Atenção: ${sections} seções viraram ${pages} páginas. Seções que passam de uma página:`);
  for (const t of tooTall) console.error(`  - ${t}`);
  process.exitCode = 1;
}
