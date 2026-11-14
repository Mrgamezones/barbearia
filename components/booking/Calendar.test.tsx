import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Calendar } from "./Calendar";

// Novembro de 2026 começa num domingo.
const available = new Set(["2026-11-10", "2026-11-11", "2026-11-13", "2026-11-17", "2026-11-24"]);

function setup(selected: string | null = null) {
  const onSelect = vi.fn();
  render(
    <Calendar month="2026-11-01" onMonthChange={() => {}} minDate="2026-11-09" maxDate="2026-12-09" available={available} selected={selected} onSelect={onSelect} />,
  );
  const day = (d: number) => document.querySelector<HTMLButtonElement>(`button[data-day="2026-11-${String(d).padStart(2, "0")}"]`)!;
  return { onSelect, day };
}

describe("<Calendar>", () => {
  it("usa o padrão grid com domingo na primeira coluna", () => {
    setup();
    const grid = screen.getByRole("grid", { name: "Escolha a data" });
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"]);
    expect(grid.querySelectorAll('[role="row"]').length).toBeGreaterThanOrEqual(6);
    // Dia 1 (domingo) na primeira célula da primeira semana.
    const firstWeek = grid.querySelectorAll('[role="row"]')[1];
    expect(firstWeek.querySelector("button")?.dataset.day).toBe("2026-11-01");
  });

  it("indisponíveis ficam desabilitados e com rótulo de indisponível", () => {
    const { day } = setup();
    expect(day(12)).toBeDisabled();
    expect(day(12)).toHaveAccessibleName(/indisponível/);
    expect(day(10)).toBeEnabled();
  });

  it("uma única parada de Tab: o primeiro dia disponível (ou o selecionado)", async () => {
    const { day } = setup();
    await userEvent.tab();
    await userEvent.tab();
    // "Mês anterior" está desabilitado (fora da janela): o 1º Tab vai para "Próximo mês", o 2º para a grade.
    expect(document.activeElement).toBe(day(10));
    expect([...document.querySelectorAll('button[data-day][tabindex="0"]')]).toHaveLength(1);
  });

  it("setas andam entre dias disponíveis (pulando indisponíveis) e Enter seleciona", async () => {
    const { day, onSelect } = setup();
    day(10).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(day(11));
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(day(13)); // pula o dia 12, indisponível
    await userEvent.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(day(11));
    await userEvent.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(day(11)); // semana anterior sem dia disponível: fica
    day(10).focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(day(17));
    await userEvent.keyboard("{End}");
    expect(document.activeElement).toBe(day(24));
    await userEvent.keyboard("{Home}");
    expect(document.activeElement).toBe(day(10));
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith("2026-11-10");
  });

  it("selecionado fica em círculo dourado e é a parada de Tab", () => {
    const { day } = setup("2026-11-17");
    expect(day(17).className).toMatch(/bg-gold/);
    expect(day(17)).toHaveAttribute("aria-pressed", "true");
    expect(day(17)).toHaveAttribute("tabindex", "0");
    expect(day(10)).toHaveAttribute("tabindex", "-1");
  });
});
