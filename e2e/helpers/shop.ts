import { adminDb } from "./db";

/** Barbearia em que os testes E2E rodam: mesma vitrine da demonstração, com notificações ligadas. */
export const SHOP = "barbearia-teste";
export const SHOP_NAME = "Barbearia Teste";
/** Barbearia de demonstração (raiz do domínio; não envia notificações). */
export const DEMO = "demonstracao";

/** "/barbearia/barbearia-teste" ou "/barbearia/barbearia-teste/agendar". */
export function site(sub = "", slug = SHOP): string {
  return `/barbearia/${slug}${sub ? `/${sub.replace(/^\//, "")}` : ""}`;
}

/** "/painel/barbearia-teste" ou "/painel/barbearia-teste/servicos". */
export function panel(sub = "", slug = SHOP): string {
  return `/painel/${slug}${sub ? `/${sub.replace(/^\//, "")}` : ""}`;
}

/** Escapa um caminho para usar em RegExp (toHaveURL). */
export function re(path: string): string {
  return path.replace(/[.*+?^${}()|[\]\/]/g, "\$&");
}

const ids = new Map<string, string>();
/** id da barbearia pelo slug (para filtros e inserts diretos no banco). */
export async function shopId(slug = SHOP): Promise<string> {
  if (!ids.has(slug)) {
    const { data, error } = await adminDb().from("shops").select("id").eq("slug", slug).single();
    if (error) throw error;
    ids.set(slug, data.id as string);
  }
  return ids.get(slug)!;
}
