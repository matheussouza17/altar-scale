import { z } from "zod";

export const userIdParamSchema = z.object({
  userId: z.string().uuid(),
});

export const listarUsersQuerySchema = z.object({
  incluirInativos: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export const atualizarStatusUserSchema = z.object({
  ativo: z.boolean(),
});
