import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  Bun.env.SUPABASE_URL!,
  Bun.env.SUPABASE_SERVICE_ROLE_KEY!,
);
