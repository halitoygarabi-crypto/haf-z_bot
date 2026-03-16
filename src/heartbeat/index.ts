/**
 * Agent Claw — Heartbeat sistemi.
 * Her gün 08:00'de (Europe/Istanbul) kullanıcıya günlük mesaj gönderir.
 */

import cron from "node-cron";
import type { Bot } from "grammy";
import type { EnvConfig } from "../config/env.js";
import { DashboardService } from "../services/dashboard_service.js";
import { getEventsForDate } from "../mcp/calendar.js";

const HEARTBEAT_MESSAGE = `☀️ Günaydın! Agent Claw burada.

1️⃣ **Bugün #1 önceliğin ne?**
2️⃣ **Kaldırmamı istediğin bir engel var mı?**

Yaz, hemen bakalım 🚀`;

let scheduledTask: cron.ScheduledTask | null = null;

/**
 * Heartbeat mesajını gönderir.
 */
/**
 * Heartbeat mesajını gönderir (Akıllı Sabah Brifingi).
 */
async function sendHeartbeat(bot: Bot, config: EnvConfig): Promise<void> {
  const userId = config.TELEGRAM_ALLOWLIST_USER_ID;
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];

  let message = `☀️ **Günaydın Hakan! Agent Claw Raporu**\n\n`;

  // 📅 1. Takvim Etkinlikleri
  if (config.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
    try {
      const events = await getEventsForDate(dateStr, {
        serviceAccountKeyPath: config.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
        calendarId: config.GOOGLE_CALENDAR_ID,
      });
      if (events.length > 0) {
        message += `🗓️ **Bugünkü Programın:**\n`;
        events.map((e, i) => {
          message += `${i + 1}. ⏰ ${e.time} — ${e.title}${e.location ? ` 📍 ${e.location}` : ""}\n`;
        });
        message += `\n`;
      } else {
        message += `🗓️ Bugün takvimin boş görünüyor.\n\n`;
      }
    } catch (err) {
      console.error("Heartbeat Calendar Error:", err);
    }
  }

  // 📊 2. Sosyal Medya İstatistikleri
  if (config.SUPABASE_URL) {
    try {
      const stats = await DashboardService.getStats(config);
      if (stats && stats.length > 0) {
        message += `📈 **Sosyal Medya Özeti:**\n`;
        stats.forEach((s: any) => {
          message += `- [${s.platform.toUpperCase()}] ${s.followers?.toLocaleString() || 0} takipçi | %${s.avg_engagement_rate || 0} etkileşim\n`;
        });
        message += `\n`;
      }
    } catch (err) {
      console.error("Heartbeat Stats Error:", err);
    }
  }

  message += `💡 **Günün Hatırlatması:**\n- Bugün bir içerik planlamak ister misin?\n- Trendleri analiz etmemi ister misin?\n\n🚀 Başlamak için bana yazabilir veya /start diyebilirsin.`;

  try {
    await bot.api.sendMessage(userId, message, {
      parse_mode: "Markdown",
    });
    console.log(`💓 Akıllı Heartbeat gönderildi (${now.toLocaleTimeString()})`);
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
      sendHeartbeat(bot, config);
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
  config: EnvConfig
): Promise<void> {
  await sendHeartbeat(bot, config);
}
