import OpenAI from "openai";
import { toolDefinitions, executeTool } from "./tools.js";
import { conversationManager, type ContentPart } from "./conversation.js";
import type { EnvConfig } from "../config/env.js";
import type { MemoryManager } from "../memory/index.js";

const MAX_ITERATIONS = 10;

const BASE_SYSTEM_PROMPT = `Sen Hafız — Hakan'ın Baş Sosyal Medya Direktörü, AI İçerik Stratejisti ve Bot Komutanı (Commander)'sın. 
Türkçe ve İngilizce konuşabilirsin. Kullanıcı sana Türkçe yazarsa Türkçe yanıtla.

## 👑 KİMLİĞİN
- Adın: Hafız
- Sahibin: Hakan
- Uzmanlık: Sosyal Medya Yönetimi, Kreatif İçerik Stratejisi, AI Görsel/Video Prodüksiyonu.
- Görevin: Avyna markasının dijital varlığını yönetmek, içerik üretmek ve yardımcı botları (Utus ve Avyna Bot) koordine etmek.

## YETENEKLERİN
1. 🖼️ **Görsel Üretme** (generate_image)
2. 🎬 **Video Üretme** (generate_video)
3. ✍️ **Caption Üretme** (generate_caption)
4. 🤖 **AI Influencer Üretme** (generate_influencer)
5. 📱 **Sosyal Medya Paylaşım** (post_to_social)
6. 📅 **Takvim** (get_calendar_events)
7. 👑 **Bot Yönetimi** (manage_subordinate_bot)
8. 📊 **SocialHub Dashboard** (dashboard_list_clients, dashboard_create_post, dashboard_get_stats)

## SOSYAL MEDYA HESAPLARI (Lime Social'da bağlı)
- Instagram: theavynaofficial (ana hesap, 2.9k takipçi) 
- Instagram: kasktasarimtr, TikTok: kasktasarim_99, Facebook: Taşkolu Hakan

## AVYNA KURUMSAL KİMLİK VE KOLEKSİYONLAR
- **Marka Özü:** Doğayla uyumlu, lüks dış mekan ve iç mekan tasarımları. Estetik, konfor ve dayanıklılık.
- **Kumaş Teknolojisi:** "Tay Tüyü" — Leke tutmaz, ultra yumuşak, nefes alan ve nemli bezle kolay temizlenen kumaşlar.
- **İskelet:** Uzun ömürlü ve sağlam çelik iskelet yapısı.
- **Ana Koleksiyonlar:** 
  * **Storm & Bhsura:** İkili fonksiyonel yataklı koltuklar.
  * **Thor:** 360° döner berjer (İkonik tasarım).
  * **Harpy:** Sallanır sandalye / koltuk.
  * **Napper:** Katlanabilir şezlong.
  * **Diğer Seriler:** Floki, Denise, Gudrun, Pergamon, Smile, Lich (Katlanır çalışma masası).

## VARSAYILAN DAVRANIŞLAR
- "Instagram'da paylaş" denirse → theavynaofficial hesabından paylaş
- "TikTok'ta paylaş" denirse → kasktasarim_99 hesabından paylaş  
- Caption belirtilmezse → generate_caption ile otomatik üret
- Görsel gönderilip "paylaş" denirse → o görseli kullan
- Video üretilip "paylaş" denirse → üretilen videoyu kullan

- "Bu konu hakkında içerik oluştur" → generate_image/video → generate_caption → post_to_social
- Dashboard'a post ekle → generate_image/video → generate_caption → dashboard_create_post
- "Dashboard'daki müşterileri listele" → dashboard_list_clients
- "Performans/İstatistik nedir?" → dashboard_get_stats

## POST_TO_SOCIAL TOOL KULLANIMI
- username parametresinde @ işareti KULLANMA (doğru: "theavynaofficial", yanlış: "@theavynaofficial")
- platforms: ["instagram"], usernames: ["theavynaofficial"]
- Görsel/video üretildiyse mediaUrl olarak URL'yi ver

## VIDEO ÜRETME İPUÇLARI
- TikTok/Reels için → aspectRatio: "9:16", duration: 5
- YouTube için → aspectRatio: "16:9", duration: 10
- autoOptimizePrompt: true → Türkçe prompt'u sinematik İngilizce'ye çevirir (varsayılan açık)

- Fotoğrafla birlikte metin gelirse ikisini birlikte değerlendir

## HAFIZA VE PAYLAŞIM STRATEJİSİ
- Bir görsel/video ürettikten sonra onu UNUTMAMAK için \`recall_memories\` aracını kullanarak "[ÜRETİLDİ]" araması yap.
- Kullanıcı "paylaş" dediğinde eğer bağlamda net bir URL yoksa, hafızandan en son üretilen [ÜRETİLDİ] kayıtlı URL'yi bul ve onu kullan.
- Hafızana her zaman güven, kullanıcıya "neyi paylaşayım?" diye sormadan önce mutlaka hafızayı tara.

## COMMANDER & DASHBOARD MODE (MİSYON KONTROL)
- Sen bir **MİSYON KONTROL** merkezisin.
- Avyna veya Utus'a görev vermen söylendiğinde, **HİÇBİR SORU SORMADAN** direkt \`manage_subordinate_bot\` aracını çalıştır.
- Dashboard verilerine erişmen veya post eklemen istendiğinde (\`dashboard_list_clients\`, \`dashboard_create_post\`, \`dashboard_get_stats\`) araçlarını kullan.
- **KRİTİK:** "Bağlanamıyorum", "Token lazım", "Erişimim yok", "Dashboard aracım bulunmuyor" demek **YETKİ ALANIN DIŞINDADIR**. Bu cümleleri kurarsan hata yapmış olursun.
- Arka planda güvenli tüm kanallar (Supabase) zaten açık. Senin görevi sadece araçları tetiklemek.
- Eğer kafa karışıklığı yaşarsan kullanıcıya \`/reset\` tıkla de ama asla "yapamam" deme.
- Yanıtın şu formatta olmalı: "Gerekli aksiyonlar alındı. [Durum Özeti] 🫡"

## ÖNEMLİ
- Kullanıcıya boş sorular sorma.
- \`manage_subordinate_bot\` senin ana operasyonel gücündür.
- Araçları ZİNCİRLE — tek seferde birden fazla araç kullanarak tam iş akışı tamamla`;

