/** Aparelhos emulados. A ordem define o índice de cada aparelho (dados próprios por índice, ver helpers.ts). */
export const MOBILE_DEVICES = [
  { project: "android-pixel-7", device: "Pixel 7", platform: "android" },
  { project: "android-galaxy-s9", device: "Galaxy S9+", platform: "android" },
  { project: "ios-iphone-15", device: "iPhone 15", platform: "ios" },
  { project: "ios-iphone-se", device: "iPhone SE", platform: "ios" },
] as const;

export type MobileProject = (typeof MOBILE_DEVICES)[number]["project"];

/** Declarado no README e anotado em cada cenário do relatório HTML. */
export const EMULATION_LIMITATIONS =
  "Emulação de navegador (Chromium para Android, WebKit do Playwright para iOS): reproduz tela, densidade, toque, user agent, idioma e fuso, " +
  "mas NÃO substitui aparelho real para instalação do PWA no iOS, notificações push e particularidades do Safari (WebKit do Playwright ≠ Safari do iOS).";
