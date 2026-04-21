# PostishAI

Next.js app with a PostgreSQL-backed Prisma database and a separate worker process.

## Local Docker Development

Copy `.env.example` to `.env` and fill in the API credentials:

```bash
cp .env.example .env
docker compose up --build
```

The compose stack starts:

- `db`: PostgreSQL 18.3
- `app`: Next.js dev server on http://localhost:3000
- `worker`: background job worker

The app and worker stream logs into `dev.log` and `worker.log` in the repository root.

## Production Compose

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

The production compose file builds the Next.js app, applies migrations, starts `next start`, and starts the worker. Replace the default PostgreSQL credentials before deploying outside local infrastructure.