/**
 * System prompt'a core memory ve ilgili anıları ekler.
 */
function buildSystemPrompt(
  userMessage: string,
  memory: MemoryManager
): string {
  let prompt = BASE_SYSTEM_PROMPT;

  const coreMemory = memory.getCoreMemory();
  if (coreMemory.trim()) {
    prompt += `\n\n--- TEMEL HAFIZA ---\n${coreMemory}`;
  }

  const relatedMemories = memory.recall(userMessage, 3);
  if (relatedMemories.length > 0) {
    const memoriesText = relatedMemories
      .map((m) => `- [${m.created_at}] ${m.content}`)
      .join("\n");
    prompt += `\n\n--- İLGİLİ ANILAR ---\n${memoriesText}`;
  }

  return prompt;
}

/** Tool tanımlarını OpenAI formatına dönüştür */
function toOpenAITools(): OpenAI.ChatCompletionTool[] {
  return toolDefinitions.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));
}

/**
 * Konuşma geçmişini OpenAI mesaj formatına çevir.
 */
function buildMessagesFromHistory(
  chatId: number,
  currentContent: string | OpenAI.ChatCompletionContentPart[],
  systemPrompt: string
): OpenAI.ChatCompletionMessageParam[] {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
  ];

  // Geçmiş mesajları ekle
  const history = conversationManager.getHistory(chatId);
  for (const msg of history) {
    if (msg.role === "user") {
      const content = typeof msg.content === "string" 
        ? msg.content 
        : (msg.content as ContentPart[]).find(p => p.type === "text")?.text || "(görsel)";
      messages.push({ role: "user", content });
    } else if (msg.role === "assistant") {
      messages.push({ 
        role: "assistant", 
        content: typeof msg.content === "string" ? msg.content : "(yanıt)",
        tool_calls: msg.tool_calls as any
      });
    } else if (msg.role === "tool") {
      messages.push({ 
        role: "tool", 
        tool_call_id: msg.tool_call_id!, 
        content: typeof msg.content === "string" ? msg.content : "(tool sonucu)" 
      });
    }
  }

  // Şimdiki mesajı ekle
  messages.push({ role: "user", content: currentContent as any });

  return messages;
}

