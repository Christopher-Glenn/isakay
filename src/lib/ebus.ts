export type TrackerStatus = "live" | "delayed" | "offline";

export type Stop = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  sequence: number;
  is_terminal: boolean;
};

export type RouteInfo = {
  id: string;
  name: string;
  description: string;
  start_terminal: string;
  end_terminal: string;
  path: Array<[number, number]>;
};

export type Bus = {
  id: string;
  bus_code: string;
  plate_number: string;
  route_id: string | null;
  is_public: boolean;
  location: {
    lat: number;
    lng: number;
    speed_kmh: number;
    heading: number;
    satellites: number;
    gps_time: string;
    received_at: string;
  } | undefined;
};

export const getStatus = (
  receivedAt: string | undefined,
  now = Date.now(),
  activeSeconds = 30,
  offlineSeconds = 120,
): TrackerStatus => {
  if (!receivedAt) return "offline";
  const seconds = Math.max(0, Math.floor((now - new Date(receivedAt).getTime()) / 1000));
  if (seconds <= activeSeconds) return "live";
  if (seconds <= offlineSeconds) return "delayed";
  return "offline";
};

export const secondsSince = (receivedAt: string | undefined, now = Date.now()) => {
  if (!receivedAt) return null;
  return Math.max(0, Math.floor((now - new Date(receivedAt).getTime()) / 1000));
};

export const formatUpdate = (receivedAt: string | undefined, now = Date.now()) => {
  const seconds = secondsSince(receivedAt, now);
  if (seconds === null) return "No signal yet";
  if (seconds < 60) return `Updated ${seconds} s ago`;
  return `Updated ${Math.floor(seconds / 60)} min ago`;
};

export const statusLabel: Record<TrackerStatus, string> = {
  live: "Live",
  delayed: "Delayed",
  offline: "Offline",
};

