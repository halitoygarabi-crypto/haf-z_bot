/**
 * Google Calendar API istemcisi.
 * Service Account ile kimlik doğrulama, salt okunur erişim.
 */

import { google, type calendar_v3 } from "googleapis";
import fs from "node:fs";

export interface CalendarClientConfig {
  serviceAccountKeyPath: string;
  calendarId: string;
}

let calendarApi: calendar_v3.Calendar | null = null;

/**
 * Google Calendar API istemcisini oluşturur.
 * Service Account JSON key dosyasını kullanır.
 */
export function initializeCalendarClient(
  config: CalendarClientConfig
): calendar_v3.Calendar {
  if (calendarApi) return calendarApi;

  if (!fs.existsSync(config.serviceAccountKeyPath)) {
    throw new Error(
      `Service Account key dosyası bulunamadı: ${config.serviceAccountKeyPath}`
    );
  }

  const keyFileContent = JSON.parse(
    fs.readFileSync(config.serviceAccountKeyPath, "utf-8")
  );

  const auth = new google.auth.GoogleAuth({
    credentials: keyFileContent,
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  });

  calendarApi = google.calendar({ version: "v3", auth });
  return calendarApi;
}

/**
 * Calendar API'nin hazır olup olmadığını kontrol eder.
 */
export function isCalendarReady(): boolean {
  return calendarApi !== null;
}
