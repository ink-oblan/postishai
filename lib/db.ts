import path from "node:path";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
  const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  // WAL mode allows concurrent readers + one writer; busy_timeout retries writes
  // instead of immediately failing when the DB is locked by another process.
  client.$executeRawUnsafe("PRAGMA journal_mode=WAL").catch(() => {});
  client.$executeRawUnsafe("PRAGMA busy_timeout=5000").catch(() => {});
  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
