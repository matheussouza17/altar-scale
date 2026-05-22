import swaggerJsdoc from "swagger-jsdoc";
import { env } from "../config/env.js";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "EscalaAltar API",
      version: "0.1.0",
      description:
        "API de gestão de escalas para Acólitos e Coroinhas. Autenticação via JWT (Bearer).",
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}/api`,
        description: "Desenvolvimento local",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
            message: { type: "string" },
          },
        },
        TokenResponse: {
          type: "object",
          properties: {
            token: {
              type: "string",
              description:
                "JWT. Payload: sub (id), email, nome, telefone, papel, iat, exp",
            },
          },
        },
      },
    },
    tags: [
      { name: "Auth", description: "Login, cadastro e perfil" },
      { name: "Health", description: "Status da API" },
      { name: "Funções", description: "Catálogo de funções litúrgicas" },
      { name: "Usuários", description: "Servidores cadastrados" },
      { name: "Disponibilidades", description: "Painel mensal do servidor" },
      { name: "Missas", description: "Missas e montagem de escala" },
    ],
  },
  apis: ["./src/routes/**/*.ts", "./src/swagger/paths.yaml"],
};

export const swaggerSpec = swaggerJsdoc(options);
