# PostishAI

Next.js app with a PostgreSQL-backed Prisma database and a separate worker process.

## Source Layout

Application source code lives in `src/`:

- `src/app`: Next.js App Router routes, layouts, API routes, and prompt templates
- `src/components`: React components
- `src/lib`: shared application libraries
- `src/workers` and `src/worker.ts`: background worker entrypoint and jobs
- `src/scripts`: project scripts run through npm

Root-level config, Prisma schema/migrations, Docker files, environment files, and `public/` stay at the repository root for their respective tools.

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
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

`docker-compose.prod.yml` is an override file — it only contains prod-specific values (build target, commands, volumes). The base `docker-compose.yml` is always required. Replace the default PostgreSQL credentials before deploying outside local infrastructure.

## Optional PostgreSQL Backups

Create a compressed custom-format `pg_dump` backup and upload it to S3:

```bash
npm run backup:db
```

Required environment for backup to work:

- `DATABASE_URL`: PostgreSQL connection URL to back up. You can override it with `POSTGRES_BACKUP_DATABASE_URL`.
- `POSTGRES_BACKUP_S3_BUCKET` or `S3_BUCKET`: destination S3 bucket.
- `AWS_REGION` or `AWS_DEFAULT_REGION`: destination bucket region.
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`: credentials with `s3:PutObject` access.

Optional environment:

- `POSTGRES_BACKUP_S3_PREFIX` or `S3_PREFIX`: S3 key prefix. Defaults to `postgres`.
- `POSTGRES_BACKUP_ENV`: environment segment in the S3 key. Defaults to `NODE_ENV` or `local`.
- `POSTGRES_BACKUP_DOCKER_SERVICE`: run `pg_dump` through `docker compose exec -T <service>`.
- `POSTGRES_BACKUP_COMPOSE_FILE`: comma-separated compose files used with Docker mode.

For the compose database service, run from the host with the Postgres container's `pg_dump`:

```bash
POSTGRES_BACKUP_DOCKER_SERVICE=db npm run backup:db
```

For production compose:

```bash
POSTGRES_BACKUP_DOCKER_SERVICE=db \
POSTGRES_BACKUP_COMPOSE_FILE=docker-compose.yml,docker-compose.prod.yml \
POSTGRES_BACKUP_ENV=prod \
npm run backup:db
```
