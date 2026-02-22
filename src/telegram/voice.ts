import { Context } from "grammy";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

/**
 * Telegram ses mesajını indirir, geçici dosyaya kaydeder.
 * İşlem sonrası arayanın temizlemesi gerekir.
 */
export async function downloadVoiceMessage(ctx: Context): Promise<string> {
  const voice = ctx.message?.voice;
  if (!voice) {
    throw new Error("Bu mesajda ses dosyası bulunamadı.");
  }

  const file = await ctx.getFile();
  const filePath = file.file_path;
  if (!filePath) {
    throw new Error("Telegram dosya yolu alınamadı.");
  }

  // Grammy bot token'ı config'den al
  const token = ctx.api.token;
  const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

  const tmpDir = path.join(os.tmpdir(), "agent-claw");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const tmpPath = path.join(tmpDir, `voice_${Date.now()}.ogg`);

  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Ses dosyası indirilemedi: HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(tmpPath, buffer);

  return tmpPath;
}

/**
 * Geçici dosyayı güvenli şekilde siler.
 */
export function cleanupTempFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Temizleme hatası kritik değil, sessizce geç
  }
}
