/**
 * Agent Claw — Heartbeat sistemi.
 * Her gün 08:00'de (Europe/Istanbul) kullanıcıya günlük mesaj gönderir.
 */

import cron from "node-cron";
import type { Bot } from "grammy";
import type { EnvConfig } from "../config/env.js";

const HEARTBEAT_MESSAGE = `☀️ Günaydın! Agent Claw burada.

1️⃣ **Bugün #1 önceliğin ne?**
2️⃣ **Kaldırmamı istediğin bir engel var mı?**

Yaz, hemen bakalım 🚀`;

let scheduledTask: cron.ScheduledTask | null = null;

/**
 * Heartbeat mesajını gönderir.
 */
async function sendHeartbeat(bot: Bot, userId: number): Promise<void> {
  try {
    await bot.api.sendMessage(userId, HEARTBEAT_MESSAGE, {
      parse_mode: "Markdown",
    });
    const now = new Date().toLocaleString("tr-TR", {
      timeZone: "Europe/Istanbul",
    });
    console.log(`💓 Heartbeat gönderildi (${now})`);
  } catch (error) {
    console.error("💔 Heartbeat gönderilemedi:", String(error));
  }
}

/**
 * Heartbeat cron job'unu başlatır.
 * Her gün 08:00 (Europe/Istanbul) çalışır.
 */
export function startHeartbeat(bot: Bot, config: EnvConfig): void {
  if (!config.HEARTBEAT_ENABLED) {
    console.log("⏸️  Heartbeat kapalı (HEARTBEAT_ENABLED=false)");
    return;
  }

  const userId = config.TELEGRAM_ALLOWLIST_USER_ID;

  // Her gün saat 08:00 (Europe/Istanbul)
  scheduledTask = cron.schedule(
    "0 8 * * *",
    () => {
      sendHeartbeat(bot, userId);
    },
    {
      timezone: "Europe/Istanbul",
    }
  );

  console.log("💓 Heartbeat aktif — her gün 08:00 (Europe/Istanbul)");
}

/**
 * Heartbeat'i durdurur (graceful shutdown).
 */
export function stopHeartbeat(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log("💓 Heartbeat durduruldu");
  }
}

/**
 * Manuel test: hemen bir heartbeat gönderir.
 */
export async function triggerHeartbeatTest(
  bot: Bot,
  userId: number
): Promise<void> {
  await sendHeartbeat(bot, userId);
}
