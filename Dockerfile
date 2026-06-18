FROM node:22-bookworm-slim AS base

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci && sha256sum package-lock.json > node_modules/.postishai-package-lock.sha256

FROM deps AS dev

RUN apt-get update -y && apt-get install -y curl ffmpeg && rm -rf /var/lib/apt/lists/*

COPY . .
EXPOSE 3000
CMD ["sh", "scripts/docker-dev-start.sh", "app"]

FROM deps AS prod-build

COPY . .
RUN npx prisma generate
RUN npm run app:build

FROM base AS migrate

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma

CMD ["npx", "prisma", "migrate", "deploy"]

FROM deps AS worker

RUN apt-get update -y && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

COPY . .
RUN npx prisma generate

FROM base AS prod

RUN apt-get update -y && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY --from=prod-build /app/.next/standalone ./
COPY --from=prod-build /app/.next/static ./.next/static
COPY --from=prod-build /app/public ./public
COPY --from=prod-build /app/scripts ./scripts

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
