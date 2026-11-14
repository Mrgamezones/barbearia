import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BusinessHour } from "@/lib/types";
import { HoursCard } from "./HoursCard";

const day = (weekday: number, open?: [string, string]): BusinessHour => ({
  weekday,
  is_open: !!open,
  open_time: open?.[0] ?? null,
  close_time: open?.[1] ?? null,
  break_start: null,
  break_end: null,
});

describe("<HoursCard>", () => {
  it("dias contíguos com o mesmo horário: \"Atendimento — TER–SÁB: 09h às 19h\"", () => {
    const hours = [0, 1, 2, 3, 4, 5, 6].map((d) => day(d, d >= 2 ? ["09:00:00", "19:00:00"] : undefined));
    render(<HoursCard hours={hours} />);
    expect(screen.getByTestId("hours-card")).toHaveTextContent("Atendimento — TER–SÁB: 09h às 19h");
    expect(screen.getByTestId("hours-card").querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("dias não contíguos são listados separadamente", () => {
    const hours = [day(0), day(1, ["09:00:00", "18:00:00"]), day(2), day(3, ["09:00:00", "18:00:00"]), day(4), day(5), day(6, ["08:00:00", "12:30:00"])];
    render(<HoursCard hours={hours} />);
    expect(screen.getByTestId("hours-card")).toHaveTextContent("Atendimento — SEG, QUA: 09h às 18h · SÁB: 08h às 12h30");
  });

  it("tudo fechado", () => {
    render(<HoursCard hours={[0, 1, 2, 3, 4, 5, 6].map((d) => day(d))} />);
    expect(screen.getByTestId("hours-card")).toHaveTextContent("Atendimento — Fechado");
  });
});
