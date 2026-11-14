-- Novo canal de lembrete: WhatsApp.
-- Fica isolado numa migration própria: o Postgres não permite usar um valor novo de enum
-- na mesma transação em que ele foi adicionado.
alter type public.reminder_channel add value if not exists 'whatsapp';
