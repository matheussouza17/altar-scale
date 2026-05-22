import type { HorarioMissa } from "@prisma/client";

/** Mapeia enum do banco para rótulo exibido no frontend. */
export const HORARIO_LABEL: Record<HorarioMissa, string> = {
  H09: "09:00",
  H18: "18:00",
};

/** Horário civil usado na comparação com Disponibilidade (mesmo enum). */
export const HORARIO_HORA: Record<HorarioMissa, number> = {
  H09: 9,
  H18: 18,
};
