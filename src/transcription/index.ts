import type { EnvConfig } from "../config/env.js";
import { transcribeWithWhisper } from "./whisper.js";
import { transcribeMock } from "./mock.js";

/**
 * Ses dosyasını metne çevirir.
 * Config'e göre mock veya gerçek Whisper kullanır.
 */
export async function transcribe(
  filePath: string,
  config: EnvConfig
): Promise<string> {
  if (config.MOCK_TRANSCRIPTION) {
    return transcribeMock(filePath);
  }

  if (!config.TRANSCRIPTION_API_KEY) {
    throw new Error("Transkripsiyon için TRANSCRIPTION_API_KEY gerekli.");
  }

  return transcribeWithWhisper(filePath, config.TRANSCRIPTION_API_KEY);
}
