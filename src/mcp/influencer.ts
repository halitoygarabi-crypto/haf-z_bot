import { debugLog } from "../utils/logger.js";

interface InfluencerParams {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3";
  model?: "flux-pro" | "flux-schnell";
}

interface InfluencerResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  seed?: number;
}

function mapAspectRatio(ratio: string): string {
  switch (ratio) {
    case "16:9": return "landscape_16_9";
    case "9:16": return "portrait_16_9";
    case "4:3": return "landscape_4_3";
    case "1:1": default: return "square";
  }
}

/**
 * fal.ai Flux Pro/Schnell ile AI influencer görseli üretir.
 */
export async function generateInfluencer(
  params: InfluencerParams,
  falApiKey: string
): Promise<InfluencerResult> {
  const FAL_BASE_URL = "https://fal.run";

  try {
    debugLog("═══ AI INFLUENCER ÜRETİMİ ═══");
    debugLog("  Prompt:", params.prompt.substring(0, 80));
    debugLog("  Model:", params.model || "flux-pro");
    debugLog("  Aspect Ratio:", params.aspectRatio || "1:1");

    const modelEndpoint = params.model === "flux-schnell"
      ? "fal-ai/flux/schnell"
      : "fal-ai/flux-pro";

    const seed = Math.floor(Math.random() * 1000000);

    const response = await fetch(`${FAL_BASE_URL}/${modelEndpoint}`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${falApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: params.prompt,
        image_size: mapAspectRatio(params.aspectRatio || "1:1"),
        num_inference_steps: params.model === "flux-schnell" ? 4 : 28,
        seed,
        enable_safety_checker: true,
      }),
    });

    const responseText = await response.text();
    debugLog("  Response Status:", String(response.status));

    if (!response.ok) {
      let detail = `API hatası: ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        detail = errorData.detail || errorData.message || detail;
      } catch { /* ignore */ }
      throw new Error(detail);
    }

    const data = JSON.parse(responseText);
    const imageUrl = data.images?.[0]?.url || data.url;

    if (!imageUrl) {
      throw new Error("Görsel URL alınamadı.");
    }

    debugLog("  ✅ Influencer görseli URL:", imageUrl.substring(0, 100));
    debugLog("  Seed:", String(seed));
    debugLog("═══════════════════════════════");

    return { success: true, imageUrl, seed };
  } catch (error) {
    debugLog("═══ INFLUENCER ÜRETİM HATASI ═══");
    debugLog("  Error:", String(error));
    debugLog("═════════════════════════════════");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Influencer görseli üretilemedi",
    };
  }
}
