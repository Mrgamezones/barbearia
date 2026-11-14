import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BusinessHour, BusinessSettings, Service } from "@/lib/types";
import { SiteFooter } from "./SiteFooter";

const settings: BusinessSettings = {
  name: "Barbearia Modelo",
  address: "Rua Exemplo, 100",
  whatsapp: "+5511999999999",
  about: "Frase curta.",
  timezone: "America/Sao_Paulo",
  hero_eyebrow: "",
  hero_title_line1: "",
  hero_title_line2: "",
  hero_subtitle: "",
  barber_name: "",
  barber_bio: "",
  barber_photo_url: "",
  instagram_url: "https://instagram.com/exemplo",
  email: "contato@exemplo.com",
};
const hours: BusinessHour[] = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  is_open: weekday >= 2,
  open_time: weekday >= 2 ? "09:00:00" : null,
  close_time: weekday >= 2 ? "19:00:00" : null,
  break_start: null,
  break_end: null,
}));
const services: Service[] = Array.from({ length: 7 }, (_, i) => ({
  id: `s${i}`,
  name: `Serviço ${i + 1}`,
  description: "",
  price_cents: 1000,
  duration_min: 30,
  sort_order: i,
  active: true,
  is_combo: false,
}));

describe("<SiteFooter>", () => {
  it("mostra o domingo fechado como \"Domingo — Fechado\" e os dias abertos com horário", () => {
    render(<SiteFooter settings={settings} hours={hours} services={services} />);
    const items = within(screen.getByTestId("footer-hours")).getAllByRole("listitem").map((li) => li.textContent);
    expect(items[0]).toBe("Domingo — Fechado");
    expect(items[1]).toBe("Segunda — Fechado");
    expect(items[2]).toBe("Terça — 09h às 19h");
    expect(items).toHaveLength(7);
  });

  it("lista até 5 serviços e \"Outros serviços\"", () => {
    render(<SiteFooter settings={settings} hours={hours} services={services} />);
    const links = within(screen.getByTestId("footer-services")).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["Serviço 1", "Serviço 2", "Serviço 3", "Serviço 4", "Serviço 5", "Outros serviços"]);
    expect(links.at(-1)).toHaveAttribute("href", "/servicos");
  });

  it("contato com telefone, e-mail e link de mapa; redes; copyright do ano atual e privacidade", () => {
    render(<SiteFooter settings={settings} hours={hours} services={services} />);
    expect(screen.getByRole("link", { name: /\(11\) 99999-9999/ })).toHaveAttribute("href", expect.stringContaining("wa.me/5511999999999"));
    expect(screen.getByRole("link", { name: /contato@exemplo.com/ })).toHaveAttribute("href", "mailto:contato@exemplo.com");
    expect(screen.getByRole("link", { name: /abrir no mapa/ })).toHaveAttribute("href", expect.stringContaining("google.com/maps"));
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute("href", "https://instagram.com/exemplo");
    expect(screen.getByRole("link", { name: "Conversar pelo WhatsApp" })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`© ${new Date().getFullYear()} Barbearia Modelo`))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Política de privacidade" })).toHaveAttribute("href", "/privacidade");
  });
});
