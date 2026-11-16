import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminNav } from "./AdminNav";
import { SettingsForm } from "./SettingsForm";

vi.mock("next/navigation", () => ({
  useParams: () => ({ slug: "demir-barbershop" }),
  usePathname: () => "/painel/demir-barbershop/servicos",
}));
const saveSettings = vi.fn();
vi.mock("@/app/painel/[slug]/config/actions", () => ({ saveSettings: (...a: unknown[]) => saveSettings(...a) }));

const initial = {
  name: "Demir Barbershop",
  street: "Rua Abaré",
  number: "2",
  complement: "",
  district: "",
  city: "",
  state: "",
  postal_code: "",
  whatsapp: "",
  email: "",
  instagram_url: "",
  about: "",
  hero_eyebrow: "",
  hero_title_line1: "",
  hero_title_line2: "",
  hero_subtitle: "",
  barber_name: "",
  barber_bio: "",
  barber_photo_url: "",
};

describe("<SettingsForm>", () => {
  it("mostra o endereço em campos separados e salva na barbearia do painel", async () => {
    saveSettings.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<SettingsForm initial={initial} />);

    expect(screen.getByLabelText("Logradouro")).toHaveValue("Rua Abaré");
    expect(screen.getByLabelText("Número")).toHaveValue("2");
    await user.type(screen.getByLabelText("Bairro"), "Centro");
    await user.type(screen.getByLabelText("UF"), "ba");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(saveSettings).toHaveBeenCalledWith("demir-barbershop", expect.objectContaining({ street: "Rua Abaré", number: "2", district: "Centro", state: "ba" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Configurações salvas.");
  });

  it("mostra o erro de validação no campo", async () => {
    saveSettings.mockResolvedValue({ ok: false, fields: { postal_code: "O CEP tem 8 números, ex.: 40000-000." } });
    const user = userEvent.setup();
    render(<SettingsForm initial={initial} />);
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("O CEP tem 8 números, ex.: 40000-000.")).toBeInTheDocument();
  });
});

describe("<AdminNav>", () => {
  it("links do painel da barbearia, com a seção atual marcada", () => {
    render(<AdminNav slug="demir-barbershop" />);
    expect(screen.getByRole("link", { name: "Agenda" })).toHaveAttribute("href", "/painel/demir-barbershop");
    expect(screen.getByRole("link", { name: "Configurações" })).toHaveAttribute("href", "/painel/demir-barbershop/config");
    expect(screen.getByRole("link", { name: "Serviços" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Agenda" })).not.toHaveAttribute("aria-current");
  });
});
