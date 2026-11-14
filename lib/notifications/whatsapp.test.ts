// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { maskPhone, sendWhatsAppTemplate } from "./whatsapp";

const PHONE = "+5511999998888";
const msg = { to: PHONE, template: "agendamento_confirmado" as const, params: ["Maria", "Barbearia", "", "linha1\nlinha2"] };

const fetchMock = vi.fn();
const logs: string[] = [];

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  fetchMock.mockReset();
  logs.length = 0;
  vi.stubGlobal("fetch", fetchMock);
  for (const level of ["info", "error", "warn", "log"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });
  }
  vi.stubEnv("WHATSAPP_TOKEN", "tok_test");
  vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "123456");
  vi.stubEnv("WHATSAPP_API_VERSION", "v23.0");
  vi.stubEnv("WHATSAPP_TEMPLATE_LANG", "pt_BR");
});

afterEach(() => {
  // Nenhum log pode conter o número completo.
  for (const l of logs) expect(l).not.toContain("5511999998888");
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("maskPhone", () => {
  it("mostra só os 4 últimos dígitos", () => {
    expect(maskPhone(PHONE)).toBe("…8888");
    expect(maskPhone("12")).toBe("…");
  });
});

describe("sendWhatsAppTemplate", () => {
  it("sem credenciais apenas simula (dry-run)", async () => {
    vi.stubEnv("WHATSAPP_TOKEN", "");
    expect(await sendWhatsAppTemplate(msg)).toEqual({ status: "dry_run" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logs.some((l) => l.includes("dry-run") && l.includes("…8888"))).toBe(true);
  });

  it("envia o modelo para a Graph API e devolve o wamid", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { messages: [{ id: "wamid.ABC" }] }));
    expect(await sendWhatsAppTemplate(msg)).toEqual({ status: "sent", id: "wamid.ABC" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://graph.facebook.com/v23.0/123456/messages");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok_test");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ messaging_product: "whatsapp", to: "5511999998888", type: "template" });
    expect(body.template.name).toBe("agendamento_confirmado");
    expect(body.template.language).toEqual({ code: "pt_BR" });
    // Parâmetro vazio vira "—" e quebra de linha vira espaço.
    expect(body.template.components[0].parameters.map((p: { text: string }) => p.text)).toEqual(["Maria", "Barbearia", "—", "linha1 linha2"]);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("HTTP 429 é temporário", async () => {
    fetchMock.mockResolvedValue(jsonResponse(429, { error: { code: 130429, message: "Rate limit hit" } }));
    expect(await sendWhatsAppTemplate(msg)).toMatchObject({ status: "temporary", error: expect.stringContaining("130429") });
  });

  it("HTTP 500 é temporário", async () => {
    fetchMock.mockResolvedValue(new Response("oops", { status: 500, statusText: "Internal Server Error" }));
    expect(await sendWhatsAppTemplate(msg)).toMatchObject({ status: "temporary" });
  });

  it("código de limite da Meta com HTTP 400 é temporário", async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { error: { code: 131056, message: "pair rate limit" } }));
    expect(await sendWhatsAppTemplate(msg)).toMatchObject({ status: "temporary" });
  });

  it("timeout ou erro de rede é temporário", async () => {
    fetchMock.mockRejectedValue(new DOMException("The operation was aborted due to timeout", "TimeoutError"));
    expect(await sendWhatsAppTemplate(msg)).toMatchObject({ status: "temporary", error: expect.stringContaining("TimeoutError") });
  });

  it("131026 (número não pode receber) é permanente", async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { error: { code: 131026, message: "Message undeliverable" } }));
    expect(await sendWhatsAppTemplate(msg)).toEqual({ status: "permanent", error: "131026: Message undeliverable" });
  });

  it("132001 (modelo inexistente) é permanente e usa o detalhe da Meta", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(404, { error: { code: 132001, message: "Template name does not exist", error_data: { details: "template agendamento_confirmado not found" } } }),
    );
    expect(await sendWhatsAppTemplate(msg)).toEqual({ status: "permanent", error: "132001: template agendamento_confirmado not found" });
  });
});
