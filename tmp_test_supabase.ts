import { loadConfig } from "./src/config/env.js";
import { getSupabase } from "./src/utils/supabase.js";

async function testSupabase() {
  try {
    const config = loadConfig();
    console.log("🔗 Connecting to Supabase:", config.SUPABASE_URL);
    
    const supabase = getSupabase(config);
    
    // Test 1: Health check / Simple select
    const { data: clients, error: clientError } = await supabase
      .from("customer_profiles")
      .select("count", { count: 'exact', head: true });
      
    if (clientError) {
      console.error("❌ Supabase Connection Error (customer_profiles):", clientError.message);
    } else {
      console.log("✅ Supabase Connection Successful!");
    }

    // Test 2: Try to list some tables to verify key permissions
    const tables = ["customer_profiles", "posts", "platform_stats"];
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select("*").limit(1);
        if (error) {
            console.warn(`⚠️ Table '${table}' access denied or error:`, error.message);
        } else {
            console.log(`✅ Table '${table}' is accessible. Items found:`, data.length);
        }
    }

  } catch (err) {
    console.error("💥 Critical Test Error:", err.message);
  }
}

testSupabase();
