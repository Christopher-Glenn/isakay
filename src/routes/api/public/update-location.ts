import { createFileRoute } from "@tanstack/react-router";
import { shouldIgnoreOlderGpsTime, type GpsUpdatePayload, validateGpsUpdate } from "@/lib/gps-update";

const json = (body: Record<string, unknown>, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function tokenHash(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const Route = createFileRoute("/api/public/update-location")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let body: GpsUpdatePayload;
        try { body = await request.json(); } catch { return json({ error: "invalid_data" }, 400); }
        const { busCode, gpsTime, validCoordinates } = validateGpsUpdate(body);
        if (!busCode || !gpsTime || !validCoordinates || Number.isNaN(gpsTime.getTime())) return json({ error: "invalid_data" }, 400);

        const { data: bus } = await supabaseAdmin.from("buses").select("id,bus_code").eq("bus_code", busCode).maybeSingle();
        if (!bus) return json({ error: "unknown_bus" }, 404);

        const latitude = typeof body.lat === "number" ? body.lat : null;
        const longitude = typeof body.lng === "number" ? body.lng : null;
        const log = async (httpStatus: number) => {
          await supabaseAdmin.from("gps_request_logs").insert({ bus_id: bus.id, bus_code: bus.bus_code, http_status: httpStatus, lat: latitude, lng: longitude });
        };
        const suppliedToken = request.headers.get("x-device-token");
        if (!suppliedToken) { await log(401); return json({ error: "unauthorized" }, 401); }
        const { data: device } = await supabaseAdmin.from("gps_devices").select("id,bus_id").eq("token_hash", await tokenHash(suppliedToken)).maybeSingle();
        if (!device) { await log(401); return json({ error: "unauthorized" }, 401); }
        if (device.bus_id !== bus.id) { await log(403); return json({ error: "wrong_bus" }, 403); }

        const { data: stored } = await supabaseAdmin.from("bus_locations").select("gps_time,received_at").eq("bus_id", bus.id).maybeSingle();
        if (!shouldIgnoreOlderGpsTime(stored?.gps_time, stored?.received_at, gpsTime)) {
          const { error } = await supabaseAdmin.from("bus_locations").upsert({
            bus_id: bus.id,
            lat: latitude ?? 0,
            lng: longitude ?? 0,
            speed_kmh: typeof body.speed_kmh === "number" && Number.isFinite(body.speed_kmh) ? body.speed_kmh : 0,
            heading: typeof body.heading === "number" && Number.isFinite(body.heading) ? body.heading : 0,
            satellites: typeof body.satellites === "number" && Number.isInteger(body.satellites) && body.satellites >= 0 ? body.satellites : 0,
            gps_time: gpsTime.toISOString(),
            received_at: new Date().toISOString(),
          }, { onConflict: "bus_id" });
          if (error) { await log(400); return json({ error: "invalid_data" }, 400); }
          await supabaseAdmin.from("gps_devices").update({ last_seen: new Date().toISOString() }).eq("id", device.id);
        }
        await log(200);
        return json({ ok: true }, 200);
      },
    },
  },
});
