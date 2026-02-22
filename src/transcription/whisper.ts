import OpenAI from "openai";
import fs from "node:fs";

/**
 * OpenAI Whisper API ile ses dosyasını metne çevirir.
 */
export async function transcribeWithWhisper(
  filePath: string,
  apiKey: string
): Promise<string> {
  const openai = new OpenAI({ apiKey });

  const transcription = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file: fs.createReadStream(filePath),
    language: "tr", // Türkçe öncelikli
  });

  return transcription.text;
}
