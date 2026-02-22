import { Bot } from "grammy";
import { handleTextMessage } from "./text.js";
import { handleVoiceMessage } from "./voice.js";
import { handlePhotoMessage } from "./photo.js";
import { triggerHeartbeatTest } from "../heartbeat/index.js";
import type { EnvConfig } from "../config/env.js";
import type { MemoryManager } from "../memory/index.js";

/**
 * Tüm handler'ları bot'a kaydeder.
 */
export function registerHandlers(
  bot: Bot,
  config: EnvConfig,
  memory: MemoryManager
): void {
  // /remember komutu — kullanıcıdan açık hafıza kayıt
  bot.command("remember", async (ctx) => {
    const text = ctx.match;
    if (!text) {
      await ctx.reply("Kullanım: /remember <hatırlanacak bilgi>");
      return;
    }
    const id = memory.remember(text, "user-command");
    await ctx.reply(`💾 Hafızaya kaydedildi (ID: ${id}):\n"${text}"`);
  });

  // /recall komutu — hafızadan ilgili anıları getir
  bot.command("recall", async (ctx) => {
    const query = ctx.match;
    if (!query) {
      await ctx.reply("Kullanım: /recall <arama sorgusu>");
      return;
    }
    const results = memory.recall(query, 5);
    if (results.length === 0) {
      await ctx.reply("🔍 Bu konuyla ilgili hafızada kayıt bulunamadı.");
      return;
    }
    const formatted = results
      .map((r, i) => `${i + 1}. [${r.created_at}] ${r.content}`)
      .join("\n");
    await ctx.reply(`🔍 Hafıza sonuçları (${results.length}):\n\n${formatted}`);
  });

  // /heartbeat_test komutu — hemen bir heartbeat mesajı gönder
  bot.command("heartbeat_test", async (ctx) => {
    await triggerHeartbeatTest(bot, config.TELEGRAM_ALLOWLIST_USER_ID);
  });

  // 📸 Fotoğraf handler — vision desteği
  bot.on("message:photo", (ctx) => handlePhotoMessage(ctx, config, memory));

  // 🎤 Sesli mesaj handler
  bot.on("message:voice", (ctx) => handleVoiceMessage(ctx, config, memory));

  // 💬 Metin mesaj handler (komutlardan sonra kayıt edilmeli)
  bot.on("message:text", (ctx) => handleTextMessage(ctx, config, memory));
}
