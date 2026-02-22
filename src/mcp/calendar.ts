/**
 * Google Calendar etkinlik sorgulama modülü.
 * Salt okunur — oluşturma, düzenleme, silme yok.
 */

import type { calendar_v3 } from "googleapis";
import { initializeCalendarClient, type CalendarClientConfig } from "./client.js";
import { redactSensitiveFields, sanitizeForLog } from "./guard.js";

export interface CalendarEvent {
  time: string;
  title: string;
  location?: string;
}

/**
 * Belirli bir tarihteki etkinlikleri getirir.
 * Maks 5 etkinlik, kısa özet formatı.
 */
export async function getEventsForDate(
  dateStr: string,
  config: CalendarClientConfig
): Promise<CalendarEvent[]> {
  const calendar = initializeCalendarClient(config);

  // Tarih aralığı: günün başından sonuna
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);

  const response = await calendar.events.list({
    calendarId: config.calendarId,
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    maxResults: 5,
    singleEvents: true,
    orderBy: "startTime",
  });

  const items = response.data.items || [];

  // Hassas alanları redact et ve log'a yaz
  console.log(
    sanitizeForLog(
      "calendar_fetch",
      { date: dateStr, count: items.length }
    )
  );

  return items.map(formatEvent);
}

/**
 * Ham etkinliği güvenli, kısa formata dönüştürür.
 * Hassas alanlar (attendee email, description) çıkarılır.
 */
function formatEvent(event: calendar_v3.Schema$Event): CalendarEvent {
  const start = event.start?.dateTime || event.start?.date || "";
  let time: string;

  if (event.start?.dateTime) {
    const d = new Date(event.start.dateTime);
    time = d.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Istanbul",
    });
  } else {
    time = "Tüm gün";
  }

  const title = (event.summary || "İsimsiz etkinlik").slice(0, 80);
  const location = event.location
    ? String(redactSensitiveFields(event.location)).slice(0, 60)
    : undefined;

  // ⚠️ Bilinçli olarak dahil edilmeyen alanlar:
  // - attendees (email içerir)
  // - description (hassas link/veri içerebilir)
  // - htmlLink (token içerebilir)

  return { time, title, location };
}

/**
 * Etkinlik listesini okunabilir metin formatına çevirir.
 */
export function formatEventsAsText(events: CalendarEvent[]): string {
  if (events.length === 0) {
    return "📅 Planlanmış etkinlik yok.";
  }

  const lines = events.map((e, i) => {
    let line = `${i + 1}. ⏰ ${e.time} — ${e.title}`;
    if (e.location) line += ` 📍 ${e.location}`;
    return line;
  });

  return `📅 Takvim (${events.length} etkinlik):\n\n${lines.join("\n")}`;
}
