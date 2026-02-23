import { debugLog } from "../utils/logger.js";

interface VideoGenerationParams {
  prompt: string;
  imageUrl?: string;
  aspectRatio?: string;
  duration?: number;
}

interface VideoGenerationResult {
  success: boolean;
  videoUrl?: string;
  error?: string;
}

/**
 * fal.ai üzerinden Kling Video üretir.
 * Text-to-video ve Image-to-video destekler.
 */
export async function generateVideo(
  params: VideoGenerationParams,
  falApiKey: string
): Promise<VideoGenerationResult> {
  const FAL_BASE_URL = "https://fal.run";

  try {
    debugLog("═══ VIDEO ÜRETİMİ BAŞLADI ═══");
    debugLog("  Prompt:", params.prompt.substring(0, 80));
    debugLog("  Mode:", params.imageUrl ? "image-to-video" : "text-to-video");
    debugLog("  Duration:", String(params.duration || 5));
    debugLog("  Aspect Ratio:", params.aspectRatio || "16:9");

    const isImageToVideo = !!params.imageUrl;
    const endpoint = isImageToVideo
      ? `${FAL_BASE_URL}/fal-ai/kling-video/v1.6/standard/image-to-video`
      : `${FAL_BASE_URL}/fal-ai/kling-video/v1.6/standard/text-to-video`;

    const body: Record<string, unknown> = {
      prompt: params.prompt.length > 1000 ? params.prompt.substring(0, 999) : params.prompt,
      negative_prompt: "blurry, low quality, distorted, ugly, watermark, text overlay",
      duration: (params.duration || 5) > 5 ? "10" : "5",
      aspect_ratio: params.aspectRatio || "16:9",
    };

    if (isImageToVideo && params.imageUrl) {
      body.image_url = params.imageUrl;
    }

    debugLog("  Endpoint:", endpoint);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Key ${falApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    debugLog("  Response Status:", String(response.status));
    debugLog("  Response:", responseText.substring(0, 300));

    if (!response.ok) {
      let detail = `API hatası: ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        detail = errorData.detail || errorData.message || detail;
      } catch { /* ignore */ }
      throw new Error(detail);
    }

    const data = JSON.parse(responseText);
    const videoUrl = data.video?.url || data.video_url || data.url;

    if (!videoUrl) {
      throw new Error("Video URL alınamadı. API yanıtı beklenmeyen formatta.");
    }

    debugLog("  ✅ Video URL:", videoUrl.substring(0, 100));
    debugLog("═══════════════════════════════");

    return { success: true, videoUrl };
  } catch (error) {
    debugLog("═══ VIDEO ÜRETİM HATASI ═══");
    debugLog("  Error:", String(error));
    debugLog("════════════════════════════");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Video üretilemedi",
    };
  }
}
