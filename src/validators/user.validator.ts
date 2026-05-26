import { z } from "zod";

const senhaSchema = z.string().min(8, "Senha deve ter no mínimo 8 caracteres").max(128);

export const userIdParamSchema = z.object({
  userId: z.string().uuid(),
});

export const resetarSenhaSchema = z.object({
  novaSenha: senhaSchema,
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

export const editarUsuarioSchema = z.object({
  nome: z.string().min(2).max(120).optional(),
  telefone: z.string().max(20).nullable().optional(),
});

export type EditarUsuarioInput = z.infer<typeof editarUsuarioSchema>;
