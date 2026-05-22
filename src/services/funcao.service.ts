import { prisma } from "../lib/prisma.js";

export async function listarFuncoes(apenasAtivas = true) {
  return prisma.funcao.findMany({
    where: apenasAtivas ? { ativo: true } : undefined,
    orderBy: { ordem: "asc" },
  });
}
