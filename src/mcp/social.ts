import { sanitizeForLog } from "./guard.js";

interface SocialAccount {
  platform: "tiktok" | "instagram" | "linkedin" | "facebook" | "x" | "reddit" | "threads" | "pinterest" | "youtube";
  username: string;
}

interface LimeSocialPostParams {
  title: string;
  mediaUrl?: string; // Opsiyonel: Sadece metin paylaşımı için
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
  const url = "https://api.limesocial.io/api/v1/post";

  try {
    console.log(sanitizeForLog("SOCIAL_POSTING", { 
      platforms: params.accounts.map(a => a.platform),
      hasMedia: !!params.mediaUrl 
    }));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": apiKey
      },
      body: JSON.stringify(params)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Social API Hatası (${response.status}): ${JSON.stringify(data)}`);
    }

    return data;
  } catch (error) {
    console.error(sanitizeForLog("SOCIAL_POST_ERROR", { error: String(error) }));
    throw error;
  }
}
