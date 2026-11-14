// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrast } from "./contrast";

const css = readFileSync(path.join(__dirname, "..", "app", "globals.css"), "utf8");
const root = css.slice(css.indexOf(":root"), css.indexOf("}", css.indexOf(":root")));

function token(name: string): string {
  const m = root.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token --color-${name} não encontrado em :root`);
  return m[1].toLowerCase();
}

describe("tokens da identidade", () => {
  it("usa exatamente a paleta da spec", () => {
    expect({
      bg: token("bg"),
      surface: token("surface"),
      card: token("card"),
      border: token("border"),
      text: token("text"),
      muted: token("muted"),
      gold: token("gold"),
      goldHover: token("gold-hover"),
      onGold: token("on-gold"),
    }).toEqual({
      bg: "#0b0b0c",
      surface: "#141416",
      card: "#1b1b1e",
      border: "#2a2a2e",
      text: "#f4f1ea",
      muted: "#a39f97",
      gold: "#c8a165",
      goldHover: "#d8b57e",
      onGold: "#0b0b0c",
    });
  });

  it("tema escuro único (color-scheme: dark, sem variante clara)", () => {
    expect(root).toMatch(/color-scheme:\s*dark/);
    expect(css).not.toMatch(/prefers-color-scheme/);
  });

  const backgrounds = ["bg", "surface", "card"];
  const texts = ["text", "muted", "gold", "gold-hover", "danger", "success"];
  for (const bg of backgrounds) {
    for (const fg of texts) {
      it(`${fg} sobre ${bg} ≥ 4,5:1`, () => {
        expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  for (const bg of ["gold", "gold-hover"]) {
    it(`texto escuro sobre ${bg} (botão sólido) ≥ 4,5:1`, () => {
      expect(contrast(token("on-gold"), token(bg))).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("raios de 8 e 12 px", () => {
    expect(root).toMatch(/--radius-sm:\s*8px/);
    expect(root).toMatch(/--radius-md:\s*12px/);
  });
});
