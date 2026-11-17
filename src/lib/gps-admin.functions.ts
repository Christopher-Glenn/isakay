import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const tokenHash = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const regenerateGpsToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { deviceId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("is_admin");
    if (!allowed) throw new Error("Not authorized");

    const token = crypto.getRandomValues(new Uint8Array(32));
    const tokenValue = btoa(String.fromCharCode(...token)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("gps_devices").update({ token_hash: await tokenHash(tokenValue) }).eq("id", data.deviceId);
    if (error) throw new Error("Could not regenerate the GPS token");
    return { token: tokenValue };
  });