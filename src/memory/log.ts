import fs from "node:fs";
import path from "node:path";

const MEMORY_DIR = path.resolve("memory");
const LOG_PATH = path.join(MEMORY_DIR, "memory_log.md");

/**
 * Hafıza işlem günlüğüne append-only yazma.
 * API anahtarları veya hassas veriler yazılmaz.
 */
export function appendMemoryLog(
  action: "remember" | "recall" | "auto",
  summary: string
): void {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
  }

  // Dosya yoksa başlık oluştur
  if (!fs.existsSync(LOG_PATH)) {
    fs.writeFileSync(
      LOG_PATH,
      "# 📋 HafızBot — Hafıza Günlüğü\n\nBu dosya sadece okunabilir/append-only bir kayıttır.\n\n---\n\n",
      "utf-8"
    );
  }

  const timestamp = new Date().toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
  });

  const icon =
    action === "remember" ? "💾" : action === "recall" ? "🔍" : "🤖";

  const entry = `- ${icon} \`${timestamp}\` — **${action}**: ${summary}\n`;

  fs.appendFileSync(LOG_PATH, entry, "utf-8");
}
