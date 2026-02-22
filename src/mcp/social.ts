import { sanitizeForLog } from "./guard.js";
import { debugLog } from "../utils/logger.js";

interface SocialAccount {
  platform: "tiktok" | "instagram" | "linkedin" | "facebook" | "x" | "reddit" | "threads" | "pinterest" | "youtube";
  username: string;
}

interface LimeSocialPostParams {
  title: string;
  mediaUrl?: string;
  accounts: SocialAccount[];
}

/**
 * Lime Social API üzerinden sosyal medya paylaşımı yapar.
 * @docs https://limesocial.io
 */
export async function postToSocialMedia(
  params: LimeSocialPostParams,
  apiKey: string
): Promise<any> {
  const url = "https://api.limesocial.io/v1/post";

  try {
    debugLog("═══ LIME SOCIAL API ÇAĞRISI ═══");
    debugLog("  URL:", url);
    debugLog("  Platforms:", params.accounts.map(a => `${a.platform}:${a.username}`).join(", "));
    debugLog("  Title:", params.title.substring(0, 50));
    debugLog("  Has Media:", !!params.mediaUrl);
    if (params.mediaUrl) {
      debugLog("  Media URL:", params.mediaUrl.substring(0, 80));
    }

    const requestBody = {
      title: params.title,
      mediaUrl: params.mediaUrl,
      accounts: params.accounts,
    };

    debugLog("  Request Body:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": apiKey
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();
    debugLog("  Response Status:", response.status);
    debugLog("  Response Body:", responseText.substring(0, 500));
    debugLog("═══════════════════════════════");

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    if (!response.ok) {
      throw new Error(`Social API Hatası (${response.status}): ${responseText}`);
    }

    return data;
  } catch (error) {
    debugLog("═══ LIME SOCIAL HATA ═══");
    debugLog("  Error:", String(error));
    debugLog("════════════════════════");
    throw error;
  }
}
