-- Converte enum HorarioMissa para VARCHAR em missas
-- H09 → "09:00", H18 → "18:00"
ALTER TABLE "missas"
  ALTER COLUMN "horario" TYPE VARCHAR(5)
  USING CASE
    WHEN "horario"::text = 'H09' THEN '09:00'
    WHEN "horario"::text = 'H18' THEN '18:00'
    ELSE "horario"::text
  END;
