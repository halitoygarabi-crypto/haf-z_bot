import fs from "node:fs";
import path from "node:path";

const LOG_FILE = path.join(process.cwd(), "hafiz-debug.log");

/**
 * Dosyaya log yazar — terminal buffer kesilmesini önler.
 */
export function debugLog(...args: unknown[]): void {
  const timestamp = new Date().toISOString();
  const message = args.map(a => typeof a === "string" ? a : JSON.stringify(a, null, 2)).join(" ");
  const line = `[${timestamp}] ${message}\n`;
  
  // Hem konsola hem dosyaya yaz
  console.log(...args);
  fs.appendFileSync(LOG_FILE, line, "utf-8");
}

/**
 * Log dosyasını temizle.
 */
export function clearDebugLog(): void {
  fs.writeFileSync(LOG_FILE, `--- HafızBot Debug Log ---\nStarted: ${new Date().toISOString()}\n\n`, "utf-8");
}
