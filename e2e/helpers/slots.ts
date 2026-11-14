import { formatInTimeZone } from "date-fns-tz";
import { adminDb } from "./db";

const TZ = "America/Sao_Paulo";

export function localDate(offsetDays: number): string {
  return formatInTimeZone(new Date(Date.now() + offsetDays * 86_400_000), TZ, "yyyy-MM-dd");
}

/** Retorna um horário livre (ISO) a partir de `minOffsetDays`, escolhendo o slot de índice `pick`. */
export async function findFreeSlot(durationMin: number, { minOffsetDays = 3, pick = 0 } = {}): Promise<{ date: string; slot: string }> {
  for (let d = minOffsetDays; d <= 30; d++) {
    const date = localDate(d);
    const { data, error } = await adminDb().rpc("get_available_slots", { p_date: date, p_total_minutes: durationMin });
    if (error) throw error;
    const slots = (data as { slot: string }[]).map((r) => r.slot);
    if (slots.length > pick) return { date, slot: slots[pick] };
  }
  throw new Error("Nenhum horário livre encontrado nos próximos 30 dias");
}

export async function serviceId(name: string): Promise<string> {
  const { data, error } = await adminDb().from("services").select("id").eq("name", name).single();
  if (error) throw error;
  return data.id as string;
}

/** Telefone de teste único (celular SP). */
export function testPhone(): string {
  const n = String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
  return `+55119${n}`;
}

export async function cleanupByPhone(phones: string[]) {
  if (phones.length) await adminDb().from("appointments").delete().in("customer_phone", phones);
}
