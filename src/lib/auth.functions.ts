import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    console.log("Checking admin role for user:", userId);

    // Use query for roles
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");

    if (error) {
      console.error("Error checking admin role:", error);
      return { isAdmin: false };
    }

    const isAdmin = roles && roles.length > 0;
    console.log("Admin check result:", isAdmin);

    return { isAdmin };
  });
