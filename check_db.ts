import { loadConfig } from "./src/config/env.js";
import { getSupabase } from "./src/utils/supabase.js";

async function check() {
  const config = loadConfig();
  const supabase = getSupabase(config);
  
  const { data, error } = await supabase
    .from("bot_directives")
    .select("*");
    
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Tasks:", JSON.stringify(data, null, 2));
  }
}
check();
