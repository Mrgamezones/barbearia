import { Scissors } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

/** Separa o nome para a marca: 2+ palavras → primeira palavra pequena acima, restante em destaque. */
export function splitBrandName(name: string): { top: string | null; main: string } {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return { top: null, main: words[0] ?? "" };
  return { top: words[0], main: words.slice(1).join(" ") };
}

/** Marca: tesoura dourada + nome em serifada caixa alta. */
export function Brand({ name, className, href = "/" }: { name: string; className?: string; href?: string }) {
  const { top, main } = splitBrandName(name);
  return (
    <Link href={href} className={cn("inline-flex min-h-11 items-center gap-2 text-text sm:gap-3", className)} aria-label={`${name} — início`}>
      <Scissors aria-hidden className="size-6 shrink-0 -rotate-45 text-gold sm:size-7" strokeWidth={1.5} />
      <span className="flex flex-col leading-none">
        {top ? <span className="text-[0.65rem] font-medium uppercase tracking-[0.25em] text-muted">{top}</span> : null}
        {top ? " " : null}
        <span className="font-display text-2xl font-semibold uppercase tracking-[0.08em]">{main}</span>
      </span>
    </Link>
  );
}
