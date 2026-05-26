-- =============================================================================
-- 1. ESCALAS — corrige constraint de unicidade
--    O Prisma gerou UNIQUE INDEX (não CONSTRAINT), então usa DROP INDEX.
-- =============================================================================

DROP INDEX "escalas_missa_id_funcao_id_user_id_vaga_key";

CREATE UNIQUE INDEX "escalas_missa_id_funcao_id_user_id_key"
  ON "escalas" ("missa_id", "funcao_id", "user_id");

CREATE UNIQUE INDEX "escalas_missa_id_funcao_id_vaga_key"
  ON "escalas" ("missa_id", "funcao_id", "vaga");

CREATE INDEX "escalas_funcao_id_idx" ON "escalas" ("funcao_id");

-- =============================================================================
-- 2. DISPONIBILIDADES — remove mes_ano (redundante com data)
-- =============================================================================

DROP INDEX "disponibilidades_user_id_mes_ano_data_horario_key";
DROP INDEX "disponibilidades_mes_ano_user_id_idx";
DROP INDEX "disponibilidades_data_horario_status_idx";

ALTER TABLE "disponibilidades" DROP COLUMN "mes_ano";

CREATE UNIQUE INDEX "disponibilidades_user_id_data_horario_key"
  ON "disponibilidades" ("user_id", "data", "horario");

CREATE INDEX "disponibilidades_data_horario_status_user_id_idx"
  ON "disponibilidades" ("data", "horario", "status", "user_id");

-- =============================================================================
-- 3. FUNCOES — adiciona quantidade_padrao
-- =============================================================================

ALTER TABLE "funcoes"
  ADD COLUMN "quantidade_padrao" INTEGER NOT NULL DEFAULT 1;

UPDATE "funcoes"
  SET "quantidade_padrao" = 2
  WHERE "codigo" = 'CEROFERARIO';

-- =============================================================================
-- 4. ESCALAS — adiciona campo de observação por função
-- =============================================================================

ALTER TABLE "escalas"
  ADD COLUMN "observacao" TEXT;
