// @vitest-environment node
import { describe, expect, it } from "vitest";
import { centsToInput, parseBRL } from "./money";

describe("parseBRL", () => {
  it.each([
    ["45", 4500],
    ["45,5", 4550],
    ["45,50", 4550],
    ["R$ 45,00", 4500],
    ["1.234,56", 123456],
    ["0", 0],
  ])("%s → %i", (input, cents) => expect(parseBRL(input)).toBe(cents));

  it.each(["", "abc", "-5", "45,555", "4.5"])("rejeita %s", (input) => expect(parseBRL(input)).toBeNull());
});

it("centsToInput", () => {
  expect(centsToInput(4500)).toBe("45,00");
  expect(centsToInput(123456)).toBe("1234,56");
});
