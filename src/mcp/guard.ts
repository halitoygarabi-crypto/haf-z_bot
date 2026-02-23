/**
 * MCP Guard — hassas alan filtresi ve güvenlik katmanı.
 * Harici servislerden gelen/giden verilerde hassas alanları maskeler.
 */

/** Log veya çıktıya yazılmaması gereken alanlar */
const SENSITIVE_FIELDS = [
  "password",
  "token",
  "secret",
  "api_key",
  "apiKey",
  "authorization",
  "private_key",
  "client_secret",
  "refresh_token",
  "access_token",
];

/** Hassas desenleri maskele (email, uzun URL vb.) */
const SENSITIVE_PATTERNS = [
  // Email adresleri
  { pattern: /[\w.-]+@[\w.-]+\.\w{2,}/g, replacement: "[email-redacted]" },
  // Bearer token'lar
  { pattern: /Bearer\s+[\w.-]+/gi, replacement: "Bearer [redacted]" },
];

/**
 * Nesne içindeki hassas alanları maskeler.
 */
export function redactSensitiveFields(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return redactString(obj);
  if (Array.isArray(obj)) return obj.map(redactSensitiveFields);

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_FIELDS.some((f) => key.toLowerCase().includes(f))) {
        result[key] = "[REDACTED]";
      } else {
        result[key] = redactSensitiveFields(value);
      }
    }
    return result;
  }

  return obj;
}

/**
 * String içindeki hassas desenleri maskeler.
 */
function redactString(text: string): string {
  let result = text;
  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Log'a yazmadan önce güvenli hale getirir.
 */
export function sanitizeForLog(action: string, data: unknown): string {
  const safe = redactSensitiveFields(data);
  const summary =
    typeof safe === "string"
      ? safe.slice(0, 200)
      : JSON.stringify(safe).slice(0, 200);
  return `[MCP] ${action}: ${summary}`;
}

/** İzin verilen tool adları — sadece bunlar çalışır */
const TOOL_ALLOWLIST = new Set([
  "get_current_time",
  "remember_fact",
  "recall_memories",
  "get_calendar_events",
  "generate_image",
  "post_to_social",
  "generate_video",
  "generate_caption",
  "generate_influencer",
]);

/**
 * Tool çağrısının izinli olup olmadığını kontrol eder.
 */
export function isToolAllowed(toolName: string): boolean {
  return TOOL_ALLOWLIST.has(toolName);
}
