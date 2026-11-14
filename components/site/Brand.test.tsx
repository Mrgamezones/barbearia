import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Brand, splitBrandName } from "./Brand";

describe("splitBrandName", () => {
  it("nome de uma palavra fica numa linha só", () => {
    expect(splitBrandName("Navalha")).toEqual({ top: null, main: "Navalha" });
  });
  it("nome de várias palavras: a primeira vai acima, o resto em destaque", () => {
    expect(splitBrandName("Barbearia Dom Pedro")).toEqual({ top: "Barbearia", main: "Dom Pedro" });
  });
  it("ignora espaços extras", () => {
    expect(splitBrandName("  Barbearia   Modelo ")).toEqual({ top: "Barbearia", main: "Modelo" });
  });
});

describe("<Brand>", () => {
  it("uma palavra: só o nome principal, em serifada caixa alta, com tesoura dourada", () => {
    const { container } = render(<Brand name="Navalha" />);
    const link = screen.getByRole("link", { name: "Navalha — início" });
    expect(link).toHaveAttribute("href", "/");
    const main = screen.getByText("Navalha");
    expect(main.className).toMatch(/font-display/);
    expect(main.className).toMatch(/uppercase/);
    expect(link.querySelectorAll(":scope > span > span")).toHaveLength(1);
    const icon = container.querySelector("svg");
    expect(icon?.getAttribute("class")).toMatch(/text-gold/);
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("várias palavras: duas linhas", () => {
    render(<Brand name="Barbearia Dom Pedro" />);
    expect(screen.getByText("Barbearia")).toBeInTheDocument();
    expect(screen.getByText("Dom Pedro").className).toMatch(/font-display/);
    expect(screen.getByRole("link").querySelectorAll(":scope > span > span")).toHaveLength(2);
  });
});
