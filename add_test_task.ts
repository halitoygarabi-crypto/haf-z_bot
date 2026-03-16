import { loadConfig } from "./src/config/env.js";
import { getSupabase } from "./src/utils/supabase.js";

async function add() {
  const config = loadConfig();
  const supabase = getSupabase(config);
  
  const task = {
    sender: "hafiz",
    target: "marketing",
    command: "2026 İstanbul lüks mobilya trend analizi raporu hazırla.",
    payload: { priority: "high" },
    status: "pending",
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("bot_directives")
    .insert([task])
    .select();

  if (error) {
    console.error("❌ Hata:", error.message);
  } else {
    console.log("✅ Görev eklendi:", JSON.stringify(data, null, 2));
  }
}
add();
