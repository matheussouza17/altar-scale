import { z } from "zod";
import { missaIdParamSchema } from "./missa.validator.js";

export const escalaParamsSchema = missaIdParamSchema;

export const escalaIdParamSchema = z.object({
  missaId: z.string().uuid(),
  escalaId: z.string().uuid(),
});

export const createEscalaSchema = z.object({
  funcaoId: z.string().uuid(),
  userId: z.string().uuid(),
  observacao: z.string().max(500).optional(),
});

export const updateEscalaSchema = z.object({
  observacao: z.string().max(500).nullable(),
});

export const escalaQuerySchema = z.object({
  funcaoId: z.string().uuid().optional(),
});
