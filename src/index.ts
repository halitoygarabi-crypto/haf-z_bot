import { loadConfig, logConfigStatus } from "./config/env.js";
import { createBot } from "./telegram/bot.js";
import { registerHandlers } from "./handlers/index.js";
import { MemoryManager } from "./memory/index.js";
import { startHeartbeat, stopHeartbeat } from "./heartbeat/index.js";

async function main(): Promise<void> {
  // 1. Konfigürasyon yükle ve doğrula
  const config = loadConfig();
  logConfigStatus(config);

  // 2. Hafıza sistemi başlat
  const memory = new MemoryManager();
  memory.initialize();

  // 3. Bot oluştur (allowlist middleware dahil)
  const bot = createBot(config);

  // 4. Handler'ları kaydet
  registerHandlers(bot, config, memory);

  // 5. Heartbeat başlat (cron)
  startHeartbeat(bot, config);

  // 6. Graceful shutdown
  const shutdown = () => {
    console.log("\n🛑 Agent Claw kapatılıyor...");
    stopHeartbeat();
    memory.close();
    bot.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // 6. Long-polling başlat (web server yok!)
  console.log("🚀 Agent Claw hazır! Telegram'dan mesaj bekleniyor...");
  await bot.start();
}

main().catch((error) => {
  console.error("💥 Kritik hata:", error);
  process.exit(1);
});
