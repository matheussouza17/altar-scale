# Setup — EscalaAltar (Backend)

## Pré-requisitos

- Node.js 20+
- Conta Supabase com projeto PostgreSQL
- Git *(opcional)*

## 1. Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

| Variável       | Uso |
|----------------|-----|
| `DATABASE_URL` | Conexão **pooler** (porta 6543, `?pgbouncer=true`) — runtime da API |
| `DIRECT_URL`   | Conexão **direta** (porta 5432) — migrations Prisma |
| `PORT`         | Porta da API (padrão `3001`) |
| `JWT_SECRET`   | Segredo do JWT (mín. 32 caracteres) |
| `JWT_EXPIRES_IN` | Validade do token (ex: `7d`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Opcional — admin criado no seed |

No painel Supabase: **Project Settings → Database → Connection string**.

## Swagger

Com a API rodando: **http://localhost:3001/api/docs**  
Clique em **Authorize** e cole `Bearer <token>` obtido no login.

## 2. Instalação

```bash
npm install
npm run db:generate
```

## 3. Migrations e seed

```bash
npm run db:migrate
npm run db:seed
```

O seed popula o catálogo de funções (MC, Altar, Cruz, etc.).

Para prototipar sem migration formal:

```bash
npm run db:push
npm run db:seed
```

## 4. Executar a API

```bash
npm run dev
```

Verifique: `GET http://localhost:3001/api/health`

## 5. Prisma Studio (opcional)

```bash
npm run db:studio
```

## Autenticação JWT

1. `POST /api/auth/login` ou cadastro `POST /api/auth/register`
2. Use o `token` retornado em `Authorization: Bearer ...`
3. Primeiro admin: defina variáveis no `.env` e rode `npm run db:seed`

## Próximos passos sugeridos

- [ ] Job para gerar missas dominicais do mês (9h e 18h)
- [ ] Frontend Next.js (painel servidor + painel coordenador)
