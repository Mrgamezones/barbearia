import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Cores só via tokens da identidade (bg-surface, text-gold…): proíbe classes arbitrárias de cor
// como text-[#ff0000] ou bg-[rgb(...)] e cores hex soltas em componentes e páginas.
const ARBITRARY_COLOR =
  String.raw`/(^|[\s:])(bg|text|border|border-[trblxy]|ring|ring-offset|outline|fill|stroke|from|via|to|decoration|shadow|accent|caret|divide|placeholder)-\[(#|rgb|hsl|oklch|oklab|color:)/`;
const HEX_COLOR = String.raw`/#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/`;
const colorRules = [
  { selector: `Literal[value=${ARBITRARY_COLOR}]`, message: "Use os tokens de cor da identidade (ex.: text-gold, bg-surface) em vez de cor arbitrária." },
  { selector: `TemplateElement[value.raw=${ARBITRARY_COLOR}]`, message: "Use os tokens de cor da identidade (ex.: text-gold, bg-surface) em vez de cor arbitrária." },
  { selector: `Literal[value=${HEX_COLOR}]`, message: "Cor hex fora dos tokens: use as variáveis de app/globals.css." },
];

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    // manifest e viewport exigem a cor literal (não aceitam variáveis CSS).
    ignores: ["app/barbearia/[[]slug[]]/manifest.webmanifest/route.ts", "app/painel/[[]slug[]]/manifest.webmanifest/route.ts", "app/layout.tsx"],
    rules: { "no-restricted-syntax": ["error", ...colorRules] },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "public/sw.js",
      "public/swe-worker-*.js",
      "test-results/**",
      "playwright-report/**",
      "e2e/results/**",
    ],
  },
];

export default eslintConfig;
