import type { EnvConfig } from "../config/env.js";
import { synthesizeWithElevenLabs } from "./elevenlabs.js";
import { synthesizeMock } from "./mock.js";

/**
 * Metin → ses dönüşümü.
 * Config'e göre mock veya gerçek ElevenLabs kullanır.
 * Geçici dosya yolunu döner — arayan temizlemeli.
 */
export async function synthesize(
  text: string,
  config: EnvConfig
): Promise<string> {
  if (config.MOCK_TTS) {
    return synthesizeMock(text);
  }

  if (!config.TTS_API_KEY) {
    throw new Error("TTS için TTS_API_KEY gerekli.");
  }

  return synthesizeWithElevenLabs(text, config.TTS_API_KEY);
}
