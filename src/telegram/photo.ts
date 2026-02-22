import { Context } from "grammy";

/**
 * Telegram fotoğrafını indirir ve base64 formatına çevirir.
 * Gemini Flash vision desteği için kullanılır.
 */
export async function downloadPhotoAsBase64(ctx: Context): Promise<{ base64: string; mimeType: string } | null> {
  const photo = ctx.message?.photo;
  if (!photo || photo.length === 0) return null;

  // En yüksek çözünürlüklü fotoğrafı al
  const bestPhoto = photo[photo.length - 1];

  try {
    const file = await ctx.api.getFile(bestPhoto.file_id);
    const filePath = file.file_path;
    if (!filePath) return null;

    const token = ctx.api.token;
    const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

    const response = await fetch(fileUrl);
    if (!response.ok) {
      console.error(`Fotoğraf indirilemedi: HTTP ${response.status}`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const base64 = buffer.toString("base64");

    // MIME type belirle
    const ext = filePath.split(".").pop()?.toLowerCase() || "jpg";
    const mimeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
    };

    return {
      base64,
      mimeType: mimeMap[ext] || "image/jpeg",
    };
  } catch (error) {
    console.error("Fotoğraf indirme hatası:", error);
    return null;
  }
}
