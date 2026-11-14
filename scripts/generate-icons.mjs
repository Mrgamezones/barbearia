// Gera os ícones do PWA a partir de assets/icon.svg.
// Uso: node scripts/generate-icons.mjs
import { mkdir, readFile } from "node:fs/promises";
import sharp from "sharp";

const BG = "#0b0b0c";
const svg = await readFile("assets/icon.svg");
await mkdir("public/icons", { recursive: true });

/** Ícone "any": a arte ocupa quase todo o quadro. */
async function plain(size, out) {
  await sharp(svg, { density: 300 }).resize(size, size).png().toFile(out);
}

/** Ícone "maskable": arte reduzida a ~60% para caber na zona segura (círculo de 80%). */
async function maskable(size, out) {
  const inner = Math.round(size * 0.6);
  const art = await sharp(svg, { density: 300 }).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: art, gravity: "center" }])
    .png()
    .toFile(out);
}

await plain(192, "public/icons/icon-192.png");
await plain(512, "public/icons/icon-512.png");
await maskable(512, "public/icons/icon-maskable-512.png");
await maskable(180, "public/icons/apple-touch-icon.png");
await plain(32, "public/icons/favicon-32.png");
console.log("Ícones gerados em public/icons/");
