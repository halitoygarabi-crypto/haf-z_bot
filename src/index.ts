import { loadConfig, logConfigStatus } from "./config/env.js";
import { clearDebugLog } from "./utils/logger.js";
import { createBot } from "./telegram/bot.js";
import { registerHandlers } from "./handlers/index.js";
import { MemoryManager } from "./memory/index.js";
import { startHeartbeat, stopHeartbeat } from "./heartbeat/index.js";
import { SubordinateManager } from "./services/subordinate_manager.js";

async function main(): Promise<void> {
  // 0. Debug log temizle
  clearDebugLog();

  // 1. Konfigürasyon yükle ve doğrula
  const config = loadConfig();
  logConfigStatus(config);

  // 2. Rol bazlı token seçimi
  let botToken = config.TELEGRAM_BOT_TOKEN;
  if (config.BOT_ROLE === "hafiz" && config.HAFIZ_BOT_TOKEN) {
    botToken = config.HAFIZ_BOT_TOKEN;
  } else if (config.BOT_ROLE === "polmark_ai" && config.POLMARK_AI_BOT_TOKEN) {
    botToken = config.POLMARK_AI_BOT_TOKEN;
  } else if (config.BOT_ROLE === "sferif" && config.SFERIF_BOT_TOKEN) {
    botToken = config.SFERIF_BOT_TOKEN;
  } else if (config.BOT_ROLE === "bozo" && config.BOZO_BOT_TOKEN) {
    botToken = config.BOZO_BOT_TOKEN;
  }

  // 3. Hafıza sistemi başlat
  const memory = new MemoryManager(config.BOT_ROLE);
  memory.initialize();

  // 4. Bot oluştur (allowlist middleware dahil)
  const bot = new (await import("grammy")).Bot(botToken);
  
  // Allowlist middleware
  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId || userId !== config.TELEGRAM_ALLOWLIST_USER_ID) return;
    await next();
  });

  // 5. Handler'ları kaydet
  registerHandlers(bot, config, memory);

  // 6. Heartbeat başlat (sadece hafız botu için isteğe bağlı, ama genel kalsın)
  if (config.BOT_ROLE === "hafiz") {
    startHeartbeat(bot, config);
    SubordinateManager.start(bot, config, memory);
  }

  // 6. Graceful shutdown
  const shutdown = () => {
    console.log("\n🛑 HafızBot kapatılıyor...");
    stopHeartbeat();
    memory.close();
    bot.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // 6. Long-polling başlat (web server yok!)
  console.log("🚀 HafızBot hazır! Telegram'dan mesaj bekleniyor...");
  await bot.start();
}

main().catch((error) => {
  console.error("💥 Kritik hata:", error);
  process.exit(1);
});
