import { expect, test } from "@playwright/test";
import { dispatchDueReminders, type PushSendResult, type Senders } from "../lib/notifications/dispatch";
import { insertAppointment } from "./helpers/booking";
import { adminDb } from "./helpers/db";
import { cleanupByPhone, testPhone } from "./helpers/slots";

// Integração do disparador com o banco local, usando envios falsos. Sem navegador.
test.describe("disparo de lembretes", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(() => test.info().project.name !== "desktop", "roda uma vez");

  const phones: string[] = [];
  test.afterAll(async () => cleanupByPhone(phones));

  function fakeSenders(push: PushSendResult = "sent") {
    const calls = { push: [] as string[], email: [] as string[] };
    const senders: Senders = {
      sendPush: async (sub, payload) => {
        calls.push.push(`${payload.appointmentId}:${sub.endpoint}`);
        return push;
      },
      sendEmail: async (msg) => {
        calls.email.push(msg.to);
        return { ok: true };
      },
    };
    return { senders, calls };
  }

  /** Agendamento com e-mail e push, com lembretes já vencidos. */
  async function seed(opts: { status?: string; offsetMinutes: number }) {
    const phone = testPhone();
    phones.push(phone);
    const startsAt = new Date(Date.now() + opts.offsetMinutes * 60_000);
    const { id } = await insertAppointment({ startsAt, phone, status: opts.status });
    const email = `lembrete-${phone.slice(-6)}@teste.local`;
    await adminDb().from("appointments").update({ customer_email: email }).eq("id", id);
    await adminDb().from("push_subscriptions").insert({ appointment_id: id, endpoint: `https://push.example/${id}`, p256dh: "k", auth: "a" });
    await adminDb()
      .from("reminders")
      .upsert(
        [
          { appointment_id: id, kind: "h2", channel: "email", send_at: new Date(Date.now() - 60_000).toISOString() },
          { appointment_id: id, kind: "h2", channel: "push", send_at: new Date(Date.now() - 60_000).toISOString() },
        ],
        { onConflict: "appointment_id,kind,channel" },
      );
    return { id, email };
  }

  // Cada agendamento em um horário diferente para não colidir na constraint de sobreposição.
  test("duas execuções seguidas enviam cada lembrete uma única vez", async () => {
    const a = await seed({ offsetMinutes: 110 });
    const { senders, calls } = fakeSenders();
    await Promise.all([dispatchDueReminders(adminDb(), senders), dispatchDueReminders(adminDb(), senders)]);
    await dispatchDueReminders(adminDb(), senders);
    expect(calls.email.filter((e) => e === a.email)).toHaveLength(1);
    expect(calls.push.filter((p) => p.startsWith(a.id))).toHaveLength(1);
    const { data } = await adminDb().from("reminders").select("sent_at").eq("appointment_id", a.id);
    expect(data!.every((r) => r.sent_at)).toBe(true);
  });

  test("agendamento cancelado não recebe lembrete", async () => {
    const a = await seed({ offsetMinutes: 170, status: "cancelled" });
    const { senders, calls } = fakeSenders();
    await dispatchDueReminders(adminDb(), senders);
    expect(calls.email).not.toContain(a.email);
    expect(calls.push.some((p) => p.startsWith(a.id))).toBe(false);
  });

  test("push expirado remove a inscrição e o e-mail é enviado normalmente", async () => {
    const a = await seed({ offsetMinutes: 230 });
    const { senders, calls } = fakeSenders("gone");
    const summary = await dispatchDueReminders(adminDb(), senders);
    expect(summary.removedSubscriptions).toBeGreaterThanOrEqual(1);
    expect(calls.email).toContain(a.email);
    const { count } = await adminDb().from("push_subscriptions").select("*", { count: "exact", head: true }).eq("appointment_id", a.id);
    expect(count).toBe(0);
  });

  test("falha temporária devolve o lembrete à fila", async () => {
    const a = await seed({ offsetMinutes: 290 });
    const { senders } = fakeSenders("error");
    await dispatchDueReminders(adminDb(), senders);
    const { data } = await adminDb().from("reminders").select("sent_at").eq("appointment_id", a.id).eq("channel", "push").single();
    expect(data!.sent_at).toBeNull();
  });

  test("WhatsApp pela rota do cron (dry-run): uma vez só e nunca para cancelado", async ({ request }) => {
    const due = new Date(Date.now() - 60_000).toISOString();
    const seedZap = async (offsetMinutes: number, status?: string) => {
      const phone = testPhone();
      phones.push(phone);
      const { id } = await insertAppointment({ startsAt: new Date(Date.now() + offsetMinutes * 60_000), phone, status, whatsappOptIn: true });
      await adminDb().from("reminders").upsert([{ appointment_id: id, kind: "h2", channel: "whatsapp", send_at: due }], { onConflict: "appointment_id,kind,channel" });
      return id;
    };
    const ativo = await seedZap(350);
    const cancelado = await seedZap(410, "cancelled");

    const cron = () => request.get("/api/cron/reminders", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
    expect((await cron()).status()).toBe(200);
    expect((await cron()).status()).toBe(200);

    const logs = async (id: string) =>
      (await adminDb().from("notification_log").select("kind,status").eq("appointment_id", id).eq("channel", "whatsapp")).data ?? [];
    expect(await logs(ativo)).toEqual([{ kind: "h2", status: "dry_run" }]);
    expect(await logs(cancelado)).toEqual([]);
    const { data } = await adminDb().from("reminders").select("sent_at").eq("appointment_id", ativo).eq("channel", "whatsapp").single();
    expect(data!.sent_at).not.toBeNull();
  });

  test("rota do cron exige o segredo", async ({ request }) => {
    expect((await request.get("/api/cron/reminders")).status()).toBe(401);
    expect((await request.get("/api/cron/reminders", { headers: { authorization: "Bearer errado" } })).status()).toBe(401);
    const ok = await request.get("/api/cron/reminders", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
    expect(ok.status()).toBe(200);
    expect(await ok.json()).toEqual(expect.objectContaining({ claimed: expect.any(Number), sent: expect.any(Number) }));
  });
});
