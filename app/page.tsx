import { redirect } from "next/navigation";
import { DEMO_SLUG, shopPath } from "@/lib/paths";

/** A raiz do domínio mostra a barbearia de demonstração (usada para apresentar o sistema). */
export default function RootPage() {
  redirect(shopPath(DEMO_SLUG));
}
