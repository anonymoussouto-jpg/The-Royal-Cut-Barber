import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// This layout is logically protected, but its file-based routing path
// is managed by TanStack Router. Since we cannot move files to pathless routes
// easily without breaking the dev server's auto-generation, we will 
// implement the guard here and in each individual route.

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }

    // Use the server function for checking the role to avoid RLS/RPC issues on the client
    const { checkIsAdmin } = await import("@/lib/auth.functions");
    const { isAdmin } = await checkIsAdmin();

    if (!isAdmin) {
      console.error("Admin check failed: User is not an admin");
      throw redirect({
        to: "/",
      });
    }
  },
  component: () => <Outlet />,
});
