import type { MemoryManager } from "../memory/index.js";
import type { EnvConfig } from "../config/env.js";
import { isToolAllowed, sanitizeForLog } from "../mcp/guard.js";
import { getEventsForDate, formatEventsAsText } from "../mcp/calendar.js";

/**
 * Tool tanımları — Claude'un kullanabileceği araçlar.
 */
export interface ToolResult {
  name: string;
  result: string;
}

export const toolDefinitions = [
  {
    name: "get_current_time" as const,
    description:
      "Şu anki tarih ve saati döner. Kullanıcı saati veya tarihi sorduğunda kullan.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "remember_fact" as const,
    description:
      "Kullanıcı hakkında önemli bir bilgiyi hafızaya kaydeder. Kullanıcının ismi, tercihleri, alışkanlıkları gibi bilgileri saklamak için kullan.",
    input_schema: {
      type: "object" as const,
      properties: {
        content: {
          type: "string" as const,
          description: "Hatırlanacak bilgi veya gerçek.",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "recall_memories" as const,
    description:
      "Hafızadan ilgili anıları arar. Kullanıcının daha önce söylediği şeyleri hatırlamak için kullan.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string" as const,
          description: "Aranacak konu veya anahtar kelimeler.",
        },
        top_k: {
          type: "number" as const,
          description: "Döndürülecek maksimum sonuç sayısı (varsayılan: 3).",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_calendar_events" as const,
    description:
      "Google Calendar'dan belirli bir tarihteki etkinlikleri getirir. Salt okunur — sadece okuma yapar, etkinlik oluşturmaz. Kullanıcı takvimini veya programını sorduğunda kullan.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: {
          type: "string" as const,
          description:
            "Etkinliklerin sorgulanacağı tarih (YYYY-MM-DD formatında). Örn: 2026-02-23",
        },
      },
      required: ["date"],
    },
  },
];

/**
 * Tool çağrısını çalıştırır.
 */
export async function executeTool(
  name: string,
  input: unknown,
  memory: MemoryManager,
  config: EnvConfig
): Promise<string> {
  // Allowlist kontrolü
  if (!isToolAllowed(name)) {
    console.warn(sanitizeForLog("BLOCKED_TOOL", { name }));
    return `⛔ Bu araç kullanılamaz: ${name}`;
  }

  const params = input as Record<string, unknown>;

  switch (name) {
    case "get_current_time":
      return new Date().toLocaleString("tr-TR", {
        timeZone: "Europe/Istanbul",
        dateStyle: "full",
        timeStyle: "long",
      });

    case "remember_fact": {
      const content = params.content as string;
      if (!content) return "Hata: content parametresi gerekli.";
      const id = memory.remember(content, "agent");
      return `Hafızaya kaydedildi (ID: ${id}): "${content}"`;
    }

    case "recall_memories": {
      const query = params.query as string;
      if (!query) return "Hata: query parametresi gerekli.";
      const topK = (params.top_k as number) || 3;
      const results = memory.recall(query, topK);
      if (results.length === 0) {
        return "Hafızada bu konuyla ilgili kayıt bulunamadı.";
      }
      return results
        .map((r, i) => `${i + 1}. [${r.created_at}] ${r.content}`)
        .join("\n");
    }

    case "get_calendar_events": {
      const date = params.date as string;
      if (!date) return "Hata: date parametresi gerekli (YYYY-MM-DD).";

      if (!config.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
        return "⚠️ Google Calendar yapılandırılmamış. GOOGLE_SERVICE_ACCOUNT_KEY_PATH ayarla.";
      }

      try {
        const events = await getEventsForDate(date, {
          serviceAccountKeyPath: config.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
          calendarId: config.GOOGLE_CALENDAR_ID,
        });
        return formatEventsAsText(events);
      } catch (error) {
        console.error(sanitizeForLog("CALENDAR_ERROR", { date, error: String(error) }));
        return "❌ Takvim etkinlikleri alınırken bir hata oluştu.";
      }
    }

    default:
      return `Bilinmeyen tool: ${name}`;
  }
}
