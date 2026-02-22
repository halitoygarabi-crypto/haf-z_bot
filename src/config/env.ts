import "dotenv/config";

export interface EnvConfig {
  TELEGRAM_BOT_TOKEN: string;
  MODEL_API_KEY: string;
  MODEL_PROVIDER: "anthropic" | "openrouter";
  MODEL_NAME: string;
  TELEGRAM_ALLOWLIST_USER_ID: number;
  TRANSCRIPTION_API_KEY: string | null;
  TTS_API_KEY: string | null;
  VECTOR_DB_API_KEY: string | null;
  VECTOR_DB_INDEX: string | null;
  MOCK_TRANSCRIPTION: boolean;
  MOCK_TTS: boolean;
  MOCK_MEMORY: boolean;
  GOOGLE_SERVICE_ACCOUNT_KEY_PATH: string | null;
  GOOGLE_CALENDAR_ID: string;
  HEARTBEAT_ENABLED: boolean;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`❌ Gerekli ortam değişkeni eksik: ${key}`);
    console.error(`   .env.example dosyasını .env olarak kopyalayıp doldurun.`);
    process.exit(1);
  }
  return value;
}

function optionalEnv(key: string): string | null {
  return process.env[key] || null;
}

function boolEnv(key: string, fallback: boolean = false): boolean {
  const val = process.env[key];
  if (!val) return fallback;
  return val.toLowerCase() === "true" || val === "1";
}

export function loadConfig(): EnvConfig {
  const config: EnvConfig = {
    TELEGRAM_BOT_TOKEN: requireEnv("TELEGRAM_BOT_TOKEN"),
    MODEL_API_KEY: requireEnv("MODEL_API_KEY"),
    MODEL_PROVIDER: (process.env.MODEL_PROVIDER === "openrouter" ? "openrouter" : "anthropic") as "anthropic" | "openrouter",
    MODEL_NAME: process.env.MODEL_NAME || "claude-sonnet-4-20250514",
    TELEGRAM_ALLOWLIST_USER_ID: Number(requireEnv("TELEGRAM_ALLOWLIST_USER_ID")),
    TRANSCRIPTION_API_KEY: optionalEnv("TRANSCRIPTION_API_KEY"),
    TTS_API_KEY: optionalEnv("TTS_API_KEY"),
    VECTOR_DB_API_KEY: optionalEnv("VECTOR_DB_API_KEY"),
    VECTOR_DB_INDEX: optionalEnv("VECTOR_DB_INDEX"),
    MOCK_TRANSCRIPTION: boolEnv("MOCK_TRANSCRIPTION"),
    MOCK_TTS: boolEnv("MOCK_TTS"),
    MOCK_MEMORY: boolEnv("MOCK_MEMORY"),
    GOOGLE_SERVICE_ACCOUNT_KEY_PATH: optionalEnv("GOOGLE_SERVICE_ACCOUNT_KEY_PATH"),
    GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID || "primary",
    HEARTBEAT_ENABLED: boolEnv("HEARTBEAT_ENABLED"),
  };

  if (isNaN(config.TELEGRAM_ALLOWLIST_USER_ID)) {
    console.error("❌ TELEGRAM_ALLOWLIST_USER_ID geçerli bir sayı olmalıdır.");
    process.exit(1);
  }

  return config;
}

export function logConfigStatus(config: EnvConfig): void {
  console.log("─────────────────────────────────────");
  console.log("🤖 Agent Claw başlatılıyor...");
  console.log("─────────────────────────────────────");
  console.log(`✅ Telegram bot token yüklendi`);
  console.log(`✅ LLM: ${config.MODEL_PROVIDER} / ${config.MODEL_NAME}`);
  console.log(`👤 İzin verilen kullanıcı ID: ${config.TELEGRAM_ALLOWLIST_USER_ID}`);

  if (config.MOCK_TRANSCRIPTION) {
    console.log("🧪 Transkripsiyon: MOCK modu aktif");
  } else if (config.TRANSCRIPTION_API_KEY) {
    console.log("✅ Ses desteği aktif (Whisper)");
  } else {
    console.log("⚠️  Ses desteği kapalı (TRANSCRIPTION_API_KEY bulunamadı)");
  }

  if (config.MOCK_TTS) {
    console.log("🧪 TTS: MOCK modu aktif");
  } else if (config.TTS_API_KEY) {
    console.log("✅ TTS desteği aktif (ElevenLabs)");
  } else {
    console.log("⚠️  TTS kapalı (TTS_API_KEY bulunamadı)");
  }

  console.log("✅ Hafıza sistemi aktif (SQLite + FTS5)");

  if (config.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
    console.log("✅ Google Calendar aktif (salt okunur)");
  } else {
    console.log("⚠️  Google Calendar kapalı (GOOGLE_SERVICE_ACCOUNT_KEY_PATH ayarlanmamış)");
  }

  if (config.HEARTBEAT_ENABLED) {
    console.log("✅ Heartbeat aktif (her gün 08:00)");
  } else {
    console.log("⏸️  Heartbeat kapalı (HEARTBEAT_ENABLED=false)");
  }

  console.log("─────────────────────────────────────");
}
