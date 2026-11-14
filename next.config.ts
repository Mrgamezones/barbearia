import path from "node:path";
import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Em desenvolvimento o service worker atrapalha o hot reload.
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [{ url: "/offline", revision: "1" }],
});

const nextConfig: NextConfig = {
  // Build autocontido para a imagem Docker (.next/standalone/server.js).
  output: "standalone",
  // Evita que o Next use um package-lock.json de uma pasta acima como raiz do projeto.
  outputFileTracingRoot: path.join(__dirname),
};

export default withSerwist(nextConfig);
