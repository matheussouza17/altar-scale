import { Prisma, StatusDisponibilidade } from "@prisma/client";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import type { DisponibilidadeBulkInput } from "../validators/disponibilidade.validator.js";

export function parseDataIso(data: string): Date {
  const [y, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Retorna servidores DISPONÍVEIS para a data/horário da missa.
 * Usado pelo coordenador no combobox ao escalar uma função.
 */
export async function listarServidoresDisponiveisParaMissa(missaId: string) {
  const missa = await prisma.missa.findUnique({
    where: { id: missaId },
    select: { id: true, data: true, horario: true, titulo: true, tipo: true, ativa: true },
  });

  if (!missa) {
    throw new AppError("Missa não encontrada.", 404, "MISSA_NOT_FOUND");
  }

  if (!missa.ativa) {
    throw new AppError("Missa inativa.", 400, "MISSA_INACTIVE");
  }

  const disponiveis = await prisma.user.findMany({
    where: {
      ativo: true,
      papel: { in: ["SERVIDOR", "COORDENADOR"] },
      disponibilidades: {
        some: {
          data: missa.data,
          horario: missa.horario,
          status: StatusDisponibilidade.DISPONIVEL,
        },
      },
    },
    select: {
      id: true,
      nome: true,
      email: true,
      telefone: true,
      escalas: {
        where: { missaId },
        select: {
          funcaoId: true,
          funcao: { select: { codigo: true, nome: true } },
          vaga: true,
        },
      },
    },
    orderBy: { nome: "asc" },
  });

  return {
    missa: {
      id: missa.id,
      data: missa.data,
      horario: missa.horario,
      titulo: missa.titulo,
      tipo: missa.tipo,
    },
    total: disponiveis.length,
    servidores: disponiveis.map((s) => ({
      id: s.id,
      nome: s.nome,
      email: s.email,
      telefone: s.telefone,
      funcoesNaMissa: s.escalas.map((e) => ({
        funcaoId: e.funcaoId,
        codigo: e.funcao.codigo,
        nome: e.funcao.nome,
        vaga: e.vaga,
      })),
    })),
  };
}

/**
 * Variante com filtro por função: exclui quem já está nessa função e calcula vagas restantes.
 */
export async function listarServidoresDisponiveisParaMissaFuncao(
  missaId: string,
  funcaoId: string,
) {
  const base = await listarServidoresDisponiveisParaMissa(missaId);

  const missaFuncao = await prisma.missaFuncao.findUnique({
    where: { missaId_funcaoId: { missaId, funcaoId } },
    include: {
      funcao: { select: { id: true, codigo: true, nome: true } },
      missa: {
        select: {
          escalas: {
            where: { funcaoId },
            select: { userId: true, vaga: true },
          },
        },
      },
    },
  });

  if (!missaFuncao) {
    throw new AppError(
      "Função não habilitada para esta missa.",
      400,
      "FUNCAO_NOT_ENABLED",
    );
  }

  const ocupadas = missaFuncao.missa.escalas.length;
  const vagasRestantes = Math.max(0, missaFuncao.quantidade - ocupadas);

  const servidores = base.servidores.map((s) => {
    const jaEscaladoNestaFuncao = s.funcoesNaMissa.some((f) => f.funcaoId === funcaoId);
    return { ...s, jaEscaladoNestaFuncao, podeAcumularOutraFuncao: true };
  });

  return {
    ...base,
    funcao: {
      id: missaFuncao.funcao.id,
      codigo: missaFuncao.funcao.codigo,
      nome: missaFuncao.funcao.nome,
      quantidade: missaFuncao.quantidade,
      vagasRestantes,
    },
    servidores,
  };
}

export async function salvarDisponibilidadesUsuario(
  userId: string,
  input: DisponibilidadeBulkInput,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("Usuário não encontrado.", 404, "USER_NOT_FOUND");

  // Valida que cada (data, horário) corresponde a uma missa existente e ativa
  const pares = input.itens.map((i) => ({ data: parseDataIso(i.data), horario: i.horario }));
  const missasExistentes = await prisma.missa.findMany({
    where: { ativa: true, OR: pares.map((p) => ({ data: p.data, horario: p.horario })) },
    select: { data: true, horario: true },
  });
  const missasSet = new Set(
    missasExistentes.map((m) => `${m.data.toISOString().split("T")[0]}_${m.horario}`),
  );
  const invalidas = input.itens.filter((i) => !missasSet.has(`${i.data}_${i.horario}`));
  if (invalidas.length > 0) {
    throw new AppError(
      `Não há missa cadastrada em: ${invalidas.map((i) => `${i.data} ${i.horario}`).join(", ")}.`,
      400,
      "MISSA_NOT_FOUND",
    );
  }

  const operations = input.itens.map((item) =>
    prisma.disponibilidade.upsert({
      where: {
        userId_data_horario: {
          userId,
          data: parseDataIso(item.data),
          horario: item.horario,
        },
      },
      create: {
        userId,
        data: parseDataIso(item.data),
        horario: item.horario,
        status: item.status,
      },
      update: { status: item.status },
    }),
  );

  await prisma.$transaction(operations);

  return { mesAno: input.mesAno, atualizados: input.itens.length };
}

export async function listarDisponibilidadesUsuario(
  userId: string,
  mesAno?: string,
) {
  const where: Prisma.DisponibilidadeWhereInput = { userId };
  if (mesAno) {
    const [y, m] = mesAno.split("-").map(Number);
    where.data = {
      gte: new Date(Date.UTC(y, m - 1, 1)),
      lte: new Date(Date.UTC(y, m, 0)),
    };
  }

  return prisma.disponibilidade.findMany({
    where,
    orderBy: [{ data: "asc" }, { horario: "asc" }],
  });
}
