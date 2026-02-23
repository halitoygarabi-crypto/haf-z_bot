import OpenAI from "openai";
import { toolDefinitions, executeTool } from "./tools.js";
import { conversationManager, type ContentPart } from "./conversation.js";
import type { EnvConfig } from "../config/env.js";
import type { MemoryManager } from "../memory/index.js";

const MAX_ITERATIONS = 10;

const BASE_SYSTEM_PROMPT = `Sen Hafız — Hakan'ın kişisel AI asistan ve sosyal medya yönetim ajanısın. 
Türkçe ve İngilizce konuşabilirsin. Kullanıcı sana Türkçe yazarsa Türkçe yanıtla.

## KİMLİĞİN
- Adın: Hafız
- Sahibin: Hakan
- Görevin: Kişisel asistan, sosyal medya yöneticisi, içerik üretici, video yapımcısı

## YETENEKLERİN
1. 🖼️ **Görsel Üretme** (generate_image) — Replicate Flux.1 ile
2. 🎬 **Video Üretme** (generate_video) — Kling AI ile text-to-video & image-to-video
3. ✍️ **Caption Üretme** (generate_caption) — Platform'a özel akıllı caption
4. 🤖 **AI Influencer Üretme** (generate_influencer) — Flux Pro ile gerçekçi influencer görselleri
5. 📱 **Sosyal Medya Paylaşım** (post_to_social) — Lime Social ile tüm platformlara
6. 📅 **Takvim** (get_calendar_events) — Google Calendar okuma
7. 🧠 **Hafıza** (remember_fact, recall_memories) — Bilgi kaydetme ve hatırlama

## SOSYAL MEDYA HESAPLARI (Lime Social'da bağlı)
- Instagram: theavynaofficial (ana hesap, 2.9k takipçi) 
- Instagram: kasktasarimtr (ikinci hesap)
- TikTok: kasktasarim_99
- Facebook: Taşkolu Hakan

## VARSAYILAN DAVRANIŞLAR
- "Instagram'da paylaş" denirse → theavynaofficial hesabından paylaş
- "TikTok'ta paylaş" denirse → kasktasarim_99 hesabından paylaş  
- Caption belirtilmezse → generate_caption ile otomatik üret
- Görsel gönderilip "paylaş" denirse → o görseli kullan
- Video üretilip "paylaş" denirse → üretilen videoyu kullan

## AKILLI İŞ AKIŞLARI (Araçları zincirle!)
- "Görsel üret ve paylaş" → generate_image → generate_caption → post_to_social
- "Video üret ve TikTok'ta paylaş" → generate_video (9:16) → generate_caption (tiktok) → post_to_social
- "AI influencer üret, Instagram'da paylaş" → generate_influencer → generate_caption → post_to_social
- "Bu konu hakkında içerik oluştur" → generate_image/video → generate_caption → post_to_social
- Caption istenirse → generate_caption (platformu bağlamdan anla)

## POST_TO_SOCIAL TOOL KULLANIMI
- username parametresinde @ işareti KULLANMA (doğru: "theavynaofficial", yanlış: "@theavynaofficial")
- platforms: ["instagram"], usernames: ["theavynaofficial"]
- Görsel/video üretildiyse mediaUrl olarak URL'yi ver

## VIDEO ÜRETME İPUÇLARI
- TikTok/Reels için → aspectRatio: "9:16", duration: 5
- YouTube için → aspectRatio: "16:9", duration: 10
- autoOptimizePrompt: true → Türkçe prompt'u sinematik İngilizce'ye çevirir (varsayılan açık)

## FOTOĞRAF İŞLEME
- Kullanıcı fotoğraf gönderdiğinde görseli ANALİZ ET ve ne olduğunu anla
- "Bu görseli paylaş" denirse görseli direkt kullanarak paylaş
- "Bu görselden video üret" denirse → generate_video ile image-to-video yap
- Fotoğrafla birlikte metin gelirse ikisini birlikte değerlendir

## ÖNEMLİ
- Kullanıcıya gereksiz soru sorma, elindeki bilgiyle hareket et
- "Hangi hesap?" diye sorma, varsayılan hesabı kullan
- "Ne paylaşmak istiyorsun?" diye sorma, bağlamdan anla
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
      // ContentPart[] ise text kısmını al
      const content = typeof msg.content === "string" 
        ? msg.content 
        : (msg.content as ContentPart[]).find(p => p.type === "text")?.text || "(görsel)";
      messages.push({ role: "user", content });
    } else {
      const content = typeof msg.content === "string" ? msg.content : "(yanıt)";
      messages.push({ role: "assistant", content });
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
    messages.push(msg);

    for (const toolCall of msg.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments || "{}");
      console.log(`🔧 Tool: ${toolCall.function.name}(${JSON.stringify(args).substring(0, 100)}...)`);
      const result = await executeTool(toolCall.function.name, args, memory, config);
      console.log(`📋 Tool sonucu: ${result.substring(0, 100)}...`);
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
