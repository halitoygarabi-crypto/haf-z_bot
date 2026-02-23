import { debugLog } from "../utils/logger.js";

interface CaptionParams {
  title: string;
  platform?: string;
  clientContext?: string;
  tone?: "professional" | "casual" | "funny" | "inspiring";
  includeHashtags?: boolean;
  includeEmoji?: boolean;
}

/**
 * OpenRouter LLM üzerinden akıllı sosyal medya caption'ı üretir.
 * Platform'a özel optimizasyon yapar.
 */
export async function generateCaption(
  params: CaptionParams,
  modelApiKey: string,
  modelName: string = "google/gemini-2.0-flash-001"
): Promise<string> {
  const platform = params.platform || "instagram";
  const tone = params.tone || "professional";
  const includeHashtags = params.includeHashtags !== false;
  const includeEmoji = params.includeEmoji !== false;

  try {
    debugLog("═══ CAPTION ÜRETİMİ ═══");
    debugLog("  Başlık:", params.title);
    debugLog("  Platform:", platform);
    debugLog("  Ton:", tone);

    const platformGuide: Record<string, string> = {
      instagram: "Instagram için optimize et. Maksimum 2200 karakter. İlk cümle dikkat çekici olsun. 5-10 hashtag ekle.",
      tiktok: "TikTok için optimize et. Kısa ve viral. Trend hashtagler kullan. Maksimum 150 karakter.",
      x: "X (Twitter) için optimize et. Maksimum 280 karakter. Kısa, vurucu, paylaşılabilir.",
      linkedin: "LinkedIn için optimize et. Profesyonel ton. Değer katan içerik. 3-5 hashtag.",
      facebook: "Facebook için optimize et. Samimi ve etkileşim odaklı. Soru sor veya CTA kullan.",
    };

    const toneGuide: Record<string, string> = {
      professional: "Profesyonel ve güvenilir bir dilde yaz.",
      casual: "Samimi ve konuşma dilinde yaz.",
      funny: "Esprili ve eğlenceli bir dilde yaz.",
      inspiring: "İlham verici ve motive edici bir dilde yaz.",
    };

    const systemPrompt = `Sen uzman bir sosyal medya içerik üreticisisin. 
${platformGuide[platform] || platformGuide.instagram}
${toneGuide[tone]}
${includeEmoji ? "Uygun emojiler kullan." : "Emoji kullanma."}
${includeHashtags ? "En alakalı hashtagleri ekle." : "Hashtag ekleme."}
Dil: Türkçe.
Sadece caption metnini yaz, başka açıklama ekleme.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${modelApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Başlık: ${params.title}${params.clientContext ? `\nBağlam: ${params.clientContext}` : ""}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      debugLog("  API Error:", errBody.substring(0, 200));
      throw new Error(`LLM API hatası: ${response.status}`);
    }

    const data = await response.json();
    const caption = data.choices?.[0]?.message?.content?.trim();

    if (!caption) {
      throw new Error("LLM boş yanıt döndü.");
    }

    debugLog("  ✅ Caption üretildi:", caption.substring(0, 100));
    debugLog("═══════════════════════");

    return caption;
  } catch (error) {
    debugLog("═══ CAPTION HATASI ═══");
    debugLog("  Error:", String(error));
    debugLog("══════════════════════");

    // Fallback caption
    return `${params.title} ✨\n\nYeni bir heyecan daha! 🚀 #YeniIcerik #SosyalMedya`;
  }
}

/**
 * Video prompt'u üretir — AI video üretimi için optimize edilmiş İngilizce prompt.
 */
export async function generateVideoPrompt(
  concept: string,
  modelApiKey: string,
  modelName: string = "google/gemini-2.0-flash-001"
): Promise<string> {
  try {
    debugLog("═══ VIDEO PROMPT ÜRETİMİ ═══");
    debugLog("  Konsept:", concept);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${modelApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: "system",
            content: `You are an expert AI Video Prompt Engineer. Transform user concepts into detailed, cinematic prompts for AI video generators.

Include: visual details, camera movement, style, atmospheric details.
Output ONLY the final English prompt. No explanations. Max 200 words.`,
          },
          { role: "user", content: `Concept: ${concept}` },
        ],
        temperature: 0.8,
        max_tokens: 512,
      }),
    });

    if (!response.ok) throw new Error(`API hatası: ${response.status}`);
    const data = await response.json();
    const prompt = data.choices?.[0]?.message?.content?.trim();

    debugLog("  ✅ Video prompt:", (prompt || "").substring(0, 100));
    debugLog("═════════════════════════════");

    return prompt || `Cinematic high-quality video of ${concept}, professional lighting, 8k resolution.`;
  } catch (error) {
    debugLog("  ❌ Video prompt hatası:", String(error));
    return `Cinematic high-quality video of ${concept}, stunning visuals, professional lighting, 8k.`;
  }
}
