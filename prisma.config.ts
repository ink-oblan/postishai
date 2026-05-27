import "dotenv/config";
import { defineConfig } from "prisma/config";

const { DATABASE_URL, POSTGRES_PASSWORD } = process.env;
const url =
  DATABASE_URL ??
  (POSTGRES_PASSWORD
    ? `postgresql://postishai:${POSTGRES_PASSWORD}@localhost:5432/postishai?schema=public`
    : undefined);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: { url },
});
