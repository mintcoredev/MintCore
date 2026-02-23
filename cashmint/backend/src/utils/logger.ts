export function log(level: "info" | "warn" | "error", message: string, meta?: unknown): void {
  const ts = new Date().toISOString();
  const line = meta !== undefined
    ? `[${ts}] [${level.toUpperCase()}] ${message} ${JSON.stringify(meta)}`
    : `[${ts}] [${level.toUpperCase()}] ${message}`;
  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}
