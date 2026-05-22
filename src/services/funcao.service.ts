import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";

export async function listarFuncoes(apenasAtivas = true) {
  return prisma.funcao.findMany({
    where: apenasAtivas ? { ativo: true } : undefined,
    orderBy: { ordem: "asc" },
  });
}

export async function editarFuncao(
  funcaoId: string,
  input: { nome?: string; descricao?: string | null; padrao?: boolean; ativo?: boolean; ordem?: number },
) {
  const funcao = await prisma.funcao.findUnique({ where: { id: funcaoId } });
  if (!funcao) throw new AppError("Função não encontrada.", 404, "FUNCAO_NOT_FOUND");

  return prisma.funcao.update({
    where: { id: funcaoId },
    data: {
      ...(input.nome !== undefined && { nome: input.nome }),
      ...(input.descricao !== undefined && { descricao: input.descricao }),
      ...(input.padrao !== undefined && { padrao: input.padrao }),
      ...(input.ativo !== undefined && { ativo: input.ativo }),
      ...(input.ordem !== undefined && { ordem: input.ordem }),
    },
  });
}
