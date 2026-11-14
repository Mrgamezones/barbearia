import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "solid" | "outline" | "ghost";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-5 text-sm font-semibold uppercase tracking-[0.08em] transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const variants: Record<Variant, string> = {
  solid: "bg-gold text-on-gold hover:bg-gold-hover",
  outline: "border border-gold text-gold hover:bg-gold/10",
  ghost: "text-text hover:bg-card normal-case tracking-normal font-medium",
};

export function buttonClasses(variant: Variant = "solid", className?: string) {
  return cn(base, variants[variant], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "solid", className, type = "button", ...props },
  ref,
) {
  return <button ref={ref} type={type} className={buttonClasses(variant, className)} {...props} />;
});

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant };

export function ButtonLink({ variant = "solid", className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, className)} {...props} />;
}
