import { MemoryStore, type MemoryRow } from "./store.js";
import { readCoreMemory, ensureCoreMemory, readSoul } from "./core.js";
import { appendMemoryLog } from "./log.js";

/**
 * MemoryManager — hafıza alt sistemlerini birleştirir.
 * Store (SQLite) + Core Memory (md) + Log (md).
 */
export class MemoryManager {
  private store: MemoryStore;

  constructor() {
    this.store = new MemoryStore();
  }

  /**
   * Hafıza sistemini başlatır, gerekli dosyaları oluşturur.
   */
  initialize(): void {
    ensureCoreMemory();
    console.log(`🧠 Hafıza sistemi başlatıldı (${this.store.getMemoryCount()} kayıt)`);
  }

  /**
   * Kullanıcıdan gelen bilgiyi hafızaya kaydeder.
   */
  remember(content: string, source: string = "user"): number {
    const id = this.store.addMemory(content, source);
    appendMemoryLog("remember", truncate(content, 100));
    return id;
  }

  /**
   * Sorguyla ilgili anıları getirir (top-k).
   */
  recall(query: string, topK: number = 3): MemoryRow[] {
    const results = this.store.searchMemories(query, topK);
    appendMemoryLog("recall", `"${truncate(query, 50)}" → ${results.length} sonuç`);
    return results;
  }

  /**
   * Core memory içeriğini döner (system prompt için).
   */
  getCoreMemory(): string {
    return readCoreMemory();
  }

  /**
   * soul.md içeriğini döner.
   */
  getSoul(): string {
    return readSoul();
  }

  /**
   * Hafıza sayısını döner.
   */
  getMemoryCount(): number {
    return this.store.getMemoryCount();
  }

  /**
   * Tüm anıları döner (debug).
   */
  getAllMemories(): MemoryRow[] {
    return this.store.getAllMemories();
  }

  /**
   * Kapatır.
   */
  close(): void {
    this.store.close();
  }
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
}
