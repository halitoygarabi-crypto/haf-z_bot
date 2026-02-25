/**
 * Konuşma Geçmişi Yöneticisi
 * Her chat için son N mesajı hafızada tutar.
 * Bot bağlamı kaybetmeden konuşmaya devam edebilir.
 */

export interface ChatMessage {
  role: "user" | "assistant" | "tool";
  content: string | ContentPart[];
  tool_calls?: any[];
  tool_call_id?: string;
  timestamp: number;
}

export interface ContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

const MAX_HISTORY = 20; // Son 20 mesaj tut
const HISTORY_TTL_MS = 30 * 60 * 1000; // 30 dakika sonra sil

class ConversationManager {
  private histories = new Map<number, ChatMessage[]>();

  /**
   * Mesaj ekle (kullanıcı, asistan veya tool sonucu).
   */
  addMessage(
    chatId: number, 
    role: "user" | "assistant" | "tool", 
    content: string | ContentPart[],
    options?: { tool_calls?: any[]; tool_call_id?: string }
  ): void {
    if (!this.histories.has(chatId)) {
      this.histories.set(chatId, []);
    }

    const history = this.histories.get(chatId)!;
    history.push({ 
      role, 
      content, 
      timestamp: Date.now(),
      tool_calls: options?.tool_calls,
      tool_call_id: options?.tool_call_id,
    });

    // Eski mesajları temizle (TTL)
    const cutoff = Date.now() - HISTORY_TTL_MS;
    while (history.length > 0 && history[0].timestamp < cutoff) {
      history.shift();
    }

    // Max limit
    while (history.length > MAX_HISTORY) {
      history.shift();
    }
  }

  /**
   * Chat geçmişini al.
   */
  getHistory(chatId: number): ChatMessage[] {
    return this.histories.get(chatId) || [];
  }

  /**
   * Chat geçmişini temizle.
   */
  clear(chatId: number): void {
    this.histories.delete(chatId);
  }
}

// Singleton instance
export const conversationManager = new ConversationManager();
