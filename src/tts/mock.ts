import fs from "node:fs";
import path from "node:path";
import os from "node:os";

/**
 * Mock TTS — test ve geliştirme için.
 * Boş bir ses dosyası oluşturur.
 */
export async function synthesizeMock(
  _text: string
): Promise<string> {
  const tmpDir = path.join(os.tmpdir(), "agent-claw");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const tmpPath = path.join(tmpDir, `tts_mock_${Date.now()}.mp3`);

  // Minimal geçerli bir ses dosyası yerine boş dosya (mock amaçlı)
  fs.writeFileSync(tmpPath, Buffer.alloc(0));

  return tmpPath;
}
