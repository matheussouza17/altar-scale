import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { listarServidoresDisponiveisParaMissa } from "./disponibilidade.service.js";

/**
 * Atribui um servidor a uma função na missa.
 * Valida: função habilitada na missa, usuário disponível no slot, acúmulo permitido.
 */
export async function atribuirEscala(
  missaId: string,
  data: { funcaoId: string; userId: string; vaga?: number },
) {
  const vaga = data.vaga ?? 1;

  const missaFuncao = await prisma.missaFuncao.findUnique({
    where: { missaId_funcaoId: { missaId, funcaoId: data.funcaoId } },
  });
  if (!missaFuncao) {
    throw new AppError("Função não habilitada nesta missa.", 400, "FUNCAO_NOT_ENABLED");
  }

  if (vaga > missaFuncao.quantidade) {
    throw new AppError(
      `Vaga ${vaga} excede quantidade (${missaFuncao.quantidade}) para esta função.`,
      400,
      "VAGA_INVALID",
    );
  }

  const disponiveis = await listarServidoresDisponiveisParaMissa(missaId);
  const servidorOk = disponiveis.servidores.some((s) => s.id === data.userId);
  if (!servidorOk) {
    throw new AppError(
      "Servidor não está disponível para esta data e horário.",
      400,
      "SERVIDOR_INDISPONIVEL",
    );
  }

  return prisma.escala.upsert({
    where: {
      missaId_funcaoId_userId_vaga: {
        missaId,
        funcaoId: data.funcaoId,
        userId: data.userId,
        vaga,
      },
    },
    create: {
      missaId,
      funcaoId: data.funcaoId,
      userId: data.userId,
      vaga,
    },
    update: {},
    include: {
      user: { select: { id: true, nome: true } },
      funcao: { select: { codigo: true, nome: true } },
    },
  });
}

export async function removerEscala(missaId: string, escalaId: string) {
  const escala = await prisma.escala.findFirst({
    where: { id: escalaId, missaId },
  });
  if (!escala) throw new AppError("Registro de escala não encontrado.", 404, "ESCALA_NOT_FOUND");

  await prisma.escala.delete({ where: { id: escalaId } });
  return { removido: true };
}

export async function listarEscalasMissa(missaId: string, funcaoId?: string) {
  return prisma.escala.findMany({
    where: { missaId, ...(funcaoId ? { funcaoId } : {}) },
    include: {
      user: { select: { id: true, nome: true, email: true } },
      funcao: true,
    },
    orderBy: [{ funcao: { ordem: "asc" } }, { vaga: "asc" }],
  });
}
