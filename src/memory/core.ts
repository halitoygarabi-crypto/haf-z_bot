import fs from "node:fs";
import path from "node:path";

const MEMORY_DIR = path.resolve("memory");
const CORE_MEMORY_PATH = path.join(MEMORY_DIR, "core_memory.md");

const DEFAULT_CORE_MEMORY = `# 🧠 HafızBot — Temel Hafıza

Bu dosya HafızBot'un sabit tercihlerini ve bilgilerini içerir.
İstediğin zaman elle düzenleyebilirsin.

## Kullanıcı Bilgileri
- İsim: (henüz belirtilmedi)
- Dil tercihi: Türkçe
- Saat dilimi: Europe/Istanbul

## Tercihler
- Yanıt tonu: Samimi ve yardımsever
- Emoji kullanımı: Orta düzey

## Önemli Notlar
(buraya önemli notlar ekle)
`;

const SOUL_PATH = path.resolve("soul.md");

/**
 * Core memory dosyasını okur.
 * Dosya yoksa varsayılan şablonla oluşturur.
 */
export function readCoreMemory(): string {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
  }

  if (!fs.existsSync(CORE_MEMORY_PATH)) {
    fs.writeFileSync(CORE_MEMORY_PATH, DEFAULT_CORE_MEMORY, "utf-8");
  }

  return fs.readFileSync(CORE_MEMORY_PATH, "utf-8");
}

/**
 * soul.md dosyasını okur.
 */
export function readSoul(): string {
  if (fs.existsSync(SOUL_PATH)) {
    return fs.readFileSync(SOUL_PATH, "utf-8");
  }
  return "";
}

/**
 * Core memory dosyasının var olduğundan emin olur.
 */
export function ensureCoreMemory(): void {
  readCoreMemory(); // Yoksa oluşturur
}
