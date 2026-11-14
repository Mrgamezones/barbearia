// @vitest-environment node
import { describe, expect, it } from "vitest";
import { checkCustomer } from "./customer";
import { customerSchema, fieldErrors } from "./validation";

// O navegador valida com checkCustomer (sem zod) e o servidor com customerSchema: os dois precisam concordar.
const cases = [
  { name: "Maria", phone: "(11) 91234-5678", email: "" },
  { name: "M", phone: "(11) 91234-5678" },
  { name: "  ", phone: "1234" },
  { name: "x".repeat(81), phone: "+55 11 3123-4567" },
  { name: "João", phone: "11912345678", email: "joao@exemplo.com.br" },
  { name: "João", phone: "11912345678", email: "JOAO@Exemplo.COM" },
  { name: "João", phone: "11912345678", email: "joao@" },
  { name: "João", phone: "11912345678", email: "jo..ao@exemplo.com" },
  { name: "João", phone: "11912345678", email: "joao.silva+barba@ex-emplo.com" },
  { name: "João", phone: "0119123456", email: "a@b" },
  { name: "Ana Paula", phone: "(21) 2345-6789", email: "  ana@exemplo.com  " },
];

describe("checkCustomer × customerSchema", () => {
  for (const c of cases) {
    it(JSON.stringify(c), () => {
      const r = customerSchema.safeParse(c);
      const expected = r.success ? {} : fieldErrors(r.error);
      expect(checkCustomer(c)).toEqual(expected);
    });
  }
});
