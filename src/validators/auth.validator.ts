import { PapelUsuario } from "@prisma/client";
import { z } from "zod";

const senhaSchema = z
  .string()
  .min(8, "Senha deve ter no mínimo 8 caracteres")
  .max(128);

export const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().email(),
  senha: senhaSchema,
  nome: z.string().min(2).max(120),
  telefone: z.string().max(20).optional(),
});

export const criarUsuarioSchema = registerSchema.extend({
  papel: z.nativeEnum(PapelUsuario).default(PapelUsuario.SERVIDOR),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CriarUsuarioInput = z.infer<typeof criarUsuarioSchema>;
