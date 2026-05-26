import { PapelUsuario } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { AppError } from "../lib/errors.js";
import { signAccessToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { enviarEmailBoasVindas, enviarEmailResetSenha } from "./email.service.js";
import type { CriarUsuarioInput, LoginInput } from "../validators/auth.validator.js";

const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY_HOURS = 48;

const userPublicSelect = {
  id: true,
  email: true,
  nome: true,
  telefone: true,
  papel: true,
  ativo: true,
  createdAt: true,
} as const;

function gerarToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function expiryDe(horas: number): Date {
  return new Date(Date.now() + horas * 60 * 60 * 1000);
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user || !user.ativo) {
    throw new AppError("E-mail ou senha incorretos.", 401, "INVALID_CREDENTIALS");
  }

  if (!user.passwordHash) {
    throw new AppError(
      "Senha não definida. Verifique seu email para o link de configuração.",
      401,
      "PASSWORD_NOT_SET",
    );
  }

  const ok = await bcrypt.compare(input.senha, user.passwordHash);
  if (!ok) {
    throw new AppError("E-mail ou senha incorretos.", 401, "INVALID_CREDENTIALS");
  }

  return signAccessToken(user);
}

export async function criarUsuario(
  input: CriarUsuarioInput,
  criadorPapel?: PapelUsuario,
) {
  if (criadorPapel === PapelUsuario.COORDENADOR && input.papel !== PapelUsuario.SERVIDOR) {
    throw new AppError("Coordenadores só podem cadastrar servidores.", 403, "FORBIDDEN");
  }

  if (input.papel !== PapelUsuario.SERVIDOR && criadorPapel !== PapelUsuario.ADMIN) {
    throw new AppError(
      "Somente administradores podem criar coordenadores ou admins.",
      403,
      "FORBIDDEN",
    );
  }

  const email = input.email.toLowerCase();
  const existe = await prisma.user.findUnique({ where: { email } });
  if (existe) throw new AppError("E-mail já cadastrado.", 409, "EMAIL_EXISTS");

  const token = gerarToken();

  await prisma.user.create({
    data: {
      email,
      nome: input.nome,
      telefone: input.telefone ?? null,
      papel: input.papel,
      passwordHash: "",
      passwordResetToken: token,
      passwordResetExpiry: expiryDe(TOKEN_EXPIRY_HOURS),
    },
  });

  await enviarEmailBoasVindas(email, input.nome, token);

  return { ok: true, email };
}

export async function solicitarResetSenha(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Responde sempre com sucesso para não revelar se o email existe
  if (!user || !user.ativo) return { ok: true };

  const token = gerarToken();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: token,
      passwordResetExpiry: expiryDe(TOKEN_EXPIRY_HOURS),
    },
  });

  await enviarEmailResetSenha(user.email, user.nome, token);

  return { ok: true };
}

export async function definirSenha(token: string, novaSenha: string) {
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    throw new AppError(
      "Link inválido ou expirado. Solicite um novo ao coordenador.",
      400,
      "INVALID_TOKEN",
    );
  }

  const hash = await bcrypt.hash(novaSenha, BCRYPT_ROUNDS);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hash,
      passwordResetToken: null,
      passwordResetExpiry: null,
      ativo: true,
    },
    select: userPublicSelect,
  });

  return signAccessToken(updated);
}

export async function obterPerfil(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userPublicSelect,
  });
  if (!user) throw new AppError("Usuário não encontrado.", 404, "USER_NOT_FOUND");
  return user;
}
