import fs from "node:fs";
import path from "node:path";

const MEMORY_DIR = path.resolve("memory");
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

const SOUL_PATH = path.resolve("soul");

/**
 * Core memory dosyasını okur.
 * Dosya yoksa varsayılan şablonla oluşturur.
 */
export function readCoreMemory(role: string = "hafiz"): string {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
  }

  const coreMemoryPath = path.join(MEMORY_DIR, `${role}_core_memory.md`);

  if (!fs.existsSync(coreMemoryPath)) {
    fs.writeFileSync(coreMemoryPath, DEFAULT_CORE_MEMORY.replace("HafızBot", role.charAt(0).toUpperCase() + role.slice(1) + " Bot"), "utf-8");
  }

  return fs.readFileSync(coreMemoryPath, "utf-8");
}

/**
 * soul.md veya role_soul.md dosyasını okur.
 */
export function readSoul(role: string = "hafiz"): string {
  if (!fs.existsSync(SOUL_PATH)) {
    fs.mkdirSync(SOUL_PATH, { recursive: true });
  }

  const roleSoulPath = path.join(SOUL_PATH, `${role}.md`);
  const legacySoulPath = path.resolve("soul.md");

  if (fs.existsSync(roleSoulPath)) {
    return fs.readFileSync(roleSoulPath, "utf-8");
  } else if (role === "hafiz" && fs.existsSync(legacySoulPath)) {
    // Geriye dönük uyumluluk: Eğer ana soul.md varsa ve rol hafiz ise onu kullan
    return fs.readFileSync(legacySoulPath, "utf-8");
  }
  
  return "";
}

/**
 * Core memory dosyasının var olduğundan emin olur.
 */
export function ensureCoreMemory(role: string = "hafiz"): void {
  readCoreMemory(role); // Yoksa oluşturur
}
