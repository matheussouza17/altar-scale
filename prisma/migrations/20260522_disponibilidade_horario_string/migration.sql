-- Converte enum HorarioMissa para VARCHAR em disponibilidades
ALTER TABLE "disponibilidades"
  ALTER COLUMN "horario" TYPE VARCHAR(5)
  USING CASE
    WHEN "horario"::text = 'H09' THEN '09:00'
    WHEN "horario"::text = 'H18' THEN '18:00'
    ELSE "horario"::text
  END;
