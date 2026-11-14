import { cn } from "@/lib/cn";

/** "Rafael da Silva Costa" -> "RC"; "Rafael" -> "R". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => w.length > 2 || /^[A-ZÀ-Ý]/.test(w));
  if (!words.length) return "";
  const first = words[0][0];
  const last = words.length > 1 ? words.at(-1)![0] : "";
  return (first + last).toUpperCase();
}

/** Foto redonda do barbeiro ou, sem foto, as iniciais sobre fundo de cartão com borda dourada. */
export function Avatar({ name, src, size = 56, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const style = { width: size, height: size };
  if (src) {
    return (
      // A foto vem das configurações (URL externa qualquer); <img> evita exigir domínio liberado no next/image.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={`Foto de ${name}`} width={size} height={size} style={style} className={cn("shrink-0 rounded-full border border-gold object-cover", className)} />
    );
  }
  return (
    <span
      role="img"
      aria-label={`Iniciais de ${name}`}
      style={style}
      className={cn("flex shrink-0 items-center justify-center rounded-full border border-gold bg-card font-display text-2xl font-semibold text-gold", className)}
    >
      {initials(name)}
    </span>
  );
}
