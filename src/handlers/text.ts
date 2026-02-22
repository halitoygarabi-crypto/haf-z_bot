import { Context } from "grammy";
import { runAgentLoop } from "../agent/loop.js";
import { synthesize } from "../tts/index.js";
import { cleanupTempFile } from "../telegram/voice.js";
import { InputFile } from "grammy";
import type { EnvConfig } from "../config/env.js";
import type { MemoryManager } from "../memory/index.js";

const VOICE_TRIGGER = "reply with voice";

/**
 * Metin mesajı handler.
 * "reply with voice" içeriyorsa sesli yanıt gönderir.
 */
export async function handleTextMessage(
  ctx: Context,
  config: EnvConfig,
  memory: MemoryManager
): Promise<void> {
  const text = ctx.message?.text;
  if (!text) return;

  const chatId = ctx.chat?.id || 0;
  const wantsVoice = text.toLowerCase().includes(VOICE_TRIGGER);
  const cleanedText = wantsVoice
    ? text.toLowerCase().replace(VOICE_TRIGGER, "").trim() || text
    : text;

  // Düşünüyor göstergesi
  await ctx.replyWithChatAction("typing");

  try {
    const reply = await runAgentLoop(cleanedText, config, memory, { chatId });

    if (wantsVoice) {
      if (!config.TTS_API_KEY && !config.MOCK_TTS) {
        await ctx.reply(reply);
        await ctx.reply(
          "⚠️ Sesli yanıt şu an kullanılamıyor (TTS_API_KEY ayarlanmamış). Metin olarak yanıtladım."
        );
        return;
      }

      let ttsPath: string | null = null;
      try {
        ttsPath = await synthesize(reply, config);
        await ctx.replyWithVoice(new InputFile(ttsPath));
      } catch (ttsError) {
        console.error("TTS hatası:", ttsError);
        await ctx.reply(reply);
        await ctx.reply("⚠️ Sesli yanıt oluşturulamadı, metin olarak gönderdim.");
      } finally {
        if (ttsPath) cleanupTempFile(ttsPath);
      }
    } else {
      await ctx.reply(reply);
    }
  } catch (error: any) {
    console.error("═══════════════════════════════════");
    console.error("❌ Metin handler hatası:");
    console.error("  Mesaj:", error?.message || String(error));
    console.error("  Stack:", error?.stack || "N/A");
    console.error("  Kullanıcı mesajı:", text);
    console.error("═══════════════════════════════════");
    await ctx.reply("❌ Bir hata oluştu, lütfen tekrar deneyin.");
  }
}
