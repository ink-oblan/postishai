# PostishAI

<p align="center">
  <img src="./public/static/full-logo.svg" width="220" height="120" />
</p>

<p align="center">
  Self-hosted AI platform for creating social media content — scripts, avatar videos.
</p>

<p align="center">
  <a href="https://github.com/ink-oblan/postishai/actions/workflows/deploy.yml"><img src="https://github.com/ink-oblan/postishai/actions/workflows/deploy.yml/badge.svg" alt="Deploy" /></a>
  <a href="./LICENSE.md"><img src="https://img.shields.io/badge/license-Sustainable%20Use-blue" alt="License" /></a>
  <img src="https://img.shields.io/badge/self--hosted-%E2%9C%93-green" alt="Self-hosted" />
  <a href="https://github.com/ink-oblan/postishai/pkgs/container/postishai"><img src="https://img.shields.io/badge/docker-ghcr.io-blue?logo=docker" alt="Docker" /></a>
</p>

---

## Quick start

**Prerequisites:** Docker with Compose plugin

**1. Clone and configure**

```bash
git clone https://github.com/ink-oblan/postishai.git
cd postishai
cp .env.example .env
```

**2. Set required environment variables in `.env`**

| Variable | Description |
|---|---|
| `HEYGEN_API_KEY` | [HeyGen API settings](https://app.heygen.com/settings?nav=API) - for avatar generation |
| `GOOGLE_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) - LLM |

**3. Start**

```bash
IMAGE_BASE=ghcr.io/ink-oblan/postishai IMAGE_TAG=latest docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

You're all set!🎉
Open http://localhost:3000 to see platform.

---

<p align="center">
  If you you found this project useful, <a href="https://github.com/ink-oblan/postishai/stargazers">⭐ star the repo</a> — it helps others find it.
</p>

---

## Before going to production

Update at least these environment variables. You can check `.env` file for many optional configurations like S3 storage and backups later.

| Variable | Purpose |
|---|---|
| `SESSION_SECRET` | Generate: `openssl rand -hex 32` for user sessions auth secret |
| `NEXT_PUBLIC_APP_URL` | Your public URL, e.g. `https://postishai.example.com` |
| `POSTGRES_PASSWORD` | Any strong password for the database|

## Develop

**Prerequisites:** Docker with Compose plugin.
```bash
git clone https://github.com/ink-oblan/postishai.git
cd postishai
cp .env.example .env # Fill in HEYGEN_API_KEY and GOOGLE_API_KEY in .env
```

Start dev docker compose

```bash
docker compose up -d
```

The dev server starts at **http://localhost:3000** with hot reload. Logs:
- `docker compose logs -f app` or `tail -f dev.log`
- `docker compose logs -f worker` or `tail -f worker.log`

**Database migrations** — after changing `prisma/schema.prisma`:

```bash
npm run db:migrate -- --name <snake_case_description>
npm run db:generate
```

---

### Stack

| Layer | Technology |
|---|---|
| Frontend / API | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL 18 via Prisma |
| Background jobs | Custom worker process (Node.js 22) |
| Video processing | ffmpeg (GPU-accelerated by default, CPU fallback available) |
| AI | Google Gemini, HeyGen (avatar videos) |
| Container | Docker + Compose |

---

### Source layout

```
src/
  app/          # Next.js App Router — routes, API handlers, prompt templates
  components/   # React components
  lib/          # Shared application libraries
  workers/      # Background job definitions
  worker.ts     # Worker entrypoint
scripts/        # Provisioning and utility scripts
prisma/         # Schema and migrations
```

---

### Contributing

[Fork repo](https://github.com/ink-oblan/postishai/fork) and:

1. Branch off `main`: `feat/my-feature`, `fix/bug-name`
2. Keep PRs focused — one logical change per PR
3. Open a pull request against `main` in [postishai](https://github.com/ink-oblan/postishai) repo

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```
feat(posts): add AI script generation

- add POST /api/posts/generate-script endpoint
- add Handlebars prompt template for script generation
- add "Write with AI" button to PostWizard
```
