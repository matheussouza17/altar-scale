import { z } from "zod";
import { missaIdParamSchema } from "./missa.validator.js";

export const escalaParamsSchema = missaIdParamSchema;

export const createEscalaSchema = z.object({
  funcaoId: z.string().uuid(),
  userId: z.string().uuid(),
  vaga: z.number().int().min(1).max(10).default(1),
});

export const escalaQuerySchema = z.object({
  funcaoId: z.string().uuid().optional(),
});
