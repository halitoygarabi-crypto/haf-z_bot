/**
 * Agent Claw — Hafıza sistemi test scripti.
 * Gerçek API çağrısı yapmaz, SQLite + FTS5 yerel olarak test eder.
 *
 * Çalıştır: npx tsx scripts/test-memory.ts
 */

import { MemoryManager } from "../src/memory/index.js";
import fs from "node:fs";
import path from "node:path";

const MEMORY_DIR = path.resolve("memory");
const DB_PATH = path.join(MEMORY_DIR, "agent_claw.db");

// Önceki test verilerini temizle
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ BAŞARISIZ: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runTests(): Promise<void> {
  console.log("🧪 Agent Claw Hafıza Testi Başlıyor...\n");

  const memory = new MemoryManager();
  memory.initialize();

  // Test 1: Hafıza ekleme
  const id1 = memory.remember("Benim adım Avy", "user");
  assert(id1 > 0, "Hafıza eklendi (ID > 0)");

  const id2 = memory.remember("TypeScript tercih ediyorum", "user");
  assert(id2 > id1, "İkinci hafıza eklendi (ID arttı)");

  const id3 = memory.remember("İstanbul'da yaşıyorum", "user");
  assert(id3 > id2, "Üçüncü hafıza eklendi");

  // Test 2: Hafıza sayısı
  const count = memory.getMemoryCount();
  assert(count >= 3, `Hafıza sayısı >= 3 (gerçek: ${count})`);

  // Test 3: FTS5 arama — kayıttaki kelimeyle eşleşmeli
  const results1 = memory.recall("Avy", 3);
  assert(results1.length > 0, `"Avy" araması sonuç döndü (${results1.length})`);
  assert(
    results1.some((r) => r.content.includes("Avy")),
    '"Avy" içeren sonuç bulundu'
  );

  // Test 4: Farklı sorgu
  const results2 = memory.recall("TypeScript", 3);
  assert(results2.length > 0, `"TypeScript" araması sonuç döndü (${results2.length})`);

  // Test 5: Boş sorgu
  const results3 = memory.recall("", 3);
  assert(results3.length === 0, "Boş sorgu boş sonuç döndü");

  // Test 6: Core memory dosyası var mı
  const coreMemory = memory.getCoreMemory();
  assert(coreMemory.length > 0, "Core memory dosyası okundu");
  assert(coreMemory.includes("Agent Claw"), "Core memory başlık içeriyor");

  // Test 7: Memory log dosyası oluşturuldu mu
  const logPath = path.join(MEMORY_DIR, "memory_log.md");
  assert(fs.existsSync(logPath), "memory_log.md dosyası oluşturuldu");

  // Test 8: Tüm anıları getir
  const all = memory.getAllMemories();
  assert(all.length >= 3, `Tüm anılar getirildi (${all.length})`);

  memory.close();

  console.log("\n🎉 Tüm testler başarıyla geçti!");
}

runTests().catch((error) => {
  console.error("💥 Test hatası:", error);
  process.exit(1);
});
