/** Luminância relativa (WCAG 2.x) de uma cor "#rrggbb" ou de componentes RGB 0–255. */
export function luminance(color: string | [number, number, number]): number {
  const rgb = typeof color === "string" ? [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16)) : color;
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste WCAG entre duas cores. */
export function contrast(a: string | [number, number, number], b: string | [number, number, number]): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
