/** "45", "45,5", "45,50", "1.234,56", "R$ 45,00" → centavos. Retorna null se inválido. */
export function parseBRL(input: string): number | null {
  const clean = input.replace(/R\$\s?/i, "").replace(/\s/g, "");
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(clean)) return null;
  const [int, dec = ""] = clean.replace(/\./g, "").split(",");
  return Number(int) * 100 + Number(dec.padEnd(2, "0"));
}

/** 4500 → "45,00" (para campos de formulário). */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
