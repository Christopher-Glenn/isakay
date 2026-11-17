export type RoutePoint = [number, number];

export function parseRouteCoordinates(source: string): RoutePoint[] {
  const points = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const match = line.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (!match) throw new Error("Each coordinate must use lat,lng on its own line.");
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) throw new Error("A coordinate is outside the valid map range.");
    return [lat, lng] as RoutePoint;
  });
  if (points.length < 2) throw new Error("Add at least two coordinates.");
  return points;
}

export function parseGpxRoute(source: string): RoutePoint[] {
  const matches = [...source.matchAll(/<(?:trkpt|rtept)\s+[^>]*?lat=["'](-?\d+(?:\.\d+)?)["'][^>]*?lon=["'](-?\d+(?:\.\d+)?)["'][^>]*>/gi)];
  if (!matches.length) throw new Error("No GPX route points were found.");
  return matches.map((match) => {
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) throw new Error("A GPX coordinate is outside the valid map range.");
    return [lat, lng] as RoutePoint;
  });
}