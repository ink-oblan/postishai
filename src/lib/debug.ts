// Development-only logging utilities
export function debugLog(...args: unknown[]): void {
  if (process.env.NODE_ENV === "development") {
    console.log(...args);
  }
}

export function debugError(...args: unknown[]): void {
  if (process.env.NODE_ENV === "development") {
    console.error(...args);
  }
}

export function debugInfo(...args: unknown[]): void {
  if (process.env.NODE_ENV === "development") {
    console.info(...args);
  }
}
