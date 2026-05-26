import { PapelUsuario } from "@prisma/client";
import { z } from "zod";

export const senhaSchema = z
  .string()
  .min(8, "Senha deve ter no mínimo 8 caracteres")
  .max(128);

export const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

export const criarUsuarioSchema = z.object({
  email: z.string().email(),
  nome: z.string().min(2).max(120),
  telefone: z.string().max(20).optional(),
  papel: z.nativeEnum(PapelUsuario).default(PapelUsuario.SERVIDOR),
});

export const definirSenhaSchema = z.object({
  token: z.string().min(1),
  novaSenha: senhaSchema,
});

export const alterarSenhaSchema = z.object({
  senhaAtual: z.string().min(1),
  novaSenha: senhaSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CriarUsuarioInput = z.infer<typeof criarUsuarioSchema>;
export type DefinirSenhaInput = z.infer<typeof definirSenhaSchema>;
export type AlterarSenhaInput = z.infer<typeof alterarSenhaSchema>;
