import { SUPABASE_URL, SUPABASE_KEY } from "./supabase-config.js";

export async function createAdminClient() {
  const { createClient } = await import(
    "https://esm.sh/@supabase/supabase-js@2.57.4"
  );
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

export async function isAdmin(db, user) {
  if (!user) return false;
  const { data, error } = await db
    .from("miroku_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error)
    throw new Error(
      "Database setup is incomplete. Follow the Supabase setup guide in the repository.",
    );
  return Boolean(data);
}
