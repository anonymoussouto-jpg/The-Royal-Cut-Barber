import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const createBarberUser = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        barberId: z.string(),
        email: z.string().email(),
        password: z.string().min(6),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    // 1. Check if the caller is an admin
    const {
      data: { user: caller },
    } = await supabase.auth.getUser();
    if (!caller) throw new Error("Unauthorized");

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });

    if (!isAdmin) throw new Error("Only admins can create barber users");

    // 2. Use admin client to create the user
    // We import dynamically to keep it out of the client bundle
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });

    if (createError) throw createError;

    // 3. Assign 'barber' role
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: newUser.user.id,
      role: "barber",
    });

    if (roleError) {
      // Cleanup user if role assignment fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw roleError;
    }

    // 4. Link to barber record
    const { error: linkError } = await supabaseAdmin
      .from("barbers")
      .update({
        auth_user_id: newUser.user.id,
        email: data.email,
      })
      .eq("id", data.barberId);

    if (linkError) {
      // Cleanup if linking fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw linkError;
    }

    return { success: true, userId: newUser.user.id };
  });
