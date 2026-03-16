import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DB_DIR = path.resolve("memory");
const DB_PATH = path.join(DB_DIR, "hafizbot.db");

export interface MemoryRow {
  id: number;
  content: string;
  source: string;
  created_at: string;
}

export class MemoryStore {
  private db: Database.Database;

  constructor() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    this.db = new Database(DB_PATH);
    this.db.pragma("journal_mode = WAL");
    this.initialize();
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );
    `);

    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts
      USING fts5(content, content=memories, content_rowid=id);
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
        INSERT INTO memories_fts(rowid, content) VALUES (new.id, new.content);
      END;
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, content) VALUES ('delete', old.id, old.content);
      END;
    `);
  }

  addMemory(content: string, source: string = "user"): number {
    const stmt = this.db.prepare(
      "INSERT INTO memories (content, source) VALUES (?, ?)"
    );
    const result = stmt.run(content, source);
    return result.lastInsertRowid as number;
  }

  searchMemories(query: string, topK: number = 3): MemoryRow[] {
    const sanitized = query
      .replace(/[^\w\sçğıöşüÇĞİÖŞÜ]/g, " ")
      .trim();

    if (!sanitized) return [];

    // Kelimeleri OR ile bağla + prefix match
    const words = sanitized.split(/\s+/).filter(Boolean);
    const ftsQuery = words.map((w) => `"${w}"*`).join(" OR ");

    try {
      const stmt = this.db.prepare(`
        SELECT m.id, m.content, m.source, m.created_at
        FROM memories m
        JOIN memories_fts f ON m.id = f.rowid
        WHERE memories_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `);
      return stmt.all(ftsQuery, topK) as MemoryRow[];
    } catch {
      // FTS başarısız olursa LIKE ile dene
      const stmt = this.db.prepare(`
        SELECT id, content, source, created_at
        FROM memories
        WHERE content LIKE ?
        ORDER BY created_at DESC
        LIMIT ?
      `);
      return stmt.all(`%${sanitized}%`, topK) as MemoryRow[];
    }
  }

  getAllMemories(): MemoryRow[] {
    return this.db
      .prepare("SELECT * FROM memories ORDER BY created_at DESC")
      .all() as MemoryRow[];
  }

  getMemoryCount(): number {
    const row = this.db
      .prepare("SELECT COUNT(*) as count FROM memories")
      .get() as { count: number };
    return row.count;
  }

  close(): void {
    this.db.close();
  }
}
