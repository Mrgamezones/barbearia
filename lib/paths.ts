/** Endereços por barbearia: o site público fica em /barbearia/<slug> e o painel em /painel/<slug>. */

/** "/barbearia/demir-barbershop" ou "/barbearia/demir-barbershop/agendar". */
export function shopPath(slug: string, sub = ""): string {
  return `/barbearia/${slug}${sub ? `/${sub.replace(/^\//, "")}` : ""}`;
}

/** Link de gerenciamento de um agendamento: "/barbearia/<slug>/agendamento/<token>". */
export function bookingPath(slug: string, token: string): string {
  return shopPath(slug, `agendamento/${encodeURIComponent(token)}`);
}

/** "/painel/demir-barbershop" ou "/painel/demir-barbershop/servicos". */
export function panelPath(slug: string, sub = ""): string {
  return `/painel/${slug}${sub ? `/${sub.replace(/^\//, "")}` : ""}`;
}

/** Slug da barbearia de demonstração, para onde a raiz do domínio redireciona. */
export const DEMO_SLUG = "demonstracao";
