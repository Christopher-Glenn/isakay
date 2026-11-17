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
  color?: "orange" | "blue" | "green" | "purple";
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

type Coordinates = { lat: number; lng: number };

export const estimatedArrivalMinutes = (bus: Coordinates | undefined, rider: Coordinates | null, speedKmh: number | undefined) => {
  if (!bus || !rider || !speedKmh || speedKmh <= 0) return null;
  const toRadians = (value: number) => value * Math.PI / 180;
  const earthRadiusKm = 6371;
  const latitudeDifference = toRadians(rider.lat - bus.lat);
  const longitudeDifference = toRadians(rider.lng - bus.lng);
  const haversine = Math.sin(latitudeDifference / 2) ** 2 + Math.cos(toRadians(bus.lat)) * Math.cos(toRadians(rider.lat)) * Math.sin(longitudeDifference / 2) ** 2;
  const distanceKm = earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return Math.max(1, Math.ceil(distanceKm / speedKmh * 60));
};

export const statusLabel: Record<TrackerStatus, string> = {
  live: "Live",
  delayed: "Delayed",
  offline: "Offline",
};

export type PassengerFareType = "regular" | "discounted";

export const estimatedFare = (distanceKm: number, fareType: PassengerFareType) => {
  const firstFourKm = fareType === "regular" ? 17 : 13.5;
  const succeedingRate = fareType === "regular" ? 2.4 : 1.92;
  const rawFare = firstFourKm + Math.max(0, distanceKm - 4) * succeedingRate;
  return fareType === "discounted" ? Math.round(rawFare * 4) / 4 : Math.round(rawFare * 100) / 100;
};

export const distanceInKm = (from: Coordinates, to: Coordinates) => {
  const toRadians = (value: number) => value * Math.PI / 180;
  const earthRadiusKm = 6371;
  const latitudeDifference = toRadians(to.lat - from.lat);
  const longitudeDifference = toRadians(to.lng - from.lng);
  const haversine = Math.sin(latitudeDifference / 2) ** 2 + Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(longitudeDifference / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

