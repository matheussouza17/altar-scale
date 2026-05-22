import "dotenv/config";
import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiRouter } from "./routes/index.js";
import { swaggerSpec } from "./swagger/swagger.js";
import { ensureCurrentAndNextMonth, startMonthlySundaysJob } from "./jobs/generateSundays.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "EscalaAltar API",
    swaggerOptions: { persistAuthorization: true },
  }),
);

app.get("/api/docs.json", (_req, res) => {
  res.json(swaggerSpec);
});

app.use("/api", apiRouter);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`EscalaAltar API: http://localhost:${env.PORT}/api`);
  console.log(`Swagger UI:      http://localhost:${env.PORT}/api/docs`);
  // Gera missas dominicais imediatas (mês atual e próximo) e inicia job mensal
  ensureCurrentAndNextMonth().catch((err) => console.error("Erro ao garantir missas iniciais:", err));
  startMonthlySundaysJob();
});
