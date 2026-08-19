import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const triggerGithubSync = createServerFn({ method: "POST" })
  .validator((data: any) => 
    z.object({
      message: z.string().optional().default("Sincronização manual via Admin"),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execPromise = promisify(exec);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Get user session to identify who triggered the sync
    const { data: { user } } = await supabaseAdmin.auth.getUser();

    try {
      console.log(`[GitHubSync] Iniciando sincronização: ${data.message}`);
      const { stdout, stderr } = await execPromise(`python3 sync_to_github.py "${data.message}"`);
      
      const success = !stderr || stdout.includes("Sincronizado");
      const resultMessage = stdout.trim() || stderr.trim();

      // Log to database
      const { error: insertError } = await supabaseAdmin.from("github_sync_logs" as any).insert({
        status: success ? "success" : "error",
        message: resultMessage,
        user_id: user?.id,
        details: {
          commit_message: data.message,
          timestamp: new Date().toISOString()
        }
      } as any);
      
      if (insertError) console.error("[GitHubSync] Error logging to DB:", insertError);

      if (!success) {
        return { success: false, error: resultMessage };
      }

      return { success: true, message: resultMessage };
    } catch (error: any) {
      const { error: logError } = await supabaseAdmin.from("github_sync_logs" as any).insert({
        status: "error",
        message: error.message,
        user_id: user?.id,
        details: { error: String(error) }
      } as any);
      if (logError) console.error("[GitHubSync] Error logging failure to DB:", logError);
      return { success: false, error: error.message };
    }
  });

export const getGithubSyncLogs = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("github_sync_logs" as any)
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .order("created_at", { ascending: false })
      .limit(20) as any;
      
    if (error) throw error;
    return data;
  });
