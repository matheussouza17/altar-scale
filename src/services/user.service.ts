import { PapelUsuario } from "@prisma/client";
import bcrypt from "bcryptjs";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import type { AuthUser } from "../types/express.js";

const BCRYPT_ROUNDS = 12;

const userPublicSelect = {
  id: true,
  email: true,
  nome: true,
  telefone: true,
  papel: true,
  ativo: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listarUsuarios(incluirInativos = false) {
  return prisma.user.findMany({
    where: {
      ...(incluirInativos ? {} : { ativo: true }),
      papel: { in: [PapelUsuario.SERVIDOR, PapelUsuario.COORDENADOR] },
    },
    select: {
      id: true,
      nome: true,
      email: true,
      telefone: true,
      papel: true,
      ativo: true,
    },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
  });
}

export async function obterUsuario(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: userPublicSelect,
  });
  if (!user) throw new AppError("Usuário não encontrado.", 404, "USER_NOT_FOUND");
  return user;
}

/**
 * Coordenador desativa/reativa servidores.
 * Admin desativa/reativa servidores e coordenadores (não outros admins).
 */
export async function editarUsuario(
  alvoId: string,
  input: { nome?: string; telefone?: string | null },
  solicitante: AuthUser,
) {
  const alvo = await prisma.user.findUnique({ where: { id: alvoId } });
  if (!alvo) throw new AppError("Usuário não encontrado.", 404, "USER_NOT_FOUND");

  if (
    solicitante.papel === PapelUsuario.COORDENADOR &&
    alvo.papel !== PapelUsuario.SERVIDOR
  ) {
    throw new AppError("Coordenadores só podem editar servidores.", 403, "FORBIDDEN");
  }

  return prisma.user.update({
    where: { id: alvoId },
    data: {
      ...(input.nome !== undefined && { nome: input.nome }),
      ...(input.telefone !== undefined && { telefone: input.telefone }),
    },
    select: userPublicSelect,
  });
}

export async function excluirUsuario(alvoId: string, solicitante: AuthUser) {
  if (alvoId === solicitante.id) {
    throw new AppError("Você não pode excluir a própria conta.", 400, "SELF_DELETE");
  }

  const alvo = await prisma.user.findUnique({
    where: { id: alvoId },
    include: { _count: { select: { escalas: true } } },
  });
  if (!alvo) throw new AppError("Usuário não encontrado.", 404, "USER_NOT_FOUND");

  if (alvo.papel === PapelUsuario.ADMIN) {
    throw new AppError("Não é permitido excluir administradores.", 403, "FORBIDDEN");
  }

  if (
    solicitante.papel === PapelUsuario.COORDENADOR &&
    alvo.papel !== PapelUsuario.SERVIDOR
  ) {
    throw new AppError("Coordenadores só podem excluir servidores.", 403, "FORBIDDEN");
  }

  if (alvo._count.escalas > 0) {
    throw new AppError(
      "Servidor possui histórico de escalas e não pode ser excluído. Desative-o em vez disso.",
      409,
      "HAS_ESCALAS",
    );
  }

  await prisma.user.delete({ where: { id: alvoId } });
  return { excluido: true };
}

/** Troca de senha pelo próprio usuário autenticado. Exige senha atual correta. */
export async function alterarSenha(
  userId: string,
  input: { senhaAtual: string; novaSenha: string },
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("Usuário não encontrado.", 404, "USER_NOT_FOUND");

  const ok = await bcrypt.compare(input.senhaAtual, user.passwordHash);
  if (!ok) throw new AppError("Senha atual incorreta.", 401, "WRONG_PASSWORD");

  const hash = await bcrypt.hash(input.novaSenha, BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
  return { ok: true };
}

/**
 * Reset de senha pelo coordenador/admin em nome de outro usuário.
 * O coordenador define a senha temporária e comunica ao servidor.
 */
export async function resetarSenha(
  alvoId: string,
  novaSenha: string,
  solicitante: AuthUser,
) {
  if (alvoId === solicitante.id) {
    throw new AppError(
      "Use a troca de senha normal para alterar a própria senha.",
      400,
      "USE_CHANGE_PASSWORD",
    );
  }

  const alvo = await prisma.user.findUnique({ where: { id: alvoId } });
  if (!alvo) throw new AppError("Usuário não encontrado.", 404, "USER_NOT_FOUND");

  if (solicitante.papel === PapelUsuario.COORDENADOR && alvo.papel !== PapelUsuario.SERVIDOR) {
    throw new AppError("Coordenadores só podem resetar senhas de servidores.", 403, "FORBIDDEN");
  }

  if (alvo.papel === PapelUsuario.ADMIN) {
    throw new AppError("Não é permitido resetar senha de administradores.", 403, "FORBIDDEN");
  }

  const hash = await bcrypt.hash(novaSenha, BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id: alvoId }, data: { passwordHash: hash } });
  return { ok: true };
}

export async function atualizarStatusUsuario(
  alvoId: string,
  ativo: boolean,
  solicitante: AuthUser,
) {
  if (alvoId === solicitante.id) {
    throw new AppError("Você não pode alterar o próprio status.", 400, "SELF_STATUS_CHANGE");
  }

  const alvo = await prisma.user.findUnique({ where: { id: alvoId } });
  if (!alvo) throw new AppError("Usuário não encontrado.", 404, "USER_NOT_FOUND");

  if (alvo.papel === PapelUsuario.ADMIN) {
    throw new AppError("Não é permitido desativar administradores.", 403, "FORBIDDEN");
  }

  if (
    solicitante.papel === PapelUsuario.COORDENADOR &&
    alvo.papel !== PapelUsuario.SERVIDOR
  ) {
    throw new AppError(
      "Coordenadores só podem desativar servidores.",
      403,
      "FORBIDDEN",
    );
  }

  return prisma.user.update({
    where: { id: alvoId },
    data: { ativo },
    select: userPublicSelect,
  });
}
