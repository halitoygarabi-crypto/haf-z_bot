import { createClient } from "@supabase/supabase-js";
import type { EnvConfig } from "../config/env.js";

export function getSupabase(config: EnvConfig) {
  if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
    throw new Error("Supabase URL or Anon Key is missing in config.");
  }
  return createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
}
