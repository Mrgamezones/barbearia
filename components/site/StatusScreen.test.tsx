import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ErrorPage from "@/app/error";

describe("página de erro", () => {
  it("usa a identidade (marca, eyebrow, título serifado) e permite tentar de novo", async () => {
    const reset = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorPage error={Object.assign(new Error("x"), { digest: "abc123" })} reset={reset} />);
    expect(screen.getByRole("link", { name: "Barbearia — início" })).toBeInTheDocument();
    expect(screen.getByText("Algo deu errado").className).toMatch(/eyebrow/);
    expect(screen.getByRole("heading", { level: 1, name: "Não foi possível carregar" }).className).toMatch(/title-display/);
    expect(screen.getByText(/Código: abc123/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(reset).toHaveBeenCalled();
  });
});
