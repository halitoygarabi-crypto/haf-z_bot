import { getSupabase } from "../utils/supabase.js";
import type { EnvConfig } from "../config/env.js";

export interface DashboardPost {
  customer_id: string;
  title: string;
  content: string;
  image_urls?: string[];
  platforms: string[];
  status: "scheduled" | "posted" | "failed" | "draft";
  scheduled_time?: string;
}

export class DashboardService {
  /**
   * Dashboard'daki müşteri listesini getirir.
   */
  static async listClients(config: EnvConfig) {
    const supabase = getSupabase(config);
    const { data, error } = await supabase
      .from("customer_profiles")
      .select("id, company_name, industry");

    if (error) {
      console.error("[DashboardService] listClients error:", error);
      return [];
    }
    return data;
  }

  /**
   * Dashboard'a yeni bir post ekler.
   */
  static async createPost(post: DashboardPost, config: EnvConfig) {
    const supabase = getSupabase(config);
    const { data, error } = await supabase
      .from("posts")
      .insert([
        {
          ...post,
          created_at: new Date().toISOString(),
          created_by: "HafızBot",
        },
      ])
      .select();

    if (error) {
      console.error("[DashboardService] createPost error:", error);
      throw error;
    }
    return data;
  }

  /**
   * Platform istatistiklerini getirir.
   */
  static async getStats(config: EnvConfig) {
    const supabase = getSupabase(config);
    const { data, error } = await supabase
      .from("platform_stats")
      .select("*");

    if (error) {
      console.error("[DashboardService] getStats error:", error);
      return [];
    }
    return data;
  }
}
