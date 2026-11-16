import { shopPath } from "@/lib/paths";

/** Itens de navegação do cabeçalho e do rodapé (âncoras da página inicial da barbearia). */
export function navItems(slug: string) {
  const home = shopPath(slug);
  return [
    { label: "Início", href: `${home}#inicio` },
    { label: "Serviços", href: `${home}#servicos` },
    { label: "Galeria", href: `${home}#galeria` },
    { label: "Contato", href: `${home}#contato` },
  ];
}
