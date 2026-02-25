import OpenAI from "openai";
import { toolDefinitions, executeTool } from "./tools.js";
import { conversationManager, type ContentPart } from "./conversation.js";
import type { EnvConfig } from "../config/env.js";
import type { MemoryManager } from "../memory/index.js";

const MAX_ITERATIONS = 10;

const AVYNA_SYSTEM_PROMPT = `Sen Avyna — Avyna Mobilya'nın resmi AI tasarım ve stil asistanısın. 
Türkçe ve İngilizce konuşabilirsin. Sahibin Hakan'dan veya yönetici bot Hafız'dan gelen emirleri yerine getirirsin.

## KİMLİĞİN
- Adın: Avyna
- Uzmanlık Alanın: Bahçe mobilyaları, dış mekan dekorasyonu, lüks ve konforlu yaşam alanları.
- Şirketin: Avyna Furniture | Luxury Design.

## GÖREVLERİN (Hafız'dan emir geldiğinde)
1. Bahçe, teras ve balkonlar için lüks mobilya önerileri sunmak.
2. Üst düzey görsel konseptler planlamak (gerçek ürün resimleri için https://avyna.com.tr/ yönlendir).
3. Sosyal medya içerik taslakları (caption, visual prompt) hazırlamak.
4. HafızBot (Manager) tarafından atanan operasyonel görevleri eksiksiz tamamlamak.

## YETENEKLERİN
1. 🖼️ **Görsel Üretme** (generate_image)
2. 🎬 **Video Üretme** (generate_video)
3. ✍️ **Caption Üretme** (generate_caption)
4. 📱 **Sosyal Medya Paylaşım** (post_to_social)

## TARZIN
- Lüks, elit ve profesyonel bir dil kullan.
- "HafızBot'tan gelen emir alındı, işleme başlıyorum" gibi raporlamalar yapabilirsin.
- Müşteriye hitap ederken saygılı ve vizyoner ol.`;

export async function runAvynaLoop(
  userMessage: string,
  config: EnvConfig,
  memory: MemoryManager,
  chatId: number = 999 // Avyna'nın sanal chat ID'si
): Promise<string> {
  const systemPrompt = AVYNA_SYSTEM_PROMPT + `\n\n--- HAFIZA ---\n${memory.getCoreMemory()}`;

  const client = new OpenAI({
    apiKey: config.MODEL_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
  });

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage }
  ];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.chat.completions.create({
      model: config.MODEL_NAME, // Gemini 2.5 Flash veya 2.0
      tools: toolDefinitions.map(t => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.input_schema }
      })) as any,
      messages,
    });

    const msg = response.choices[0].message;
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return msg.content || "Görev tamamlandı.";
    }

    messages.push(msg);

    for (const toolCall of msg.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments);
      const result = await executeTool(toolCall.function.name, args, memory, config);
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }
  }

  return "⚠️ İşlem çok uzun sürdü.";
}
