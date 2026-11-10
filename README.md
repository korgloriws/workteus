# Workteus

Planner de demandas para organizar trabalhos da prefeitura, projetos próprios e vida pessoal — no celular ou no desktop.

## Stack

- Next.js (App Router) + TypeScript
- SQLite (`data/workteus.db`) via Drizzle + better-sqlite3
- Auth single-user (cookie JWT)
- PWA instalável

## Desenvolvimento

```bash
npm install
npm run db:seed
npm run dev
```

Acesse `http://localhost:3000` após configurar o `.env`.

## Variáveis

Veja `.env.example`:

- `AUTH_SECRET` — segredo da sessão (obrigatório em produção)
- `ADMIN_USER` / `ADMIN_PASSWORD` — usados no seed para criar o usuário inicial
- `DATABASE_PATH` — caminho do arquivo SQLite
- `PORT` — em Docker/VPS usa `4030` (não conflita com outros serviços)

Defina usuário e senha só no seu `.env` local — não versionado.

## Deploy na VPS

### Opção A — Docker Compose (porta 4030)

```bash
cp .env.example .env
# edite AUTH_SECRET, ADMIN_USER e ADMIN_PASSWORD
docker compose up -d --build
```

Acesse `http://SEU_IP:4030`. O volume `workteus_data` persiste o SQLite. Backup = copiar o `.db`.

### Opção B — Node + PM2

```bash
npm ci
npm run db:seed
npm run build
# standalone:
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
PORT=4030 pm2 start .next/standalone/server.js --name workteus
```

Garanta que a pasta `data/` seja gravável e entre no backup.

## Funcionalidades

- Serviços (abas): criar / editar cor-nome via API / excluir
- Demandas com código `COD-YYYY-MM-#NNN`
- Status: a fazer, em andamento, pausado, pulado, concluído, desistido
- Histórico de status, soft-delete com motivo opcional
- Views por serviço: lista, tabela, calendário
- Filtros: dia / semana / mês / ano + busca
- Dashboard Hoje + gráficos dinâmicos
