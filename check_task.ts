import { loadConfig } from "./src/config/env.js";
import { getSupabase } from "./src/utils/supabase.js";

async function check() {
  const config = loadConfig();
  const supabase = getSupabase(config);
  const { data, error } = await supabase
    .from("bot_directives")
    .select("id, target, command, status, updated_at")
    .limit(10);

  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}
check();
