import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar, initials } from "./Avatar";

describe("initials", () => {
  it.each([
    ["Rafael", "R"],
    ["Rafael Costa", "RC"],
    ["Rafael da Silva Costa", "RC"],
    ["  joão  pedro ", "JP"],
    ["", ""],
  ])("%s → %s", (name, expected) => expect(initials(name)).toBe(expected));
});

describe("<Avatar>", () => {
  it("sem foto mostra as iniciais com borda dourada", () => {
    render(<Avatar name="Rafael Costa" />);
    const el = screen.getByRole("img", { name: "Iniciais de Rafael Costa" });
    expect(el).toHaveTextContent("RC");
    expect(el.className).toMatch(/border-gold/);
  });
  it("com foto mostra a imagem", () => {
    render(<Avatar name="Rafael" src="https://exemplo.com/r.jpg" />);
    expect(screen.getByRole("img", { name: "Foto de Rafael" })).toHaveAttribute("src", "https://exemplo.com/r.jpg");
  });
});
