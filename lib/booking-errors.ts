/** Códigos retornados pelas funções do banco e mensagens exibidas ao cliente. */
export type BookingErrorCode =
  | "shop_not_found"
  | "invalid_services"
  | "invalid_data"
  | "slot_unavailable"
  | "slot_taken"
  | "limit_reached"
  | "rate_limited"
  | "network"
  | "unknown";

export const BOOKING_ERROR_MESSAGES: Record<BookingErrorCode, string> = {
  shop_not_found: "Esta barbearia não está mais recebendo agendamentos pelo site.",
  invalid_services: "Algum serviço escolhido não está mais disponível. Revise a seleção.",
  invalid_data: "Confira seus dados: nome e WhatsApp precisam estar corretos.",
  slot_unavailable: "Este horário não está mais disponível. Escolha outro.",
  slot_taken: "Esse horário acabou de ser ocupado. Escolha outro horário.",
  limit_reached:
    "Você já tem 2 agendamentos futuros. Cancele um deles pelo link recebido ou fale com a barbearia.",
  rate_limited: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.",
  network: "Sem conexão. Verifique sua internet e tente novamente.",
  unknown: "Não foi possível concluir o agendamento. Tente novamente.",
};
