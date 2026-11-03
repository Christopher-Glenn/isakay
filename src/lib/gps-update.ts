export type GpsUpdatePayload = {
  bus_code?: unknown;
  lat?: unknown;
  lng?: unknown;
  speed_kmh?: unknown;
  heading?: unknown;
  satellites?: unknown;
  gps_time?: unknown;
};

export function validateGpsUpdate(body: GpsUpdatePayload) {
  const busCode = typeof body.bus_code === "string" ? body.bus_code.trim() : "";
  const gpsTime = typeof body.gps_time === "string" ? new Date(body.gps_time) : null;
  const validCoordinates = typeof body.lat === "number" && Number.isFinite(body.lat) && body.lat >= -90 && body.lat <= 90 && typeof body.lng === "number" && Number.isFinite(body.lng) && body.lng >= -180 && body.lng <= 180;
  return { busCode, gpsTime, validCoordinates };
}

export function shouldIgnoreOlderGpsTime(storedGpsTime: string | undefined, storedReceivedAt: string | undefined, incomingGpsTime: Date, now = Date.now()) {
  if (!storedGpsTime || !storedReceivedAt) return false;
  const receivedAt = new Date(storedReceivedAt).getTime();
  const storedAt = new Date(storedGpsTime).getTime();
  return Number.isFinite(receivedAt) && Number.isFinite(storedAt) && now - receivedAt < 60_000 && incomingGpsTime.getTime() < storedAt;
}
