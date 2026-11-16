// @vitest-environment node
import { describe, expect, it } from "vitest";
import { hoursByDay, hoursSummary } from "./hours";
import type { BusinessHour } from "./types";

const day = (weekday: number, open?: [string, string]): BusinessHour => ({
  weekday,
  is_open: !!open,
  open_time: open?.[0] ?? null,
  close_time: open?.[1] ?? null,
  break_start: null,
  break_end: null,
});

describe("horário de funcionamento", () => {
  const padrao = [day(0), day(1), ...[2, 3, 4, 5, 6].map((d) => day(d, ["09:00:00", "19:00:00"]))];

  it("agrupa dias contíguos", () => {
    expect(hoursSummary(padrao)).toBe("TER–SÁB: 9h às 19h");
  });

  it("lista dias não contíguos", () => {
    const h = [day(0), day(1, ["09:00:00", "18:00:00"]), day(2), day(3, ["09:00:00", "18:00:00"]), day(4), day(5), day(6, ["08:00:00", "12:30:00"])];
    expect(hoursSummary(h)).toBe("SEG, QUA: 9h às 18h · SÁB: 8h às 12h30");
  });

  it("mostra domingo fechado", () => {
    expect(hoursByDay(padrao)[0]).toEqual({ weekday: 0, label: "Domingo", text: "Fechado" });
  });
});
