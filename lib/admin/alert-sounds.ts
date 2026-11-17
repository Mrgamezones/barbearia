/**
 * Toques do painel: tocados pela própria página (Web Audio) quando chega um aviso com o painel aberto.
 * Gerados por oscilador: sem arquivos de áudio, licenças nem cache. A escolha é por aparelho (localStorage).
 * Com o painel fechado ou o aparelho bloqueado, toca o som de notificação do sistema (o site não escolhe).
 */

export const ALERT_SOUNDS = [
  { id: "campainha", label: "Campainha" },
  { id: "sino", label: "Sino" },
  { id: "bipe", label: "Bipe triplo" },
  { id: "silencioso", label: "Silencioso" },
] as const;

export type AlertSoundId = (typeof ALERT_SOUNDS)[number]["id"];

export const DEFAULT_ALERT_SOUND: AlertSoundId = "campainha";
export const ALERT_SOUND_KEY = "toque-painel";

function isSoundId(v: unknown): v is AlertSoundId {
  return ALERT_SOUNDS.some((s) => s.id === v);
}

/** Toque escolhido neste aparelho; "Campainha" se nada foi escolhido ou o armazenamento estiver bloqueado. */
export function readAlertSound(storage: Pick<Storage, "getItem"> | null | undefined = globalThis.localStorage): AlertSoundId {
  try {
    const v = storage?.getItem(ALERT_SOUND_KEY);
    return isSoundId(v) ? v : DEFAULT_ALERT_SOUND;
  } catch {
    return DEFAULT_ALERT_SOUND;
  }
}

/** Grava o toque; devolve false se o armazenamento estiver bloqueado (a escolha vale só nesta visita). */
export function writeAlertSound(id: AlertSoundId, storage: Pick<Storage, "setItem"> | null | undefined = globalThis.localStorage): boolean {
  try {
    storage?.setItem(ALERT_SOUND_KEY, id);
    return !!storage;
  } catch {
    return false;
  }
}

/** Sequência de notas de cada toque: [frequência Hz, início s, duração s, tipo de onda]. */
type Note = [number, number, number, OscillatorType];
const PATTERNS: Record<Exclude<AlertSoundId, "silencioso">, Note[]> = {
  campainha: [
    [880, 0, 0.18, "sine"],
    [659, 0.2, 0.32, "sine"],
  ],
  sino: [
    [1318, 0, 1.2, "sine"],
    [1975, 0, 0.6, "sine"],
  ],
  bipe: [
    [1046, 0, 0.09, "square"],
    [1046, 0.15, 0.09, "square"],
    [1046, 0.3, 0.09, "square"],
  ],
};

let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  return ctx;
}

/** Destrava o áudio (chamar num toque/clique do usuário: exigência dos navegadores, principalmente no iOS). */
export async function unlockAudio(): Promise<boolean> {
  const c = audioContext();
  if (!c) return false;
  if (c.state === "suspended") await c.resume().catch(() => undefined);
  return c.state === "running";
}

/** O navegador está bloqueando o som até o próximo toque na página? */
export function audioBlocked(): boolean {
  const c = audioContext();
  return !!c && c.state !== "running";
}

/** Toca o toque; devolve false se o som estiver bloqueado ou indisponível. "Silencioso" não toca nada. */
export async function playAlertSound(id: AlertSoundId): Promise<boolean> {
  if (id === "silencioso") return true;
  const c = audioContext();
  if (!c) return false;
  if (c.state === "suspended") await c.resume().catch(() => undefined);
  if (c.state !== "running") return false;
  const t0 = c.currentTime + 0.02;
  for (const [freq, start, dur, type] of PATTERNS[id]) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const peak = type === "square" ? 0.08 : 0.25;
    gain.gain.setValueAtTime(0.0001, t0 + start);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0 + start);
    osc.stop(t0 + start + dur + 0.05);
  }
  return true;
}
