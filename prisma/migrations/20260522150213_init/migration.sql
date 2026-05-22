-- CreateEnum
CREATE TYPE "PapelUsuario" AS ENUM ('SERVIDOR', 'COORDENADOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "TipoMissa" AS ENUM ('DOMINICAL', 'ESPECIAL');

-- CreateEnum
CREATE TYPE "HorarioMissa" AS ENUM ('H09', 'H18');

-- CreateEnum
CREATE TYPE "StatusDisponibilidade" AS ENUM ('DISPONIVEL', 'INDISPONIVEL');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "papel" "PapelUsuario" NOT NULL DEFAULT 'SERVIDOR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funcoes" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "padrao" BOOLEAN NOT NULL DEFAULT true,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "funcoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "missas" (
    "id" UUID NOT NULL,
    "titulo" TEXT,
    "data" DATE NOT NULL,
    "horario" "HorarioMissa" NOT NULL,
    "tipo" "TipoMissa" NOT NULL DEFAULT 'DOMINICAL',
    "observacoes" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "missas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "missa_funcoes" (
    "id" UUID NOT NULL,
    "missa_id" UUID NOT NULL,
    "funcao_id" UUID NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "obrigatoria" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "missa_funcoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disponibilidades" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "mes_ano" DATE NOT NULL,
    "data" DATE NOT NULL,
    "horario" "HorarioMissa" NOT NULL,
    "status" "StatusDisponibilidade" NOT NULL DEFAULT 'DISPONIVEL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disponibilidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escalas" (
    "id" UUID NOT NULL,
    "missa_id" UUID NOT NULL,
    "funcao_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "vaga" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escalas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_papel_ativo_idx" ON "users"("papel", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "funcoes_codigo_key" ON "funcoes"("codigo");

-- CreateIndex
CREATE INDEX "missas_data_horario_idx" ON "missas"("data", "horario");

-- CreateIndex
CREATE INDEX "missas_tipo_ativa_idx" ON "missas"("tipo", "ativa");

-- CreateIndex
CREATE UNIQUE INDEX "missas_data_horario_key" ON "missas"("data", "horario");

-- CreateIndex
CREATE UNIQUE INDEX "missa_funcoes_missa_id_funcao_id_key" ON "missa_funcoes"("missa_id", "funcao_id");

-- CreateIndex
CREATE INDEX "disponibilidades_data_horario_status_idx" ON "disponibilidades"("data", "horario", "status");

-- CreateIndex
CREATE INDEX "disponibilidades_mes_ano_user_id_idx" ON "disponibilidades"("mes_ano", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "disponibilidades_user_id_mes_ano_data_horario_key" ON "disponibilidades"("user_id", "mes_ano", "data", "horario");

-- CreateIndex
CREATE INDEX "escalas_missa_id_idx" ON "escalas"("missa_id");

-- CreateIndex
CREATE INDEX "escalas_user_id_missa_id_idx" ON "escalas"("user_id", "missa_id");

-- CreateIndex
CREATE UNIQUE INDEX "escalas_missa_id_funcao_id_user_id_vaga_key" ON "escalas"("missa_id", "funcao_id", "user_id", "vaga");

-- AddForeignKey
ALTER TABLE "missa_funcoes" ADD CONSTRAINT "missa_funcoes_missa_id_fkey" FOREIGN KEY ("missa_id") REFERENCES "missas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missa_funcoes" ADD CONSTRAINT "missa_funcoes_funcao_id_fkey" FOREIGN KEY ("funcao_id") REFERENCES "funcoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disponibilidades" ADD CONSTRAINT "disponibilidades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalas" ADD CONSTRAINT "escalas_missa_id_fkey" FOREIGN KEY ("missa_id") REFERENCES "missas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalas" ADD CONSTRAINT "escalas_funcao_id_fkey" FOREIGN KEY ("funcao_id") REFERENCES "funcoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalas" ADD CONSTRAINT "escalas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
