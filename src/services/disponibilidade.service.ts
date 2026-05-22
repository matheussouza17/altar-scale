import { Prisma, StatusDisponibilidade } from "@prisma/client";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import type { DisponibilidadeBulkInput } from "../validators/disponibilidade.validator.js";

/** Converte "2025-06" em Date UTC dia 1 do mês (armazenamento mesAno). */
export function parseMesAno(mesAno: string): Date {
  const [y, m] = mesAno.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

export function parseDataIso(data: string): Date {
  const [y, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Retorna servidores DISPONÍVEIS para a data/horário da missa.
 * Usado pelo coordenador no combobox ao escalar uma função.
 *
 * Regra: status DISPONIVEL + user ativo + papel SERVIDOR (ou todos não-coordenadores).
 * mesAno: mês civil da data da missa (disponibilidade é coletada para o mês da celebração).
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

  const mesAno = new Date(
    Date.UTC(missa.data.getUTCFullYear(), missa.data.getUTCMonth(), 1),
  );

  const disponiveis = await prisma.user.findMany({
    where: {
      ativo: true,
      papel: { in: ["SERVIDOR", "COORDENADOR"] },
      disponibilidades: {
        some: {
          mesAno,
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
    mesAno: mesAno.toISOString().slice(0, 7),
    total: disponiveis.length,
    servidores: disponiveis.map((s) => ({
      id: s.id,
      nome: s.nome,
      email: s.email,
      telefone: s.telefone,
      /** Funções já atribuídas nesta missa (acúmulo permitido). */
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
 * Variante com filtro opcional por função: exclui quem já ocupa todas as vagas
 * daquela função (quando quantidade na MissaFuncao está cheia).
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
    const atribuicoesFuncao = s.funcoesNaMissa.filter((f) => f.funcaoId === funcaoId);
    return {
      ...s,
      jaEscaladoNestaFuncao: atribuicoesFuncao.length > 0,
      podeAcumularOutraFuncao: true,
    };
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
  const mesAnoDate = parseMesAno(input.mesAno);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("Usuário não encontrado.", 404, "USER_NOT_FOUND");

  const operations = input.itens.map((item) =>
    prisma.disponibilidade.upsert({
      where: {
        userId_mesAno_data_horario: {
          userId,
          mesAno: mesAnoDate,
          data: parseDataIso(item.data),
          horario: item.horario,
        },
      },
      create: {
        userId,
        mesAno: mesAnoDate,
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
  if (mesAno) where.mesAno = parseMesAno(mesAno);

  return prisma.disponibilidade.findMany({
    where,
    orderBy: [{ data: "asc" }, { horario: "asc" }],
  });
}
