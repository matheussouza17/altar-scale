# EscalaAltar

Sistema de gestão de escalas para **Acólitos e Coroinhas** (servidores do altar).

## Stack

| Camada    | Tecnologia              |
|-----------|-------------------------|
| API       | Node.js + Express 5     |
| ORM       | Prisma                  |
| Banco     | PostgreSQL (Supabase) |
| Frontend  | Next.js *(futuro)*      |

## Documentação

- [Setup e variáveis de ambiente](docs/SETUP.md)
- [Modelo de dados (schema)](docs/SCHEMA.md)
- [Referência da API REST](docs/API.md)

## Início rápido

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

A API sobe em `http://localhost:3001/api`.  
**Swagger:** `http://localhost:3001/api/docs`

Configure `JWT_SECRET` no `.env` (mín. 32 caracteres). Opcional: `ADMIN_EMAIL` / `ADMIN_PASSWORD` para o seed criar o primeiro admin.

### Endpoint principal (coordenador)

Ao montar a escala de uma missa, use:

`GET /api/missas/:missaId/servidores-disponiveis?funcaoId=...`

Retorna somente servidores que marcaram **disponível** na **data** e **horário** daquela missa.

## Estrutura do repositório

```
prisma/
  schema.prisma    # modelo de dados
  seed.ts          # catálogo de funções
src/
  routes/          # rotas HTTP
  services/        # regras de negócio
  validators/      # schemas Zod
  lib/             # prisma, erros, utilitários
docs/              # documentação detalhada
```
