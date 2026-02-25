import { getSupabase } from "../utils/supabase.js";
import type { EnvConfig } from "../config/env.js";

export interface BotTask {
  id: string;
  sender: string;
  command: string;
  payload: any;
}

export class MissionControl {
  /**
   * Bekleyen görevleri getirir ve durumunu 'processing' yapar.
   */
  static async fetchPendingTasks(botName: string, config: EnvConfig): Promise<BotTask[]> {
    const supabase = getSupabase(config);
    
    // Görevleri çek
    const { data: tasks, error } = await supabase
      .from("bot_directives")
      .select("*")
      .eq("target", botName)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      console.error(`[MissionControl] Task fetch error for ${botName}:`, error);
      return [];
    }

    if (!tasks || tasks.length === 0) return [];

    // Durumları 'processing' olarak güncelle
    const taskIds = tasks.map(t => t.id);
    await supabase
      .from("bot_directives")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .in("id", taskIds);

    return tasks.map(t => ({
      id: t.id,
      sender: t.sender,
      command: t.command,
      payload: t.payload,
    }));
  }

  /**
   * Görevi tamamlandı olarak işaretler.
   */
  static async completeTask(taskId: string, result: string, config: EnvConfig): Promise<void> {
    const supabase = getSupabase(config);
    await supabase
      .from("bot_directives")
      .update({ 
        status: "completed", 
        result, 
        updated_at: new Date().toISOString() 
      })
      .eq("id", taskId);
  }

  /**
   * Görevi başarısız olarak işaretler.
   */
  static async failTask(taskId: string, error: string, config: EnvConfig): Promise<void> {
    const supabase = getSupabase(config);
    await supabase
      .from("bot_directives")
      .update({ 
        status: "failed", 
        result: error, 
        updated_at: new Date().toISOString() 
      })
      .eq("id", taskId);
  }
}
