import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";

function gerarCodigo(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
}

export async function criarFuncao(input: {
  nome: string;
  descricao?: string | null;
  padrao?: boolean;
  ordem?: number;
  quantidadePadrao?: number;
}) {
  let base = gerarCodigo(input.nome);
  if (!base) base = "FUNC";

  // Resolve conflito de código único
  let codigo = base;
  let suffix = 1;
  while (await prisma.funcao.findUnique({ where: { codigo } })) {
    codigo = `${base.slice(0, 8)}${suffix}`;
    suffix++;
  }

  return prisma.funcao.create({
    data: {
      codigo,
      nome: input.nome,
      descricao: input.descricao ?? null,
      padrao: input.padrao ?? false,
      ordem: input.ordem ?? 0,
      quantidadePadrao: input.quantidadePadrao ?? 1,
    },
  });
}

export async function excluirFuncao(funcaoId: string) {
  const funcao = await prisma.funcao.findUnique({ where: { id: funcaoId } });
  if (!funcao) throw new AppError("Função não encontrada.", 404, "FUNCAO_NOT_FOUND");

  const emUso = await prisma.missaFuncao.count({ where: { funcaoId } });
  if (emUso > 0) {
    throw new AppError(
      "Função está vinculada a missas e não pode ser excluída. Desative-a em vez disso.",
      409,
      "FUNCAO_IN_USE",
    );
  }

  await prisma.funcao.delete({ where: { id: funcaoId } });
}

export async function listarFuncoes(apenasAtivas = true) {
  return prisma.funcao.findMany({
    where: apenasAtivas ? { ativo: true } : undefined,
    orderBy: { ordem: "asc" },
  });
}

export async function editarFuncao(
  funcaoId: string,
  input: { nome?: string; descricao?: string | null; padrao?: boolean; ativo?: boolean; ordem?: number; quantidadePadrao?: number },
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
      ...(input.quantidadePadrao !== undefined && { quantidadePadrao: input.quantidadePadrao }),
    },
  });
}
