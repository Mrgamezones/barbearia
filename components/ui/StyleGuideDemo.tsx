"use client";
import { useState } from "react";
import { SelectableCard } from "./SelectableCard";

/** Demonstração interativa dos cartões selecionáveis no guia de estilo. */
export function StyleGuideDemo() {
  const [selected, setSelected] = useState<string[]>(["corte"]);
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  return (
    <div className="grid gap-3 md:grid-cols-2" role="group" aria-label="Exemplo de seleção">
      <SelectableCard selected={selected.includes("corte")} onToggle={() => toggle("corte")} title="Corte de cabelo" subtitle="R$ 45,00 · 30 min" />
      <SelectableCard selected={selected.includes("barba")} onToggle={() => toggle("barba")} title="Barba" subtitle="R$ 35,00 · 30 min" />
    </div>
  );
}
