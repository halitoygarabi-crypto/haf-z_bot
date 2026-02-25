import { MissionControl } from "../agent/mission_control.js";
import { runAvynaLoop } from "../agent/avyna_loop.js";
import type { EnvConfig } from "../config/env.js";
import type { MemoryManager } from "../memory/index.js";
import { Bot } from "grammy";

export class SubordinateManager {
  private static isRunning = false;

  /**
   * Yardımcı botların görevlerini periyodik olarak kontrol eder.
   */
  static start(bot: Bot, config: EnvConfig, memory: MemoryManager) {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log("🕵️ Yardımcı bot servisleri (Avyna & Utus) aktif. Görev bekleniyor...");

    // Her 30 saniyede bir görev kontrolü yap
    setInterval(async () => {
      try {
        await this.processAvynaTasks(bot, config, memory);
        // Gelecekte Utus buraya eklenebilir
      } catch (error) {
        console.error("[SubordinateManager] Error checking tasks:", error);
      }
    }, 30000);
  }

  private static async processAvynaTasks(bot: Bot, config: EnvConfig, memory: MemoryManager) {
    const tasks = await MissionControl.fetchPendingTasks("avyna", config);
    if (tasks.length === 0) return;

    for (const task of tasks) {
      console.log(`🤖 Avyna Görevi İşleniyor: ${task.command}`);
      
      try {
        // Avyna'nın beynini çalıştır
        const result = await runAvynaLoop(task.command, config, memory);
        
        // Görevi kapat
        await MissionControl.completeTask(task.id, result, config);
        
        // Sahibine (Hakan'a) rapor ver
        await bot.api.sendMessage(
          config.TELEGRAM_ALLOWLIST_USER_ID,
          `✅ **Avyna Bot Raporu:**\n\n"${task.command}" görevi tamamlandı.\n\nSonuç: ${result}`
        );
      } catch (error) {
        console.error(`[AvynaWorker] Error processing task ${task.id}:`, error);
        await MissionControl.failTask(task.id, String(error), config);
      }
    }
  }
}
