import { Context } from "grammy";
import { runAgentLoop } from "../agent/loop.js";
import { downloadPhotoAsBase64 } from "../telegram/photo.js";
import type { EnvConfig } from "../config/env.js";
import type { MemoryManager } from "../memory/index.js";

/**
 * Fotoğraf mesajı handler.
 * Kullanıcı fotoğraf gönderdiğinde görseli analiz eder.
 * Caption varsa metin olarak da değerlendirir.
 */
export async function handlePhotoMessage(
  ctx: Context,
  config: EnvConfig,
  memory: MemoryManager
): Promise<void> {
  const caption = ctx.message?.caption || "Bu görseli analiz et ve ne olduğunu anlat.";
  const chatId = ctx.chat?.id || 0;

  await ctx.replyWithChatAction("typing");

  try {
    // Fotoğrafı indir ve base64'e çevir
    const photoData = await downloadPhotoAsBase64(ctx);

    if (!photoData) {
      await ctx.reply("⚠️ Fotoğraf indirilemedi, lütfen tekrar gönder.");
      return;
    }

    console.log(`📸 Fotoğraf alındı (${(photoData.base64.length / 1024).toFixed(0)}KB), caption: "${caption}"`);

    const reply = await runAgentLoop(caption, config, memory, {
      chatId,
      imageBase64: photoData.base64,
      imageMimeType: photoData.mimeType,
    });

    await ctx.reply(reply);
  } catch (error: any) {
    console.error("═══════════════════════════════════");
    console.error("❌ Fotoğraf handler hatası:");
    console.error("  Mesaj:", error?.message || String(error));
    console.error("═══════════════════════════════════");
    await ctx.reply("❌ Fotoğrafı işlerken bir hata oluştu, lütfen tekrar deneyin.");
  }
}
