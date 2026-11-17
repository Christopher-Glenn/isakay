import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Bus, TrackerStatus } from "@/lib/ebus";
import type { DestinationPlace } from "@/lib/iloilo-route";

type Coordinates = { lat: number; lng: number };
type MapTheme = "dark" | "light";

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

function FitRoute({ path }: { path: Array<[number, number]> }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || path.length < 2) return;
    fitted.current = true;
    map.fitBounds(L.latLngBounds(path), { padding: [35, 35] });
  }, [map, path]);
  return null;
}

const busIcon = (heading: number, status: TrackerStatus) =>
  L.divIcon({
    className: "",
    html: `<span class="live-map-bus live-map-bus-${status}" style="transform:rotate(${heading}deg)" aria-hidden="true"><span class="live-map-bus-body">▰</span></span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

const riderIcon = L.divIcon({
  className: "",
  html: '<span class="live-map-rider" aria-hidden="true"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});
const destinationIcon = L.divIcon({
  className: "",
  html: '<span class="live-map-destination" aria-hidden="true"></span>',
  iconSize: [28, 36],
  iconAnchor: [14, 36],
});
const stopIcon = (terminal: boolean) =>
  L.divIcon({
    className: "",
    html: `<span class="${terminal ? "live-map-terminal" : "live-map-stop"}" aria-hidden="true">${terminal ? "⚑" : ""}</span>`,
    iconSize: terminal ? [28, 28] : [14, 14],
    iconAnchor: terminal ? [14, 24] : [7, 7],
  });

function MapPicker({ onPick }: { onPick: (location: Coordinates) => void }) {
  useMapEvents({ click: (event) => onPick({ lat: event.latlng.lat, lng: event.latlng.lng }) });
  return null;
}

function MapRecenter({ location }: { location: Coordinates | null }) {
  const map = useMap();
  useEffect(() => {
    if (location) map.flyTo([location.lat, location.lng], Math.max(15, map.getZoom()), { duration: 0.65 });
  }, [location, map]);
  return null;
}

const CARTO_KEY = "cb1_5apm_1_825b723e569e0fe6e86f6786";
const hasKey = CARTO_KEY.length > 0 && !CARTO_KEY.startsWith("PASTE_");

const osmTile = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: "© OpenStreetMap contributors",
};
const darkTile = hasKey
  ? {
      url: `https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`,
      attribution: "© OpenStreetMap contributors © CARTO",
    }
  : osmTile; // fallback if no key is set

const tiles = { dark: darkTile, light: osmTile };

export function LiveMap({
  buses,
  path,
  stops,
  riderLocation,
  onBusClick,
  theme,
  routeColor,
  statusForBus,
}: {
  buses: Bus[];
  path: Array<[number, number]>;
  stops: DestinationPlace[];
  riderLocation: Coordinates | null;
  onBusClick: (bus: Bus) => void;
  theme: MapTheme;
  routeColor: string;
  statusForBus: (bus: Bus) => TrackerStatus;
}) {
  const fallbackCenter: [number, number] = [10.72, 122.565];
  const coordinates = path.map(([lat, lng]) => [lat, lng] as [number, number]);
  const tile = tiles[theme];
  return (
    <MapContainer
      center={fallbackCenter}
      zoom={12.5}
      scrollWheelZoom
      zoomControl={false}
      className="h-full w-full"
      aria-label="Live bus map"
    >
      <ZoomControl position="bottomright" />
      <TileLayer key={theme} attribution={tile.attribution} url={tile.url} />
      <FitRoute path={coordinates} />
      {coordinates.length > 1 && (
        <>
          <Polyline
            positions={coordinates}
            pathOptions={{
              color: "var(--route-outline)",
              weight: 8,
              opacity: 0.9,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
          <Polyline
            positions={coordinates}
            pathOptions={{ color: routeColor, weight: 6, opacity: 1, lineCap: "round", lineJoin: "round" }}
          />
        </>
      )}
      {stops.map((stop, index) => (
        <Marker key={`${stop.name}-${index}`} position={[stop.lat, stop.lng]} icon={stopIcon(index === 0)}>
          <Tooltip direction="top" offset={[0, -8]}>
            {stop.name}
          </Tooltip>
        </Marker>
      ))}
      {riderLocation && (
        <>
          <CenterOnLocation location={riderLocation} />
          <Marker position={[riderLocation.lat, riderLocation.lng]} icon={riderIcon}>
            <Tooltip direction="top" offset={[0, -12]}>
              Current location
            </Tooltip>
          </Marker>
        </>
      )}
      {buses
        .filter((bus) => bus.location)
        .map(
          (bus) =>
            bus.location && (
              <Marker
                key={bus.id}
                position={[bus.location.lat, bus.location.lng]}
                icon={busIcon(bus.location.heading, statusForBus(bus))}
                eventHandlers={{ click: () => onBusClick(bus) }}
              >
                <Tooltip direction="top" offset={[0, -18]}>
                  {bus.bus_code}
                </Tooltip>
              </Marker>
            ),
        )}
    </MapContainer>
  );
}

export function DestinationPickerMap({
  places,
  selectedLocation,
  onPick,
}: {
  places: DestinationPlace[];
  selectedLocation: Coordinates | null;
  onPick: (location: Coordinates) => void;
}) {
  const center = useMemo<[number, number]>(
    () => (selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : [10.7132, 122.5605]),
    [selectedLocation],
  );
  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom
      zoomControl={false}
      className="h-full w-full"
      aria-label="Choose destination on map"
    >
      <ZoomControl position="bottomright" />
      <TileLayer attribution={tiles.dark.attribution} url={tiles.dark.url} />
      <MapPicker onPick={onPick} />
      <MapRecenter location={selectedLocation} />
      {places.map((place, index) => (
        <Marker
          key={`${place.name}-${index}`}
          position={[place.lat, place.lng]}
          icon={destinationIcon}
          eventHandlers={{ click: () => onPick(place) }}
        >
          <Tooltip direction="top">{place.name}</Tooltip>
        </Marker>
      ))}
      {selectedLocation && <Marker position={[selectedLocation.lat, selectedLocation.lng]} icon={destinationIcon} />}
    </MapContainer>
  );
}
