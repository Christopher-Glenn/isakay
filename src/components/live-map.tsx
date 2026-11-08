import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Bus } from "@/lib/ebus";
import type { DestinationPlace } from "@/lib/iloilo-route";

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
  html: '<span class="live-map-bus" aria-hidden="true"><span class="live-map-bus-roof"></span><span class="live-map-bus-window"></span><span class="live-map-bus-window"></span><span class="live-map-bus-wheel live-map-bus-wheel-left"></span><span class="live-map-bus-wheel live-map-bus-wheel-right"></span></span>',
  iconSize: [48, 48],
  iconAnchor: [24, 24],
});

const riderIcon = L.divIcon({
  className: "",
  html: '<span class="live-map-rider" aria-hidden="true"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const destinationIcon = L.divIcon({ className: "", html: '<span class="live-map-destination" aria-hidden="true"></span>', iconSize: [28, 36], iconAnchor: [14, 36] });
const arrowIcon = (heading: number) => L.divIcon({ className: "", html: `<span class="live-map-route-arrow" style="transform: rotate(${heading}deg)" aria-hidden="true">➤</span>`, iconSize: [18, 18], iconAnchor: [9, 9] });

function MapPicker({ onPick }: { onPick: (location: Coordinates) => void }) {
  useMapEvents({ click: (event) => onPick({ lat: event.latlng.lat, lng: event.latlng.lng }) });
  return null;
}

function MapRecenter({ location }: { location: Coordinates | null }) {
  const map = useMap();
  useEffect(() => { if (location) map.flyTo([location.lat, location.lng], Math.max(15, map.getZoom()), { duration: 0.65 }); }, [location, map]);
  return null;
}

export function LiveMap({ buses, path, riderLocation, onBusClick }: { buses: Bus[]; path: Array<[number, number]>; riderLocation: Coordinates | null; onBusClick: (bus: Bus) => void }) {
  const fallbackCenter: [number, number] = path[0] ?? [10.693758, 122.546383];
  const coordinates = path.map(([lat, lng]) => [lat, lng] as [number, number]);

  return (
    <MapContainer center={fallbackCenter} zoom={14} scrollWheelZoom zoomControl={false} className="h-full w-full" aria-label="Live bus map">
      <ZoomControl position="bottomright" />
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {coordinates.length > 1 && <Polyline positions={coordinates} pathOptions={{ color: "var(--primary)", weight: 5, opacity: 0.9 }} />}
      {coordinates.slice(1, -1).filter((_, index) => index % 2 === 0).map((point, index) => <Marker key={`${point[0]}-${point[1]}`} position={point} icon={arrowIcon(index % 2 ? 45 : 10)} interactive={false} />)}
      {riderLocation && <><CenterOnLocation location={riderLocation} /><Marker position={[riderLocation.lat, riderLocation.lng]} icon={riderIcon}><Tooltip permanent direction="bottom" offset={[0, 12]}>You are here</Tooltip></Marker></>}
      {buses.filter((bus) => bus.location).map((bus) => bus.location && <Marker key={bus.id} position={[bus.location.lat, bus.location.lng]} icon={busIcon} eventHandlers={{ click: () => onBusClick(bus) }}><Tooltip direction="top" offset={[0, -18]}>{bus.bus_code}</Tooltip></Marker>)}
    </MapContainer>
  );
}

export function DestinationPickerMap({ places, selectedLocation, onPick }: { places: DestinationPlace[]; selectedLocation: Coordinates | null; onPick: (location: Coordinates) => void }) {
  const center = useMemo<[number, number]>(() => selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : [10.7132, 122.5605], [selectedLocation]);
  return <MapContainer center={center} zoom={13} scrollWheelZoom zoomControl={false} className="h-full w-full" aria-label="Choose destination on map"><ZoomControl position="bottomright" /><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><MapPicker onPick={onPick} /><MapRecenter location={selectedLocation} />{places.map((place) => <Marker key={place.name} position={[place.lat, place.lng]} icon={destinationIcon} eventHandlers={{ click: () => onPick(place) }}><Tooltip direction="top">{place.name}</Tooltip></Marker>)}{selectedLocation && <Marker position={[selectedLocation.lat, selectedLocation.lng]} icon={destinationIcon} />}</MapContainer>;
}