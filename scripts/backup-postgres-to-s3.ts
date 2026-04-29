/**
 * Back up the PostgreSQL database to S3.
 *
 * Run with: npm run backup:db
 */
import "dotenv/config";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createReadStream, createWriteStream, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type DumpConfig = {
  args: string[];
  env: NodeJS.ProcessEnv;
};

type S3Target = {
  bucket: string;
  region: string;
};

function optionalEnv(name: string) {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

function requiredEnv(name: string) {
  const value = optionalEnv(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function timestamp() {
  return new Date()
    .toISOString()
    .replaceAll(":", "-")
    .replace(/\.\d{3}Z$/, "Z");
}

function buildDumpConfig(databaseUrl: string): DumpConfig {
  const url = new URL(databaseUrl);
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("DATABASE_URL must use postgresql:// or postgres://");
  }

  const schema = url.searchParams.get("schema");
  const sslMode = url.searchParams.get("sslmode");
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!database) throw new Error("DATABASE_URL must include a database name");

  const args = [
    "--format=custom",
    "--compress=9",
    "--no-owner",
    "--no-privileges",
    "-h",
    url.hostname,
    "-p",
    url.port || "5432",
    "-U",
    decodeURIComponent(url.username),
    "-d",
    database,
  ];

  if (schema) args.push("--schema", schema);

  const env = { ...process.env };
  if (url.password) env.PGPASSWORD = decodeURIComponent(url.password);
  if (sslMode) env.PGSSLMODE = sslMode;

  return { args, env };
}

function buildDumpCommand(config: DumpConfig) {
  const dockerService = optionalEnv("POSTGRES_BACKUP_DOCKER_SERVICE");
  if (!dockerService) {
    return {
      command: optionalEnv("PG_DUMP_BIN") ?? "pg_dump",
      args: config.args,
      env: config.env,
    };
  }

  const composeFiles = (optionalEnv("POSTGRES_BACKUP_COMPOSE_FILE") ?? "")
    .split(",")
    .map((file) => file.trim())
    .filter(Boolean);

  const args = ["compose"];
  for (const file of composeFiles) args.push("-f", file);
  args.push("exec", "-T");
  if (config.env.PGPASSWORD) args.push("-e", "PGPASSWORD");
  if (config.env.PGSSLMODE) args.push("-e", "PGSSLMODE");
  args.push(dockerService, optionalEnv("PG_DUMP_BIN") ?? "pg_dump", ...config.args);

  return {
    command: optionalEnv("DOCKER_BIN") ?? "docker",
    args,
    env: config.env,
  };
}

async function runDump(outputPath: string, databaseUrl: string) {
  const dumpConfig = buildDumpConfig(databaseUrl);
  const dumpCommand = buildDumpCommand(dumpConfig);
  const child = spawn(dumpCommand.command, dumpCommand.args, {
    env: dumpCommand.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const stderr: Buffer[] = [];
  child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));

  const closePromise = once(child, "close");
  const errorPromise = once(child, "error").then(([error]) => {
    throw error;
  });

  await Promise.all([
    pipeline(child.stdout, createWriteStream(outputPath)),
    Promise.race([closePromise, errorPromise]),
  ]);

  if (child.exitCode !== 0) {
    const message = Buffer.concat(stderr).toString("utf8").trim();
    throw new Error(`pg_dump failed${message ? `: ${message}` : ""}`);
  }
}

function s3Key(fileName: string) {
  const prefix = optionalEnv("POSTGRES_BACKUP_S3_PREFIX") ?? "postgres";
  return [prefix, fileName]
    .map((part) => part.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

function getS3Target(): S3Target {
  const bucket = requiredEnv("S3_BUCKET");
  const region = requiredEnv("AWS_REGION");
  requiredEnv("AWS_ACCESS_KEY_ID");
  requiredEnv("AWS_SECRET_ACCESS_KEY");

  return { bucket, region };
}

async function uploadBackup(filePath: string, key: string, databaseUrl: string, target: S3Target) {
  const client = new S3Client({
    region: target.region,
  });

  const stat = statSync(filePath);
  const serverSideEncryption = optionalEnv("S3_SERVER_SIDE_ENCRYPTION") as
    | "AES256"
    | "aws:kms"
    | "aws:kms:dsse"
    | undefined;

  await client.send(
    new PutObjectCommand({
      Bucket: target.bucket,
      Key: key,
      Body: createReadStream(filePath),
      ContentLength: stat.size,
      ContentType: "application/octet-stream",
      ServerSideEncryption: serverSideEncryption,
      SSEKMSKeyId: optionalEnv("S3_KMS_KEY_ID"),
      Metadata: {
        "backup-type": "postgres",
        "source-database": new URL(databaseUrl).pathname.replace(/^\//, ""),
      },
    }),
  );

  return { bucket: target.bucket, size: stat.size };
}

async function main() {
  const databaseUrl = optionalEnv("POSTGRES_BACKUP_DATABASE_URL") ?? requiredEnv("DATABASE_URL");
  const target = getS3Target();
  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "") || "database";
  const fileName = `${databaseName}-${timestamp()}.dump`;
  const tempDir = mkdtempSync(path.join(tmpdir(), "postishai-postgres-backup-"));
  const dumpPath = path.join(tempDir, fileName);

  try {
    console.log(`Creating PostgreSQL backup: ${fileName}`);
    await runDump(dumpPath, databaseUrl);

    const key = s3Key(fileName);
    console.log(`Uploading backup to s3://${target.bucket}/${key}`);
    const result = await uploadBackup(dumpPath, key, databaseUrl, target);

    console.log(`Backup uploaded: s3://${result.bucket}/${key} (${result.size} bytes)`);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
