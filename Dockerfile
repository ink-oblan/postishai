FROM node:22-bookworm-slim AS deps

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS dev

COPY . .
EXPOSE 3000
CMD ["sh", "-c", "npm ci && npm run app:dev:docker"]

FROM deps AS prod-build

COPY . .
RUN npx prisma generate
RUN npm run app:build

FROM prod-build AS migrate

CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:22-bookworm-slim AS prod

WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=prod-build /app/.next/standalone ./
COPY --from=prod-build /app/.next/static ./.next/static
COPY --from=prod-build /app/public ./public

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
