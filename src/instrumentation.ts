import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { isTruthyEnv } from "./lib/utils";

const selfDeployment =
  process.env.NEXT_PUBLIC_SELF_DEPLOYMENT === undefined ||
  isTruthyEnv(process.env.NEXT_PUBLIC_SELF_DEPLOYMENT);

let posthogLoggerProvider: LoggerProvider | undefined;

if (!selfDeployment) {
  const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (projectToken && host) {
    posthogLoggerProvider = new LoggerProvider({
      resource: resourceFromAttributes({ "service.name": "postishai" }),
      processors: [
        new BatchLogRecordProcessor({
          exporter: new OTLPLogExporter({
            url: `${host}/i/v1/logs`,
            headers: {
              Authorization: `Bearer ${projectToken}`,
              "Content-Type": "application/json",
            },
          }),
        }),
      ],
    });
  }
}

function bridgeConsoleToOtel() {
  const logger = logs.getLogger("console");

  const methods = [
    { name: "debug" as const, severity: SeverityNumber.DEBUG },
    { name: "log" as const, severity: SeverityNumber.INFO },
    { name: "info" as const, severity: SeverityNumber.INFO },
    { name: "warn" as const, severity: SeverityNumber.WARN },
    { name: "error" as const, severity: SeverityNumber.ERROR },
  ];

  for (const { name, severity } of methods) {
    const original = console[name].bind(console);
    console[name] = (...args: unknown[]) => {
      original(...args);
      logger.emit({
        severityNumber: severity,
        severityText: name.toUpperCase(),
        body: args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "),
      });
    };
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  if (posthogLoggerProvider) {
    logs.setGlobalLoggerProvider(posthogLoggerProvider);
    bridgeConsoleToOtel();
  }

  const { assertStorageModeInitialized } = await import("./lib/platform-config");
  await assertStorageModeInitialized();
}
