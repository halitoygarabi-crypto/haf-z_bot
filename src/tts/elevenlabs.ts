import fs from "node:fs";
import path from "node:path";
import os from "node:os";

/**
 * ElevenLabs API ile metin → ses dönüşümü.
 * Geçici dosyaya kaydeder, arayan temizlemekten sorumlu.
 */
export async function synthesizeWithElevenLabs(
  text: string,
  apiKey: string
): Promise<string> {
  const voiceId = "21m00Tcm4TlvDq8ikWAM"; // Rachel — varsayılan ses

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API hatası (${response.status}): ${errorText}`);
  }

  const tmpDir = path.join(os.tmpdir(), "agent-claw");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const tmpPath = path.join(tmpDir, `tts_${Date.now()}.mp3`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(tmpPath, buffer);

  return tmpPath;
}
