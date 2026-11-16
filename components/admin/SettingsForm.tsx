"use client";
import { useState, useTransition, type ComponentProps, type ReactNode } from "react";
import { saveSettings, type SettingsInput } from "@/app/painel/[slug]/config/actions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { usePanelSlug } from "./usePanelSlug";

type Form = { [K in keyof SettingsInput]-?: string };

function TextArea(props: { id: keyof Form; label: string; value: string; onChange: (v: string) => void; error?: string; rows?: number }) {
  const { id, label, value, onChange, error, rows = 3 } = props;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="rounded-sm border border-border bg-surface p-3 text-base text-text focus:border-gold focus:outline-none"
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4 md:p-6">
      <legend className="px-1 text-xs font-semibold uppercase tracking-[0.15em] text-gold">{title}</legend>
      <p className="-mt-2 text-sm text-muted">{description}</p>
      {children}
    </fieldset>
  );
}

export function SettingsForm({ initial }: { initial: Form }) {
  const slug = usePanelSlug();
  const [form, setForm] = useState(initial);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const set = (patch: Partial<Form>) => {
    setSaved(false);
    setForm((f) => ({ ...f, ...patch }));
  };
  const field = (key: keyof Form, label: string, extra: Partial<ComponentProps<typeof TextField>> = {}) => (
    <TextField label={label} value={form[key]} onChange={(e) => set({ [key]: e.target.value })} error={fields[key]} {...extra} />
  );
  const area = (key: keyof Form, label: string, rows?: number) => (
    <TextArea id={key} label={label} value={form[key]} onChange={(v) => set({ [key]: v })} error={fields[key]} rows={rows} />
  );

  return (
    <form
      className="flex flex-col gap-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveSettings(slug, form);
          if (r.ok) {
            setFields({});
            setSaved(true);
          } else setFields(r.fields);
        });
      }}
    >
      <Section title="Barbearia" description="Nome, contato e endereço, usados no cabeçalho, no rodapé e nas mensagens.">
        {field("name", "Nome da barbearia")}
        <div className="grid gap-4 md:grid-cols-[1fr_120px]">
          {field("street", "Logradouro", { placeholder: "Rua Abaré" })}
          {field("number", "Número", { placeholder: "2" })}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {field("complement", "Complemento (opcional)", { placeholder: "Sala 2" })}
          {field("district", "Bairro")}
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_90px_140px]">
          {field("city", "Cidade")}
          {field("state", "UF", { placeholder: "BA", maxLength: 2 })}
          {field("postal_code", "CEP", { placeholder: "40000-000", inputMode: "numeric" })}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {field("whatsapp", "WhatsApp de contato", { type: "tel" })}
          {field("email", "E-mail de contato", { type: "email" })}
        </div>
        {field("instagram_url", "Instagram (link completo)", { type: "url", placeholder: "https://instagram.com/suabarbearia" })}
        {area("about", "Frase de apresentação (rodapé)")}
      </Section>

      <Section title="Página inicial" description="Textos do topo da página inicial.">
        {field("hero_eyebrow", "Linha de destaque (acima do título)", { placeholder: "Tradição • Precisão • Cuidado" })}
        <div className="grid gap-4 md:grid-cols-2">
          {field("hero_title_line1", "Título — 1ª linha")}
          {field("hero_title_line2", "Título — 2ª linha (dourada)")}
        </div>
        {area("hero_subtitle", "Subtítulo", 2)}
      </Section>

      <Section title="Seu barbeiro" description="Cartão de apresentação exibido no agendamento.">
        {field("barber_name", "Nome do barbeiro")}
        {area("barber_bio", "Frase de apresentação do barbeiro", 2)}
        {field("barber_photo_url", "Foto (link https, opcional)", { type: "url", hint: "Sem foto, o cartão mostra as iniciais do nome." })}
      </Section>

      {fields.form ? (
        <p role="alert" className="text-sm text-danger">
          {fields.form}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="text-sm text-success">
          Configurações salvas.
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}
