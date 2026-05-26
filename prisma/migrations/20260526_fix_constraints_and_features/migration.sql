-- =============================================================================
-- 1. ESCALAS — corrige constraint de unicidade
--    Problema: @@unique([missaId, funcaoId, userId, vaga]) permitia o mesmo
--    servidor ocupar duas vagas da mesma função na mesma missa.
--    Solução: dois constraints separados com semântica correta.
-- =============================================================================

ALTER TABLE "escalas"
  DROP CONSTRAINT "escalas_missa_id_funcao_id_user_id_vaga_key";

-- Um servidor não pode aparecer duas vezes na mesma função/missa
ALTER TABLE "escalas"
  ADD CONSTRAINT "escalas_missa_id_funcao_id_user_id_key"
  UNIQUE ("missa_id", "funcao_id", "user_id");

-- Uma vaga só pode ter um servidor
ALTER TABLE "escalas"
  ADD CONSTRAINT "escalas_missa_id_funcao_id_vaga_key"
  UNIQUE ("missa_id", "funcao_id", "vaga");

-- Índice por funcao_id para queries de relatório
CREATE INDEX "escalas_funcao_id_idx" ON "escalas" ("funcao_id");

-- =============================================================================
-- 2. DISPONIBILIDADES — remove mes_ano (era redundante com data)
--    mes_ano sempre = primeiro dia do mês de data → risco de inconsistência.
--    O filtro por mês agora usa data BETWEEN no serviço.
-- =============================================================================

ALTER TABLE "disponibilidades"
  DROP CONSTRAINT "disponibilidades_user_id_mes_ano_data_horario_key";

DROP INDEX "disponibilidades_mes_ano_user_id_idx";
DROP INDEX "disponibilidades_data_horario_status_idx";

ALTER TABLE "disponibilidades"
  DROP COLUMN "mes_ano";

-- Nova constraint única sem mes_ano
ALTER TABLE "disponibilidades"
  ADD CONSTRAINT "disponibilidades_user_id_data_horario_key"
  UNIQUE ("user_id", "data", "horario");

-- Índice de cobertura para o dropdown do coordenador:
-- WHERE data = ? AND horario = ? AND status = 'DISPONIVEL' → inclui user_id
CREATE INDEX "disponibilidades_data_horario_status_user_id_idx"
  ON "disponibilidades" ("data", "horario", "status", "user_id");

-- =============================================================================
-- 3. FUNCOES — adiciona quantidade_padrao
--    Usada ao vincular funções a missas geradas automaticamente.
--    CEROFERARIO começa com 2 (dois acólitos portando velas).
-- =============================================================================

ALTER TABLE "funcoes"
  ADD COLUMN "quantidade_padrao" INTEGER NOT NULL DEFAULT 1;

UPDATE "funcoes"
  SET "quantidade_padrao" = 2
  WHERE "codigo" = 'CEROFERARIO';

-- =============================================================================
-- 4. ESCALAS — adiciona campo de observação por função
--    Permite ao coordenador deixar uma nota específica para o servidor
--    sobre aquela função naquela celebração (ex: "Usar o missal vermelho").
-- =============================================================================

ALTER TABLE "escalas"
  ADD COLUMN "observacao" TEXT;

