"use client";
import { Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ALERT_SOUNDS, DEFAULT_ALERT_SOUND, playAlertSound, readAlertSound, type AlertSoundId, writeAlertSound } from "@/lib/admin/alert-sounds";

/** Escolha do toque tocado pelo painel aberto quando chega um aviso (vale para este aparelho). */
export function AlertSoundPicker() {
  const [sound, setSound] = useState<AlertSoundId>(DEFAULT_ALERT_SOUND);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => setSound(readAlertSound()), []);

  function choose(id: AlertSoundId) {
    setSound(id);
    writeAlertSound(id);
  }

  async function test() {
    setBlocked(!(await playAlertSound(sound)));
  }

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-5" aria-labelledby="toque-titulo" data-testid="alert-sound-picker">
      <div>
        <h2 id="toque-titulo" className="flex items-center gap-2 font-medium">
          <Volume2 className="size-4 text-gold" aria-hidden /> Toque do painel
        </h2>
        <p className="mt-1 text-sm text-muted">
          Toca neste aparelho quando chega um agendamento ou cancelamento com o painel aberto na tela.
        </p>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Toque</legend>
        {ALERT_SOUNDS.map((s) => (
          <label key={s.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border border-border px-3 has-[:checked]:border-gold">
            <input type="radio" name="toque" value={s.id} checked={sound === s.id} onChange={() => choose(s.id)} className="accent-[var(--color-gold)]" />
            {s.label}
          </label>
        ))}
      </fieldset>
      <Button variant="outline" className="self-start" onClick={test} disabled={sound === "silencioso"}>
        Testar
      </Button>
      {blocked ? <p className="text-sm text-muted">O navegador bloqueou o som. Toque em qualquer lugar da página e tente de novo.</p> : null}
      <p className="text-sm text-muted" data-testid="system-sound-note">
        Com o painel fechado ou o celular bloqueado, o aviso usa o som de notificação do aparelho: no Android, dá para trocar esse som nas configurações do
        telefone; no iPhone, não é possível escolher.
      </p>
    </section>
  );
}