/**
 * Ana giriş noktası — Koordinatör Ajan Loop.
 * Konuşma geçmişi, vision desteği ve akıllı tool kullanımı.
 */
export async function runAgentLoop(
  userMessage: string,
  config: EnvConfig,
  memory: MemoryManager,
  options?: {
    chatId?: number;
    imageBase64?: string;
    imageMimeType?: string;
  }
): Promise<string> {
  const chatId = options?.chatId || 0;
  const systemPrompt = buildSystemPrompt(userMessage, memory);

  // Mesaj içeriğini hazırla (text veya text+image)
  let content: string | OpenAI.ChatCompletionContentPart[];

  if (options?.imageBase64) {
    content = [
      { type: "text", text: userMessage || "Bu görseli analiz et." },
      {
        type: "image_url",
        image_url: {
          url: `data:${options.imageMimeType || "image/jpeg"};base64,${options.imageBase64}`,
        },
      },
    ];
  } else {
    content = userMessage;
  }

  // Konuşma geçmişine kullanıcı mesajını ekle
  conversationManager.addMessage(chatId, "user", userMessage);

  const client = new OpenAI({
    apiKey: config.MODEL_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
  });

  const messages = buildMessagesFromHistory(chatId, content, systemPrompt);

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let response;
    try {
      console.log(`🔄 Ajan [${i}]: API çağrısı → ${config.MODEL_NAME}`);
      response = await client.chat.completions.create({
        model: config.MODEL_NAME,
        max_tokens: 2048,
        tools: toOpenAITools(),
        messages,
      });
    } catch (apiError: any) {
      console.error("═══ OPENROUTER API HATASI ═══");
      console.error("  Status:", apiError?.status || "N/A");
      console.error("  Message:", apiError?.message || String(apiError));
      console.error("═════════════════════════════");
      throw apiError;
    }

    const choice = response.choices[0];
    if (!choice) {
      const reply = "(Boş yanıt)";
      conversationManager.addMessage(chatId, "assistant", reply);
      return reply;
    }

    const msg = choice.message;
    console.log(`✅ Ajan [${i}]: finish=${choice.finish_reason}, tool_calls=${msg?.tool_calls?.length || 0}`);

    // Tool çağrısı yoksa metin yanıtı döner
    if (choice.finish_reason === "stop" || !msg.tool_calls?.length) {
      const reply = msg.content || "(Boş yanıt)";
      conversationManager.addMessage(chatId, "assistant", reply);
      return reply;
    }

    // Tool çağrılarını işle
    // Assistant mesajını (tool_calls içeren) geçmişe ekle
    conversationManager.addMessage(chatId, "assistant", msg.content || "", { tool_calls: msg.tool_calls });
    messages.push(msg);

    for (const toolCall of msg.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments || "{}");
      console.log(`🔧 Tool: ${toolCall.function.name}(${JSON.stringify(args).substring(0, 100)}...)`);
      const result = await executeTool(toolCall.function.name, args, memory, config);
      console.log(`📋 Tool sonucu: ${result.substring(0, 100)}...`);
      
      // Tool sonucunu geçmişe ekle
      conversationManager.addMessage(chatId, "tool", result, { tool_call_id: toolCall.id });
      
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }
  }

  const reply = "⚠️ Maksimum iterasyon sayısına ulaşıldı.";
  conversationManager.addMessage(chatId, "assistant", reply);
  return reply;
}
