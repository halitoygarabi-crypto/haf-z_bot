import { Bot, InlineKeyboard } from "grammy";
import { handleTextMessage } from "./text.js";
import { handleVoiceMessage } from "./voice.js";
import { handlePhotoMessage } from "./photo.js";
import { triggerHeartbeatTest } from "../heartbeat/index.js";
import { conversationManager } from "../agent/conversation.js";
import type { EnvConfig } from "../config/env.js";
import type { MemoryManager } from "../memory/index.js";
import type { MemoryRow } from "../memory/store.js";

/**
 * Tüm handler'ları bot'a kaydeder.
 */
export function registerHandlers(
  bot: Bot,
  config: EnvConfig,
  memory: MemoryManager
): void {
  // /start komutu — Ana menüyü göster
  bot.command("start", async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text("🖼️ Görsel Üret", "action:generate_image")
      .text("🎬 Video Üret", "action:generate_video")
      .row()
      .text("📊 Trend Analizi", "action:analyze_trends")
      .text("📅 Takvim", "action:view_calendar")
      .row()
      .text("🤖 Bot Yönetimi", "action:manage_bots")
      .text("🔍 Hafıza", "action:recall_memories")
      .row()
      .text("💡 Yardım", "action:help");

    await ctx.reply(
      `👋 Merhaba Hakan! Ben **Hafız**, Baş Sosyal Medya Direktörün ve AI Stratejistin.\n\nSana nasıl yardımcı olabilirim? Aşağıdaki butonları kullanabilir veya bana doğrudan mesaj yazabilirsin.`,
      {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      }
    );
  });

  // /help komutu — tüm komutları listele
  bot.command("help", async (ctx) => {
    const helpText = `
🤖 **HafızBot Komut Rehberi**

**Temel Komutlar:**
/start - Ana menüyü ve butonları gösterir.
/help - Bu yardım mesajını görüntüler.
/status - Sistem durumunu ve aktif servisleri kontrol eder.
/reset - Mevcut konuşma geçmişini temizler.

**Hafıza Komutları:**
/remember <bilgi> - Önemli bir bilgiyi kalıcı hafızaya ekler.
/recall <sorgu> - Hafızadaki ilgili kayıtları arar.

**Özel Kısayollar:**
- Metin mesajının sonuna "reply with voice" eklerseniz sesli yanıt veririm.
- Fotoğraf göndererek analiz etmemi isteyebilirsiniz.
- Sesli mesaj göndererek benimle konuşabilirsiniz.

🚀 **HafızBot 7/24 hizmetinizde!**
    `;
    await ctx.reply(helpText, { parse_mode: "Markdown" });
  });

  // /status komutu — sistem durumunu göster
  bot.command("status", async (ctx) => {
    const statusText = `
📊 **Sistem Durumu: ÇALIŞIYOR**

👤 **Kullanıcı:** Hakan (Yetkili)
🧠 **Hafıza:** Aktif (SQLite + FTS5)
🔗 **Supabase:** ${config.SUPABASE_URL ? "Bağlı ✅" : "Bağlantı Yok ❌"}
🖼️ **Görsel (Replicate):** ${config.REPLICATE_API_TOKEN ? "Aktif ✅" : "Kapalı ❌"}
🎬 **Video (fal.ai):** ${config.FAL_API_KEY ? "Aktif ✅" : "Kapalı ❌"}
📱 **Sosyal Medya:** ${config.LIME_SOCIAL_API_KEY ? "Aktif ✅" : "Kapalı ❌"}
⚡ **Heartbeat:** ${config.HEARTBEAT_ENABLED ? "Aktif ✅" : "Kapalı ❌"}

_Tüm sistemler en son stabil sürümde çalışıyor._
    `;
    await ctx.reply(statusText, { parse_mode: "Markdown" });
  });

  // Callback Query Handler — butonlara tıklamayı işle
  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;

    if (data === "action:help") {
      await ctx.reply(`💡 Yardım menüsü için /help komutunu kullanabilirsiniz.`);
    } else if (data === "action:generate_image") {
      await ctx.reply(`🖼️ Görsel üretmek için lütfen ne üretmek istediğinizi yazın. Örn: "Avyna lüks bahçe mobilyası görseli üret"`);
    } else if (data === "action:generate_video") {
      await ctx.reply(`🎬 Video üretmek için konuyu yazın. Örn: "Sahilde modern bir villa videosu üret"`);
    } else if (data === "action:analyze_trends") {
      await ctx.reply(`📊 Trend analizi için bir sektör belirtin. Örn: "Gayrimenkul sektörü trendlerini analiz et"`);
    } else if (data === "action:view_calendar") {
      await ctx.reply(`📅 Takviminizi kontrol etmek için tarih belirtin. Örn: "Bugün takvimimde ne var?"`);
    } else if (data === "action:recall_memories") {
      await ctx.reply(`🔍 Hafızayı aramak için /recall komutunu kullanın.`);
    } else if (data === "action:manage_bots") {
      await ctx.reply(`🤖 Yardımcı botlara görev atamak için ne yapmalarını istediğinizi yazın.\nÖrn: "Avyna'ya ürün kataloğunu güncellemesini söyle" veya "Marketing bot trend analizi yapsın"`);
    }

    await ctx.answerCallbackQuery();
  });

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
      .map((r: MemoryRow, i: number) => `${i + 1}. [${r.created_at}] ${r.content}`)
      .join("\n");
    await ctx.reply(`🔍 Hafıza sonuçları (${results.length}):\n\n${formatted}`);
  });

  // /heartbeat_test komutu — hemen bir heartbeat mesajı gönder
  bot.command("heartbeat_test", async (ctx) => {
    await triggerHeartbeatTest(bot, config);
  });

  // /reset komutu — konuşma geçmişini temizle
  bot.command("reset", async (ctx) => {
    conversationManager.clear(ctx.chat.id);
    await ctx.reply("🧹 Konuşma geçmişi temizlendi. Hazırım!");
  });

  // 📸 Fotoğraf handler — vision desteği
  bot.on("message:photo", (ctx) => handlePhotoMessage(ctx, config, memory));

  // 🎤 Sesli mesaj handler
  bot.on("message:voice", (ctx) => handleVoiceMessage(ctx, config, memory));

  // 💬 Metin mesaj handler (komutlardan sonra kayıt edilmeli)
  bot.on("message:text", (ctx) => handleTextMessage(ctx, config, memory));
}
