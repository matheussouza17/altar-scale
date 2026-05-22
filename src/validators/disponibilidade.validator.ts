import { HorarioMissa, StatusDisponibilidade } from "@prisma/client";
import { z } from "zod";

const horarioEnum = z.nativeEnum(HorarioMissa);
const statusEnum = z.nativeEnum(StatusDisponibilidade);

/** YYYY-MM-DD */
const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use formato YYYY-MM-DD");

/** YYYY-MM — primeiro dia do mês é derivado no serviço */
export const mesAnoParamSchema = z.object({
  mesAno: z.string().regex(/^\d{4}-\d{2}$/, "Use formato YYYY-MM"),
});

export const disponibilidadeBulkSchema = z.object({
  mesAno: z.string().regex(/^\d{4}-\d{2}$/),
  itens: z
    .array(
      z.object({
        data: dataIso,
        horario: horarioEnum,
        status: statusEnum.default(StatusDisponibilidade.DISPONIVEL),
      }),
    )
    .min(1),
});

export const disponibilidadeQuerySchema = z.object({
  mesAno: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  userId: z.string().uuid().optional(),
});

export type DisponibilidadeBulkInput = z.infer<typeof disponibilidadeBulkSchema>;
