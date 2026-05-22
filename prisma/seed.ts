import { PapelUsuario, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const FUNCOES = [
  { codigo: "MC", nome: "Mestre de Cerimônias", ordem: 10, padrao: true },
  { codigo: "CREDENCIA", nome: "Credência", ordem: 20, padrao: true },
  { codigo: "ALTAR", nome: "Altar", ordem: 30, padrao: true },
  { codigo: "MICROFONE", nome: "Microfone", ordem: 40, padrao: true },
  { codigo: "MISSAL", nome: "Missal", ordem: 50, padrao: true },
  { codigo: "CRUZ", nome: "Cruz", ordem: 60, padrao: true },
  { codigo: "CEROFERARIO", nome: "Ceroferário", ordem: 70, padrao: true },
  { codigo: "TURIBULO", nome: "Turíbulo", ordem: 80, padrao: false },
  { codigo: "NAVETA", nome: "Naveta", ordem: 90, padrao: false },
  { codigo: "CARRILHAO", nome: "Carrilhão", ordem: 100, padrao: false },
] as const;

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const senha = process.env.ADMIN_PASSWORD;
  const nome = process.env.ADMIN_NOME ?? "Administrador";

  if (!email || !senha) {
    console.log("Seed admin: defina ADMIN_EMAIL e ADMIN_PASSWORD no .env para criar o admin.");
    return;
  }

  const passwordHash = await bcrypt.hash(senha, 12);
  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      nome,
      passwordHash,
      papel: PapelUsuario.ADMIN,
    },
    update: { nome, passwordHash, papel: PapelUsuario.ADMIN, ativo: true },
  });
  console.log(`Seed admin: usuário ${email} (ADMIN) sincronizado.`);
}

async function main() {
  for (const f of FUNCOES) {
    await prisma.funcao.upsert({
      where: { codigo: f.codigo },
      create: f,
      update: { nome: f.nome, ordem: f.ordem, padrao: f.padrao, ativo: true },
    });
  }
  console.log(`Seed: ${FUNCOES.length} funções sincronizadas.`);

  await seedAdmin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
