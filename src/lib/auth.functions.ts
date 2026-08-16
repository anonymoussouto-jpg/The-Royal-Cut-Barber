import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Use admin client for the check to avoid RLS recursion or permission issues during the check itself
    // However, the policy for user_roles already uses a security definer function has_role.
    // Let's first try to see if we can just query the table directly since it's a server function
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");

    if (error) {
      console.error("Error checking admin role:", error);
      return { isAdmin: false };
    }

    return { isAdmin: roles.length > 0 };
  });
