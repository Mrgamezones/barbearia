import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Service } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/app/barbearia/[slug]/agendar/actions", () => ({ createBooking: vi.fn() }));
vi.mock("@/lib/availability", () => ({
  fetchAvailableDates: vi.fn(async () => [DAY]),
  fetchSlots: vi.fn(async () => [SLOT]),
}));

const { BookingFlow, deriveStep } = await import("./BookingFlow");

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const DAY = today; // yyyy-MM-dd: hoje (sempre no mês exibido inicialmente)
const SLOT = `${DAY}T13:00:00.000Z`;

const services: Service[] = [
  { id: "corte", name: "Corte de cabelo", description: "", price_cents: 4500, duration_min: 30, sort_order: 1, active: true, is_combo: false },
  { id: "barba", name: "Barba", description: "", price_cents: 3500, duration_min: 30, sort_order: 2, active: true, is_combo: false },
];

function mockViewport(desktop: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: desktop && query.includes("min-width: 1024px"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

const activeStep = () => screen.getByRole("list", { name: "Etapas do agendamento" }).querySelector('[aria-current="step"]')?.textContent;

describe("deriveStep", () => {
  it.each([
    [false, false, false, 1],
    [true, false, false, 2],
    [true, true, false, 3],
    [true, true, true, 4],
  ] as const)("serviço=%s horário=%s dados=%s → etapa %i", (s, h, d, expected) => expect(deriveStep(s, h, d)).toBe(expected));
});

describe("<BookingFlow> no desktop (≥ 1024 px)", () => {
  beforeEach(() => {
    mockViewport(true);
    window.history.replaceState(null, "", "/agendar");
  });

  it("mostra as quatro colunas e a etapa ativa do stepper acompanha o preenchimento", async () => {
    const user = userEvent.setup();
    render(<BookingFlow shopSlug="demonstracao" services={services} barber={{ name: "Rafael Moreira", bio: "12 anos de navalha.", photoUrl: null }} />);

    for (const name of ["Escolha o serviço", "Escolha a data e o horário", "Seus dados", "Resumo do agendamento"]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    }
    expect(screen.queryAllByRole("button", { name: "Continuar" }).every((b) => b.className.includes("lg:hidden"))).toBe(true);
    expect(activeStep()).toMatch(/^1Serviço/);

    await user.click(screen.getByRole("checkbox", { name: /^Corte de cabelo/ }));
    expect(activeStep()).toMatch(/^2Data e hora/);

    const day = await screen.findByRole("button", { name: new RegExp(`^\\w.+, ${Number(DAY.slice(8))} de`) });
    await user.click(day);
    await user.click(await screen.findByRole("button", { name: /\d\d:\d\d/, pressed: false }));
    expect(activeStep()).toMatch(/^3Seus dados/);

    await user.type(screen.getByLabelText("Nome"), "Maria Teste");
    await user.type(screen.getByLabelText("WhatsApp"), "(11) 91234-5678");
    expect(activeStep()).toMatch(/^4Confirmar/);

    const resumo = screen.getByRole("heading", { name: "Resumo do agendamento" }).closest("section")!;
    expect(within(resumo).getByTestId("summary-total")).toHaveTextContent("R$ 45,00");
    expect(within(resumo).getByText("Rafael Moreira")).toBeInTheDocument();
    expect(within(resumo).getByRole("button", { name: "Confirmar agendamento" })).toBeEnabled();
    // Cartão "Seu barbeiro" com iniciais (sem foto).
    expect(within(screen.getByTestId("barber-card")).getByRole("img", { name: "Iniciais de Rafael Moreira" })).toHaveTextContent("RM");
  });

  it("consentimento de WhatsApp vem marcado e desmarcar envia false", async () => {
    const { createBooking } = await import("@/app/barbearia/[slug]/agendar/actions");
    const create = vi.mocked(createBooking);
    create.mockReset();
    create.mockResolvedValue({ ok: true, token: "t".repeat(30) });
    const user = userEvent.setup();
    render(<BookingFlow shopSlug="demonstracao" services={services} barber={{ name: "Rafael Moreira", bio: "", photoUrl: null }} />);

    await user.click(screen.getByRole("checkbox", { name: /^Corte de cabelo/ }));
    await user.click(await screen.findByRole("button", { name: new RegExp(`^\\w.+, ${Number(DAY.slice(8))} de`) }));
    await user.click(await screen.findByRole("button", { name: /\d\d:\d\d/, pressed: false }));
    await user.type(screen.getByLabelText("Nome"), "Maria Teste");
    await user.type(screen.getByLabelText("WhatsApp"), "(11) 91234-5678");

    const optIn = screen.getByRole("checkbox", { name: "Receber confirmação e lembretes pelo WhatsApp" });
    expect(optIn).toBeChecked();
    await user.click(optIn);
    expect(optIn).not.toBeChecked();

    await user.click(screen.getByRole("button", { name: "Confirmar agendamento" }));
    expect(create).toHaveBeenCalledWith("demonstracao", expect.objectContaining({ phone: "(11) 91234-5678", whatsappOptIn: false }));
  });
});

describe("<BookingFlow> no celular", () => {
  beforeEach(() => {
    mockViewport(false);
    window.history.replaceState(null, "", "/agendar");
  });

  it("stepper segue a etapa atual (não o preenchimento) e o resumo fixo acompanha a seleção", async () => {
    const user = userEvent.setup();
    render(<BookingFlow shopSlug="demonstracao" services={services} />);
    await user.click(screen.getByRole("checkbox", { name: /^Corte de cabelo/ }));
    await user.click(screen.getByRole("checkbox", { name: /^Barba/ }));
    expect(activeStep()).toMatch(/^1Serviço/);
    expect(screen.getByTestId("bar-count")).toHaveTextContent("2 serviços");
    expect(screen.getByTestId("bar-duration")).toHaveTextContent("1h");
    expect(screen.getByTestId("bar-total")).toHaveTextContent("R$ 80,00");
    await act(async () => {
      await user.click(screen.getAllByRole("button", { name: "Continuar" })[0]);
    });
    expect(activeStep()).toMatch(/^2Data e hora/);
    expect(document.querySelector('[data-step="2"]')!.className).toMatch(/(^|\s)flex(\s|$)/);
    expect(document.querySelector('[data-step="1"]')!.className).toMatch(/(^|\s)hidden(\s|$)/);
  });
});
