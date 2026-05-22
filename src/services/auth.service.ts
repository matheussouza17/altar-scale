import { PapelUsuario } from "@prisma/client";
import bcrypt from "bcryptjs";
import { AppError } from "../lib/errors.js";
import { signAccessToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import type {
  CriarUsuarioInput,
  LoginInput,
  RegisterInput,
} from "../validators/auth.validator.js";

const BCRYPT_ROUNDS = 12;

const userPublicSelect = {
  id: true,
  email: true,
  nome: true,
  telefone: true,
  papel: true,
  ativo: true,
  createdAt: true,
} as const;

async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, BCRYPT_ROUNDS);
}

async function validarSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user || !user.ativo) {
    throw new AppError("E-mail ou senha incorretos.", 401, "INVALID_CREDENTIALS");
  }

  const ok = await validarSenha(input.senha, user.passwordHash);
  if (!ok) {
    throw new AppError("E-mail ou senha incorretos.", 401, "INVALID_CREDENTIALS");
  }

  return signAccessToken(user);
}

/** Cadastro público: sempre cria SERVIDOR. */
export async function register(input: RegisterInput) {
  return criarUsuario({ ...input, papel: PapelUsuario.SERVIDOR });
}

export async function criarUsuario(
  input: CriarUsuarioInput,
  criadorPapel?: PapelUsuario,
) {
  if (
    criadorPapel === PapelUsuario.COORDENADOR &&
    input.papel !== PapelUsuario.SERVIDOR
  ) {
    throw new AppError(
      "Coordenadores só podem cadastrar servidores.",
      403,
      "FORBIDDEN",
    );
  }

  if (input.papel !== PapelUsuario.SERVIDOR && criadorPapel !== PapelUsuario.ADMIN) {
    throw new AppError(
      "Somente administradores podem criar coordenadores ou admins.",
      403,
      "FORBIDDEN",
    );
  }

  if (
    input.papel === PapelUsuario.ADMIN &&
    criadorPapel !== PapelUsuario.ADMIN
  ) {
    throw new AppError("Somente admins podem criar outros admins.", 403, "FORBIDDEN");
  }

  const email = input.email.toLowerCase();
  const existe = await prisma.user.findUnique({ where: { email } });
  if (existe) {
    throw new AppError("E-mail já cadastrado.", 409, "EMAIL_EXISTS");
  }

  const user = await prisma.user.create({
    data: {
      email,
      nome: input.nome,
      telefone: input.telefone,
      papel: input.papel,
      passwordHash: await hashSenha(input.senha),
    },
    select: userPublicSelect,
  });

  return signAccessToken(user);
}

export async function obterPerfil(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userPublicSelect,
  });
  if (!user) throw new AppError("Usuário não encontrado.", 404, "USER_NOT_FOUND");
  return user;
}
