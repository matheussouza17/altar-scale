import { TipoMissa } from "@prisma/client";
import { z } from "zod";

const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const horarioStr = z.string().regex(/^\d{2}:\d{2}$/, 'Use formato "HH:MM", ex: "09:00"');

export const missaIdParamSchema = z.object({
  missaId: z.string().uuid(),
});

export const createMissaSchema = z.object({
  titulo: z.string().min(1).optional(),
  data: dataIso,
  horario: horarioStr,
  tipo: z.nativeEnum(TipoMissa).default(TipoMissa.DOMINICAL),
  observacoes: z.string().optional(),
  /** IDs das funções ativas nesta missa; omitido = funções com padrao=true */
  funcaoIds: z.array(z.string().uuid()).optional(),
});

export const updateMissaSchema = createMissaSchema.partial().extend({
  ativa: z.boolean().optional(),
  horario: horarioStr.optional(),
  funcaoIds: z.array(z.string().uuid()).optional(),
});

export const missaFuncoesSchema = z.object({
  funcoes: z.array(
    z.object({
      funcaoId: z.string().uuid(),
      quantidade: z.number().int().min(1).max(10).default(1),
      obrigatoria: z.boolean().default(true),
    }),
  ),
});

export type CreateMissaInput = z.infer<typeof createMissaSchema>;
export type UpdateMissaInput = z.infer<typeof updateMissaSchema>;
