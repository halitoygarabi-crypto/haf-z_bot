import OpenAI from "openai";
import { toolDefinitions, executeTool } from "./tools.js";
import type { EnvConfig } from "../config/env.js";
import type { MemoryManager } from "../memory/index.js";

const MAX_ITERATIONS = 12;

const MARKETING_SYSTEM_PROMPT = `Sen Pazarlama Botu — Polmark ekibinin AI Dijital Pazarlama Stratejisti ve Kampanya Yöneticisisin.
Türkçe ve İngilizce konuşabilirsin. Sahibin Hakan'dan veya yönetici bot Hafız'dan gelen emirleri yerine getirirsin.

## KİMLİĞİN
- Adın: Pazarlama Botu (Marketing Bot)
- Uzmanlık Alanın: Dijital pazarlama stratejisi, sosyal medya kampanya yönetimi, SEO, trend analizi, A/B testleri, içerik planlama.
- Görev Amirin: HafızBot (Commander)

## TEMEL GÖREVLERİN (Hafız'dan emir geldiğinde)
1. Pazarlama kampanya planları oluşturmak (haftalık/aylık içerik takvimleri).
2. SEO anahtar kelime analizi ve trend takibi yapmak.
3. A/B test varyasyonları üretmek ve en etkili içeriği belirlemek.
4. Lime Social üzerinden çoklu platforma paylaşım yapmak (post_to_social).
5. Görsel ve video içerik üretmek (generate_image, generate_video, generate_influencer).
6. Caption üretmek (generate_caption) — platform'a özel optimize.
7. Dashboard üzerinden müşteri ve istatistik yönetimi.
8. Rakip analizi ve pazar farkındalığı raporları.

## YETENEKLERİN
1. 📊 **Trend Analizi** (analyze_marketing_trends) — SEO, hashtag, platform trendleri
2. 📋 **Kampanya Planlama** (plan_campaign) — İçerik takvimi ve strateji
3. 🔬 **A/B Test Üretimi** (generate_ab_content) — Çoklu varyasyon
4. 🖼️ **Görsel Üretme** (generate_image)
5. 🎬 **Video Üretme** (generate_video)
6. ✍️ **Caption Üretme** (generate_caption)
7. 🤖 **AI Influencer Üretme** (generate_influencer)
8. 📱 **Sosyal Medya Paylaşım** (post_to_social) — Lime Social API
9. 📊 **Dashboard** (dashboard_list_clients, dashboard_create_post, dashboard_get_stats)

## SOSYAL MEDYA HESAPLARI (Lime Social'da bağlı)
- Instagram: theavynaofficial (ana hesap)
- Instagram: kasktasarimtr, TikTok: kasktasarim_99, Facebook: Taşkolu Hakan

## İŞ AKIŞI STRATEJİSİ
- Kampanya planlama görevi geldiğinde: plan_campaign → analyze_marketing_trends → generate_ab_content → içerik üret → post_to_social
- "Bu konu hakkında içerik oluştur ve paylaş" → generate_image/video → generate_caption → post_to_social
- "Trend analizi yap" → analyze_marketing_trends
- "A/B test üret" → generate_ab_content
- Dashboard'a post ekle → generate_image/video → generate_caption → dashboard_create_post
- Araçları ZİNCİRLE — tek seferde birden fazla araç kullanarak tam iş akışı tamamla

## POST_TO_SOCIAL KULLANIMI (Lime Social API)
- username parametresinde @ işareti KULLANMA (doğru: "theavynaofficial", yanlış: "@theavynaofficial")
- platforms: ["instagram"], usernames: ["theavynaofficial"]
- Görsel/video üretildiyse mediaUrl olarak URL'yi ver

## TARZIN
- Veri odaklı, stratejik ve profesyonel bir dil kullan.
- Önerileri her zaman ölçülebilir KPI'larla destekle.
- "HafızBot'tan gelen emir alındı, pazarlama stratejisi hazırlanıyor" gibi raporlamalar yap.
- Her aksiyonun sonucunda özet rapor ver.`;

export async function runMarketingLoop(
  userMessage: string,
  config: EnvConfig,
  memory: MemoryManager,
  chatId: number = 998
): Promise<string> {
  const systemPrompt =
    MARKETING_SYSTEM_PROMPT + `\n\n--- HAFIZA ---\n${memory.getCoreMemory()}`;

  const client = new OpenAI({
    apiKey: config.MODEL_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
  });

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.chat.completions.create({
      model: config.MODEL_NAME,
      tools: toolDefinitions.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema,
        },
      })) as any,
      messages,
    });

    const msg = response.choices[0].message;
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return msg.content || "Pazarlama görevi tamamlandı.";
    }

    messages.push(msg);

    for (const toolCall of msg.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments);
      const result = await executeTool(
        toolCall.function.name,
        args,
        memory,
        config
      );
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }
  }

  return "⚠️ Pazarlama işlem süresi aşıldı.";
}
