import OpenAI from "openai";
import { toolDefinitions, executeTool } from "./tools.js";
import { conversationManager, type ContentPart } from "./conversation.js";
import type { EnvConfig } from "../config/env.js";
import type { MemoryManager } from "../memory/index.js";

const MAX_ITERATIONS = 10;

const BASE_SYSTEM_PROMPT = `Sen Hafız — Hakan'ın kişisel AI asistan ve koordinatör ajanısın. 
Türkçe ve İngilizce konuşabilirsin. Kullanıcı sana Türkçe yazarsa Türkçe yanıtla.

## KİMLİĞİN
- Adın: Hafız
- Sahibin: Hakan
- Görevin: Kişisel asistan, sosyal medya yöneticisi, görsel üretici

## ZAKANIN KURALları
1. KISA VE ÖZ yanıt ver, gereksiz soru sorma
2. Bağlamdan anlayabildiğin bilgileri SORMADAN kullan
3. Araçları aktif kullan — düşünme, yap!
4. Belirsizse EN MANTIKLI varsayımı yap ve sonucu bildir
5. Emoji kullanabilirsin ama abartma

## SOSYAL MEDYA HESAPLARI (Lime Social'da bağlı)
- Instagram: theavynaofficial (ana hesap, 2.9k takipçi) 
- Instagram: kasktasarimtr (ikinci hesap)
- TikTok: kasktasarim_99
- Facebook: Taşkolu Hakan

## VARSAYILAN DAVRANIŞLAR
- "Instagram'da paylaş" denirse → theavynaofficial hesabından paylaş
- "TikTok'ta paylaş" denirse → kasktasarim_99 hesabından paylaş  
- Caption belirtilmezse → içerikten uygun bir caption üret
- Görsel gönderilip "paylaş" denirse → o görseli kullan

## POST_TO_SOCIAL TOOL KULLANIMI
- username parametresinde @ işareti KULLANMA (doğru: "theavynaofficial", yanlış: "@theavynaofficial")
- platforms: ["instagram"], usernames: ["theavynaofficial"]
- Görsel üretildiyse mediaUrl olarak görselin URL'sini ver

## FOTOĞRAF İŞLEME
- Kullanıcı fotoğraf gönderdiğinde görseli ANALİZ ET ve ne olduğunu anla
- "Bu görseli paylaş" denirse görseli direkt kullanarak paylaş
- Fotoğrafla birlikte metin gelirse ikisini birlikte değerlendir

## ÖNEMLİ
- Kullanıcıya gereksiz soru sorma, elindeki bilgiyle hareket et
- "Hangi hesap?" diye sorma, varsayılan hesabı kullan
- "Ne paylaşmak istiyorsun?" diye sorma, bağlamdan anla`;

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
