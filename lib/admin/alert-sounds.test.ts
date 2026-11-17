import { describe, expect, it } from "vitest";
import { ALERT_SOUNDS, ALERT_SOUND_KEY, DEFAULT_ALERT_SOUND, playAlertSound, readAlertSound, writeAlertSound } from "./alert-sounds";

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

const blocked = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("SecurityError");
  },
};

describe("toque do painel", () => {
  it("tem 3 sons e o silencioso; o padrão é a campainha", () => {
    expect(ALERT_SOUNDS.map((s) => s.label)).toEqual(["Campainha", "Sino", "Bipe triplo", "Silencioso"]);
    expect(DEFAULT_ALERT_SOUND).toBe("campainha");
  });

  it("grava e lê a escolha do aparelho", () => {
    const s = memoryStorage();
    expect(readAlertSound(s)).toBe("campainha");
    expect(writeAlertSound("sino", s)).toBe(true);
    expect(s.getItem(ALERT_SOUND_KEY)).toBe("sino");
    expect(readAlertSound(s)).toBe("sino");
  });

  it("valor desconhecido volta ao padrão", () => {
    const s = memoryStorage();
    s.setItem(ALERT_SOUND_KEY, "buzina");
    expect(readAlertSound(s)).toBe("campainha");
  });

  it("tolera armazenamento bloqueado ou ausente", () => {
    expect(readAlertSound(blocked)).toBe("campainha");
    expect(writeAlertSound("bipe", blocked)).toBe(false);
    expect(readAlertSound(null)).toBe("campainha");
    expect(writeAlertSound("bipe", null)).toBe(false);
  });

  it("silencioso não toca e não falha", async () => {
    await expect(playAlertSound("silencioso")).resolves.toBe(true);
  });
});
