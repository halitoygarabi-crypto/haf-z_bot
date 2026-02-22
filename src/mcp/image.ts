import Replicate from "replicate";
import { sanitizeForLog } from "./guard.js";

/**
 * Replicate üzerinden görsel üretir (Flux.1 [schnell] modeli).
 */
export async function generateFluxImage(
  prompt: string,
  apiToken: string
): Promise<string> {
  const replicate = new Replicate({
    auth: apiToken,
  });

  try {
    console.log(sanitizeForLog("GENERATING_IMAGE", { prompt, model: "flux-schnell" }));
    
    const output = await replicate.run(
      "black-forest-labs/flux-schnell",
      {
        input: {
          prompt: prompt,
          aspect_ratio: "1:1",
          output_format: "webp",
          output_quality: 80,
          disable_safety_checker: false
        }
      }
    );

    // Replicate output genellikle bir array URL döner (prediction)
    if (Array.isArray(output) && output.length > 0) {
      return output[0] as string;
    }

    throw new Error("Görsel üretildi ama URL alınamadı.");
  } catch (error) {
    console.error(sanitizeForLog("IMAGE_GENERATION_ERROR", { prompt, error: String(error) }));
    throw error;
  }
}
