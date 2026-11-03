import { useEffect, useRef } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Bus } from "@/lib/ebus";

type Coordinates = { lat: number; lng: number };

function CenterOnLocation({ location }: { location: Coordinates | null }) {
  const map = useMap();
  const previous = useRef<Coordinates | null>(null);

  useEffect(() => {
    if (!location || (previous.current?.lat === location.lat && previous.current?.lng === location.lng)) return;
    previous.current = location;
    map.flyTo([location.lat, location.lng], Math.max(map.getZoom(), 15), { duration: 0.8 });
  }, [location, map]);

  return null;
}

const busIcon = L.divIcon({
  className: "",
  html: '<span class="live-map-bus" aria-hidden="true">🚌</span>',
  iconSize: [42, 42],
  iconAnchor: [21, 21],
});

const riderIcon = L.divIcon({
  className: "",
  html: '<span class="live-map-rider" aria-hidden="true"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export function LiveMap({ buses, path, riderLocation, onBusClick }: { buses: Bus[]; path: Array<[number, number]>; riderLocation: Coordinates | null; onBusClick: (bus: Bus) => void }) {
  const fallbackCenter: [number, number] = path[0] ?? [10.693758, 122.546383];
  const coordinates = path.map(([lat, lng]) => [lat, lng] as [number, number]);

  return (
    <MapContainer center={fallbackCenter} zoom={15} scrollWheelZoom className="h-full w-full" aria-label="Live bus map">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {coordinates.length > 1 && <Polyline positions={coordinates} pathOptions={{ color: "#0c68b4", weight: 4, dashArray: "8 8" }} />}
      {riderLocation && <><CenterOnLocation location={riderLocation} /><Marker position={[riderLocation.lat, riderLocation.lng]} icon={riderIcon}><Tooltip permanent direction="bottom" offset={[0, 12]}>You are here</Tooltip></Marker></>}
      {buses.filter((bus) => bus.location).map((bus) => bus.location && <Marker key={bus.id} position={[bus.location.lat, bus.location.lng]} icon={busIcon} eventHandlers={{ click: () => onBusClick(bus) }}><Tooltip direction="top" offset={[0, -18]}>{bus.bus_code}</Tooltip></Marker>)}
    </MapContainer>
  );
}