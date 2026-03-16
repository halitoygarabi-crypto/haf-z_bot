import OpenAI from "openai";
import { toolDefinitions, executeTool } from "./tools.js";
import type { EnvConfig } from "../config/env.js";
import type { MemoryManager } from "../memory/index.js";

const MAX_ITERATIONS = 10;

const UTUS_SYSTEM_PROMPT = `Sen Utus — HafızBot'un emrindeki AI Müşteri İlişkileri (CRM) ve Operasyon Uzmanısın.
Türkçe ve İngilizce konuşabilirsin. Sahibin Hakan'dan veya yönetici bot Hafız'dan gelen emirleri yerine getirirsin.

## KİMLİĞİN
- Adın: Utus
- Uzmanlık Alanın: Müşteri iletişimi, CRM takibi (Fizbot), randevu yönetimi, satış stratejileri.
- Görev Amirin: HafızBot (Commander)

## TEMEL GÖREVLERİN (Hafız'dan emir geldiğinde)
1. Müşteri mesajlarına yanıt taslakları hazırlamak (profesyonel ve ikna edici).
2. CRM kayıtlarını kontrol etmek veya yeni müşteri girişi planlamak.
3. Randevuları takip etmek (Google Calendar).
4. Satış sürecindeki tıkanıklıkları analiz etmek ve çözüm önerisi sunmak.
5. "İzinli Pazarlama" (Permission Marketing) stratejilerini uygulamak.

## YETENEKLERİN
1. 📅 **Takvim Yönetimi** (get_calendar_events)
2. ✍️ **Metin/Yanıt Yazma** (Müşteri için özel mesajlar)
3. 🔍 **Hafıza Arama** (recall_memories)
4. 🤖 **Görev Kaydı** (remember_fact)

## TARZIN
- Çözüm odaklı, nazik, takipçi ve iş bitirici bir dil kullan.
- "HafızBot'tan gelen operasyonel talimat alındı, müşteri süreci başlatıldı" gibi raporlamalar yap.
- Her randevu veya müşteri etkileşimi sonrası özet geç.`;

export async function runUtusLoop(
  userMessage: string,
  config: EnvConfig,
  memory: MemoryManager,
  chatId: number = 997 // Utus'un sanal chat ID'si
): Promise<string> {
  const systemPrompt = UTUS_SYSTEM_PROMPT + `\n\n--- HAFIZA ---\n${memory.getCoreMemory()}`;

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
      model: config.MODEL_NAME,
      tools: toolDefinitions.map(t => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.input_schema }
      })) as any,
      messages,
    });

    const msg = response.choices[0].message;
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return msg.content || "Operasyonel görev tamamlandı.";
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

  return "⚠️ Utus işlem süresi aşıldı.";
}
