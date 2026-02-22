import { Context } from "grammy";
import { downloadVoiceMessage, cleanupTempFile } from "../telegram/voice.js";
import { transcribe } from "../transcription/index.js";
import { runAgentLoop } from "../agent/loop.js";
import type { EnvConfig } from "../config/env.js";
import type { MemoryManager } from "../memory/index.js";

/**
 * Sesli mesaj handler.
 */
export async function handleVoiceMessage(
  ctx: Context,
  config: EnvConfig,
  memory: MemoryManager
): Promise<void> {
  if (!config.TRANSCRIPTION_API_KEY && !config.MOCK_TRANSCRIPTION) {
    await ctx.reply(
      "⚠️ Ses mesajı desteği şu an kapalı. TRANSCRIPTION_API_KEY ayarlanmamış."
    );
    return;
  }

  let voicePath: string | null = null;

  try {
    await ctx.replyWithChatAction("typing");
    voicePath = await downloadVoiceMessage(ctx);
    const transcription = await transcribe(voicePath, config);
    await ctx.reply(`🎤 Transkripsiyon:\n${transcription}`);
    await ctx.replyWithChatAction("typing");
    const reply = await runAgentLoop(transcription, config, memory, { chatId: ctx.chat?.id || 0 });
    await ctx.reply(reply);
  } catch (error) {
    console.error("Ses handler hatası:", error);
    await ctx.reply(
      "❌ Ses mesajını işlerken bir sorun oluştu. Lütfen tekrar deneyin veya metin olarak yazın."
    );
  } finally {
    if (voicePath) cleanupTempFile(voicePath);
  }
}
