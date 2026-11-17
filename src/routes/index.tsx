import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BusFront, Check, ChevronRight, CircleHelp, LocateFixed, MapPin, MapPinned, Moon, Route as RouteIcon, Search, Sun, UserRound } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Bus, type PassengerFareType, type RouteInfo, distanceInKm, estimatedArrivalMinutes, estimatedFare, formatUpdate, getStatus, statusLabel } from "@/lib/ebus";
import { route10Color, route10Destinations, route10Name, route10Path, type DestinationPlace } from "@/lib/iloilo-route";

type Tab = "map" | "routes" | "buses" | "about";
type Screen = "welcome" | "search" | "tracker";
const LiveMap = lazy(() => import("@/components/live-map").then((module) => ({ default: module.LiveMap })));
const DestinationPickerMap = lazy(() => import("@/components/live-map").then((module) => ({ default: module.DestinationPickerMap })));

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "E-Bus Tracker | Iloilo live buses" }, { name: "description", content: "See the latest public electric bus locations and service status in Iloilo City." }, { property: "og:title", content: "E-Bus Tracker | Iloilo live buses" }, { property: "og:description", content: "See the latest public electric bus locations and service status in Iloilo City." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Tracker,
});

function Tracker() {
  const [tab, setTab] = useState<Tab>("map");
  const [screen, setScreen] = useState<Screen>("welcome");
  const [riderName, setRiderName] = useState("");
  const [fareType, setFareType] = useState<PassengerFareType>("regular");
  const [destination, setDestination] = useState("");
  const [destinationLocation, setDestinationLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | "all">("all");
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [now, setNow] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);
  const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => { const tick = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(tick); }, []);
  useEffect(() => {
    const fallbackTimer = window.setTimeout(() => { setRoutes((current) => current.length ? current : [fallbackRoute]); setBuses((current) => current.length ? current : [fallbackBus]); setIsLoading(false); setReconnecting(true); }, 1200);
    return () => window.clearTimeout(fallbackTimer);
  }, []);
  useEffect(() => {
    let alive = true;
    async function loadTracker() {
      const [{ data: routeRows, error: routeError }, { data: busRows, error: busError }, { data: locationRows, error: locationError }] = await Promise.all([
        supabase.from("routes").select("id,name,description,start_terminal,end_terminal,path").eq("is_active", true),
        supabase.from("buses").select("id,bus_code,plate_number,route_id,is_public").eq("is_public", true),
        supabase.from("bus_locations").select("bus_id,lat,lng,speed_kmh,heading,satellites,gps_time,received_at"),
      ]);
      if (!alive) return;
      if (routeError || busError || locationError) { setReconnecting(true); setIsLoading(false); return; }
      setRoutes((routeRows ?? []).map((route) => ({ ...route, color: route10Color, path: Array.isArray(route.path) ? route.path.filter((point): point is [number, number] => Array.isArray(point) && point.length === 2 && typeof point[0] === "number" && typeof point[1] === "number") : [] })));
      setBuses((busRows ?? []).map((bus) => { const rawLocation = (locationRows ?? []).find((location) => location.bus_id === bus.id); return { ...bus, location: rawLocation ? { lat: rawLocation.lat, lng: rawLocation.lng, speed_kmh: rawLocation.speed_kmh, heading: rawLocation.heading, satellites: rawLocation.satellites, gps_time: rawLocation.gps_time, received_at: rawLocation.received_at } : undefined }; }));
      setReconnecting(false); setIsLoading(false);
    }
    void loadTracker();
    const channel = supabase.channel(`bus-locations-${Math.random().toString(36).slice(2)}`).on("postgres_changes", { event: "*", schema: "public", table: "bus_locations" }, (payload) => { const location = payload.new as Bus["location"] & { bus_id: string }; if (!location?.bus_id) return; setBuses((current) => current.map((bus) => bus.id === location.bus_id ? { ...bus, location } : bus)); setReconnecting(false); }).subscribe((status) => setReconnecting(status === "CHANNEL_ERROR" || status === "TIMED_OUT"));
    return () => { alive = false; void supabase.removeChannel(channel); };
  }, []);
  const visibleBuses = useMemo(() => buses.filter((bus) => selectedRouteId === "all" || bus.route_id === selectedRouteId), [buses, selectedRouteId]);
  const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? routes[0];
  const requestRiderLocation = () => navigator.geolocation?.getCurrentPosition(({ coords }) => setRiderLocation({ lat: coords.latitude, lng: coords.longitude }), undefined, { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 });

  if (screen === "welcome") return <WelcomeView riderName={riderName} fareType={fareType} onNameChange={setRiderName} onFareTypeChange={setFareType} onContinue={() => setScreen("search")} />;
  if (screen === "search") return <TripSearchView riderName={riderName} destination={destination} destinationLocation={destinationLocation} onDestinationChange={setDestination} onDestinationLocationChange={setDestinationLocation} buses={buses} selectedBusId={selectedBus?.id ?? ""} onSelectBus={setSelectedBus} riderLocation={riderLocation} onRequestLocation={requestRiderLocation} onBack={() => setScreen("welcome")} onSearch={() => { if (destination.trim() && selectedBus) { setSelectedRouteId(selectedBus.route_id ?? "all"); setScreen("tracker"); } }} />;

  return <main className="min-h-screen bg-background">
    <section className="mx-auto min-h-screen max-w-6xl md:grid md:grid-cols-[1fr_380px]">
      <div className="relative overflow-hidden bg-card md:min-h-screen">
        {tab === "map" && <MapView routes={routes} buses={visibleBuses} selectedBus={selectedBus} selectedRoute={selectedRoute} selectedRouteId={selectedRouteId} setSelectedRouteId={setSelectedRouteId} onBusClick={setSelectedBus} now={now} isLoading={isLoading} reconnecting={reconnecting} riderLocation={riderLocation} destination={destination} destinationLocation={destinationLocation} fareType={fareType} />}
        {tab === "routes" && <RoutesView routes={routes} onSelect={(route) => { setSelectedRouteId(route.id); setTab("map"); }} />}
        {tab === "buses" && <BusesView buses={buses} routes={routes} now={now} />}
        {tab === "about" && <AboutView />}
      </div>
      <aside className="hidden border-l border-border bg-card p-7 md:block"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground"><BusFront size={21} /></span><div><p className="font-display text-lg font-extrabold">E-Bus Tracker</p><p className="text-xs text-muted-foreground">Iloilo City public transit</p></div></div><div className="mt-10"><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Live service</p><p className="mt-2 font-display text-3xl font-extrabold">{buses.filter((bus) => getStatus(bus.location?.received_at, now) === "live").length} buses moving</p></div><Link to="/admin" className="mt-12 block text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">Administrator sign in</Link></aside>
    </section>
    {tab !== "map" && <MobileNav tab={tab} setTab={setTab} />}
  </main>;
}

function WelcomeView({ riderName, fareType, onNameChange, onFareTypeChange, onContinue }: { riderName: string; fareType: PassengerFareType | null; onNameChange: (name: string) => void; onFareTypeChange: (fareType: PassengerFareType) => void; onContinue: () => void }) {
  return <main className="min-h-screen bg-blue-deep px-5 py-6 text-primary-foreground sm:grid sm:place-items-center"><section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col justify-between overflow-hidden rounded-md bg-card text-card-foreground shadow-xl sm:min-h-[42rem]"><div className="bg-blue-deep px-7 pb-12 pt-10 text-primary-foreground"><span className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground"><BusFront size={25} /></span><p className="mt-10 text-sm font-bold uppercase tracking-[.14em] text-primary-foreground/75">Iloilo City</p><h1 className="mt-2 font-display text-4xl font-extrabold">Let’s get you moving.</h1><p className="mt-3 max-w-xs text-sm leading-6 text-primary-foreground/80">Find the live bus you plan to ride before you leave.</p></div><form className="px-7 py-8" onSubmit={(event) => { event.preventDefault(); onContinue(); }}><label htmlFor="rider-name" className="text-sm font-extrabold">What’s your name?</label><div className="relative mt-3"><UserRound className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" /><Input id="rider-name" value={riderName} onChange={(event) => onNameChange(event.target.value)} placeholder="Enter your name" autoFocus className="h-14 border-border bg-muted pl-12 text-base" /></div><fieldset className="mt-6"><legend className="text-sm font-extrabold">Passenger type</legend><div className="mt-3 grid grid-cols-2 gap-3"><Button type="button" variant={fareType === "regular" ? "default" : "secondary"} className="h-auto min-h-16 flex-col items-start px-4 py-3 text-left" onClick={() => onFareTypeChange("regular")}><span className="font-bold">Regular</span><span className="text-xs opacity-75">₱17.00 first 4 km</span></Button><Button type="button" variant={fareType === "discounted" ? "default" : "secondary"} className="h-auto min-h-16 flex-col items-start px-4 py-3 text-left" onClick={() => onFareTypeChange("discounted")}><span className="font-bold">Student / Senior / PWD</span><span className="text-xs opacity-75">20% discount</span></Button></div></fieldset><Button type="submit" className="mt-6 h-14 w-full gap-2 text-base">Continue <ChevronRight size={19} /></Button></form><p className="px-7 pb-7 text-center text-xs leading-5 text-muted-foreground">Your name and passenger type stay on this device.</p></section></main>;
}

function TripSearchView({ riderName, destination, destinationLocation, onDestinationChange, onDestinationLocationChange, buses, selectedBusId, onSelectBus, riderLocation, onRequestLocation, onBack, onSearch }: { riderName: string; destination: string; destinationLocation: { lat: number; lng: number } | null; onDestinationChange: (destination: string) => void; onDestinationLocationChange: (location: { lat: number; lng: number } | null) => void; buses: Bus[]; selectedBusId: string; onSelectBus: (bus: Bus) => void; riderLocation: { lat: number; lng: number } | null; onRequestLocation: () => void; onBack: () => void; onSearch: () => void }) {
  const [pickerOpen, setPickerOpen] = useState(false); const [query, setQuery] = useState(""); const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(destinationLocation); const matches = route10Destinations.filter((place) => place.name.toLowerCase().includes(query.toLowerCase()));
  if (pickerOpen) return <main className="relative h-screen overflow-hidden bg-background"><div className="absolute inset-0"><ClientOnly fallback={<div className="h-full bg-map-land" />}><Suspense fallback={<div className="h-full bg-map-land" />}><DestinationPickerMap places={route10Destinations} selectedLocation={pendingLocation} onPick={setPendingLocation} /></Suspense></ClientOnly></div><div className="absolute inset-x-4 top-4 z-[1100] rounded-md bg-card p-3 shadow-xl"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search route destinations" className="h-11 bg-muted pl-10" /></div>{query && <div className="mt-2 max-h-40 overflow-auto">{matches.map((place) => <button type="button" key={place.name} onClick={() => { setPendingLocation(place); onDestinationChange(place.name); }} className="flex w-full items-center gap-2 px-2 py-2 text-left text-sm font-semibold hover:bg-accent"><MapPin size={15} className="text-primary" />{place.name}</button>)}</div>}</div><div className="absolute inset-x-4 bottom-5 z-[1100] rounded-md bg-card p-4 shadow-xl"><p className="text-sm font-extrabold">Choose your destination</p><Button type="button" className="mt-4 h-12 w-full" disabled={!pendingLocation} onClick={() => { if (pendingLocation) { onDestinationLocationChange(pendingLocation); setPickerOpen(false); } }}>Set this as my destination</Button></div></main>;
  return <main className="min-h-screen bg-background px-5 py-6 sm:grid sm:place-items-center"><section className="mx-auto w-full max-w-md"><Button type="button" variant="ghost" size="icon" aria-label="Go back" onClick={onBack}><ArrowLeft size={20} /></Button><div className="mt-7 overflow-hidden rounded-md bg-card shadow-xl"><header className="bg-blue-deep px-7 pb-9 pt-8 text-primary-foreground"><p className="text-lg font-bold">Hi {riderName},</p><h1 className="mt-2 font-display text-3xl font-extrabold">Where are you going?</h1></header><form className="p-6" onSubmit={(event) => { event.preventDefault(); onSearch(); }}><Button type="button" variant="secondary" className="h-14 w-full justify-start gap-3 px-4 text-left" onClick={() => setPickerOpen(true)}><MapPin size={19} className="text-primary" /><span className="min-w-0 flex-1 truncate">{destination || "Choose a destination on the map"}</span><ChevronRight size={17} /></Button><Button type="button" variant="secondary" className="mt-3 h-11 w-full justify-start gap-2" onClick={onRequestLocation}><LocateFixed size={17} />{riderLocation ? "Current location is ready" : "Allow current location"}</Button><div className="mt-7 space-y-2">{buses.map((bus) => <Button key={bus.id} type="button" variant={selectedBusId === bus.id ? "default" : "secondary"} className="h-auto w-full justify-between px-4 py-4 text-left" onClick={() => onSelectBus(bus)}><span><span className="block font-bold">{route10Name}</span><span className="mt-0.5 block text-xs opacity-80">{bus.plate_number}</span></span><ChevronRight size={18} /></Button>)}</div><Button type="submit" className="mt-7 h-14 w-full gap-2 text-base" disabled={!destination.trim() || !selectedBusId}><Search size={18} />Search live bus</Button></form></div></section></main>;
}

const fallbackRoute: RouteInfo = { id: "route-a-demo", name: route10Name, description: "Continuous service via Tagbak, Jaro, City Proper, and key Iloilo destinations.", start_terminal: "Tagbak Terminal", end_terminal: "City Proper Loop", path: route10Path, color: route10Color };
const fallbackBus: Bus = { id: "bus-01-demo", bus_code: "BUS-01", plate_number: "EBUS-001", route_id: "route-a-demo", is_public: true, location: undefined };

function MapView({ routes, buses, selectedBus, selectedRoute, selectedRouteId, setSelectedRouteId, onBusClick, now, isLoading, reconnecting, riderLocation, destination, destinationLocation, fareType }: { routes: RouteInfo[]; buses: Bus[]; selectedBus: Bus | null; selectedRoute: RouteInfo | undefined; selectedRouteId: string | "all"; setSelectedRouteId: (id: string | "all") => void; onBusClick: (bus: Bus) => void; now: number; isLoading: boolean; reconnecting: boolean; riderLocation: { lat: number; lng: number } | null; destination: string; destinationLocation: { lat: number; lng: number } | null; fareType: PassengerFareType }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [sheetState, setSheetState] = useState<"expanded" | "peek">("peek");
  const [dragOffset, setDragOffset] = useState(0);
  const [goingTo, setGoingTo] = useState(destination);
  const dragStart = useRef<number | null>(null);
  const activeBus = selectedBus ?? buses[0];
  const status = getStatus(activeBus?.location?.received_at, now);
  const arrival = estimatedArrivalMinutes(activeBus?.location, riderLocation, activeBus?.location?.speed_kmh);
  const travel = destinationLocation && riderLocation ? Math.max(1, Math.ceil(distanceInKm(riderLocation, destinationLocation) / 18 * 60)) : null;
  const tripDistance = destinationLocation && riderLocation ? Math.max(4, distanceInKm(riderLocation, destinationLocation)) : 4;
  const fare = estimatedFare(tripDistance, fareType);
  const handleSheetPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    dragStart.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handleSheetPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (dragStart.current === null) return;
    const movement = event.clientY - dragStart.current;
    setDragOffset(sheetState === "expanded" ? Math.min(260, Math.max(0, movement)) : Math.max(-260, Math.min(0, movement)));
  };
  const finishSheetDrag = () => {
    if (dragStart.current === null) return;
    if (sheetState === "expanded" && dragOffset > 56) setSheetState("peek");
    if (sheetState === "peek" && dragOffset < -56) setSheetState("expanded");
    setDragOffset(0);
    dragStart.current = null;
  };
  const sheetTransform = sheetState === "expanded" ? `translateY(${dragOffset}px)` : `translateY(calc(100% - 88px + ${dragOffset}px))`;

  return <div className="relative h-[100svh] min-h-[620px] overflow-hidden">
    <div className="absolute inset-0"><ClientOnly fallback={<div className="h-full bg-map-land" />}><Suspense fallback={<div className="h-full bg-map-land" />}><LiveMap buses={buses} path={selectedRoute?.path ?? []} stops={route10Destinations} riderLocation={riderLocation} onBusClick={onBusClick} theme={theme} routeColor="var(--route-color)" statusForBus={(bus) => getStatus(bus.location?.received_at, now)} /></Suspense></ClientOnly></div>
    <Button type="button" size="icon" variant="secondary" aria-label={theme === "dark" ? "Use light map" : "Use dark map"} onClick={() => setTheme((value) => value === "dark" ? "light" : "dark")} className="absolute right-4 top-4 z-[1100] size-12 rounded-full shadow-lg">{theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}</Button>
    {isLoading && <div className="absolute inset-0 z-[1200] grid place-items-center"><div className="rounded-md bg-card px-4 py-3 text-sm font-bold shadow-lg">Loading buses…</div></div>}
    {reconnecting && <div className="absolute left-4 top-4 z-[1100] rounded-md bg-card/95 px-3 py-2 text-xs font-bold text-muted-foreground shadow-md">Waiting for live updates</div>}
    <section className={`map-sheet map-sheet-${theme} absolute inset-x-0 bottom-0 z-[1100] shadow-[0_-10px_30px_color-mix(in_oklab,var(--foreground)_30%,transparent)] ${dragStart.current === null ? "transition-transform duration-300 ease-out" : ""}`} style={{ transform: sheetTransform }} data-sheet-state={sheetState}>
      <div className="map-sheet-handle" role="button" tabIndex={0} aria-label={sheetState === "peek" ? "Expand trip details" : "Collapse trip details"} onPointerDown={handleSheetPointerDown} onPointerMove={handleSheetPointerMove} onPointerUp={finishSheetDrag} onPointerCancel={finishSheetDrag} onClick={() => { if (dragOffset === 0) setSheetState((value) => value === "peek" ? "expanded" : "peek"); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSheetState((value) => value === "peek" ? "expanded" : "peek"); } }}><span className="map-sheet-grip" /></div>
      <div className="px-5 pb-5">
        <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="flex items-center gap-2 text-sm font-bold"><span className="grid size-8 place-items-center rounded-full bg-route-10 text-xs text-primary-foreground">10</span><span className="truncate">{activeBus?.bus_code ?? "Route 10"}</span></p><p className="mt-1 text-xs text-muted-foreground">{statusLabel[status]} · {formatUpdate(activeBus?.location?.received_at, now)}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${status === "live" ? "bg-live/15 text-live" : status === "delayed" ? "bg-delayed/15 text-delayed" : "bg-muted text-muted-foreground"}`}>{statusLabel[status]}</span></div>
        <div className="mt-5 grid gap-3"><div className="flex items-center gap-3 border-b border-border pb-3"><LocateFixed size={18} className="text-primary" /><span className="text-sm font-semibold">Current location</span><span className="ml-auto text-xs text-muted-foreground">{riderLocation ? "Shared" : "Not shared"}</span></div><div className="flex items-center gap-3"><MapPin size={18} className="text-primary" /><Select value={goingTo} onValueChange={setGoingTo}><SelectTrigger className="h-12 border-0 bg-muted text-left font-semibold"><SelectValue placeholder="Going to" /></SelectTrigger><SelectContent>{route10Destinations.map((stop) => <SelectItem key={stop.name} value={stop.name}>{stop.name}</SelectItem>)}</SelectContent></Select></div></div>
        <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-md bg-muted p-3"><p className="text-[11px] font-bold uppercase text-muted-foreground">Bus arrives</p><p className="mt-1 font-display text-lg font-extrabold">{arrival ? `~${arrival} min` : "Approx."}</p></div><div className="rounded-md bg-muted p-3"><p className="text-[11px] font-bold uppercase text-muted-foreground">To your stop</p><p className="mt-1 font-display text-lg font-extrabold">{travel ? `~${travel} min` : "Approx."}</p></div></div>
        <div className="mt-4 flex items-center justify-between text-sm"><span className="font-semibold">{activeBus?.location ? `${Math.round(activeBus.location.speed_kmh)} km/h` : "No GPS signal yet"}</span><span className="font-extrabold">Fare ₱{fare.toFixed(2)} <span className="text-xs font-medium text-muted-foreground">est.</span></span></div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{routes.map((route) => <Button type="button" key={route.id} variant={selectedRouteId === route.id ? "default" : "secondary"} onClick={() => setSelectedRouteId(route.id)} className="h-11 shrink-0 rounded-full px-4"><span className="grid size-6 place-items-center rounded-full bg-route-10 text-xs text-primary-foreground">10</span>{route.name.replace("Route 10: ", "")}</Button>)}</div>
      </div>
    </section>
  </div>;
}

function RoutesView({ routes, onSelect }: { routes: RouteInfo[]; onSelect: (route: RouteInfo) => void }) { return <section className="mx-auto max-w-xl px-5 py-7"><h1 className="font-display text-3xl font-extrabold">Service areas</h1><div className="mt-7 space-y-3">{routes.map((route) => <button type="button" key={route.id} onClick={() => onSelect(route)} className="w-full rounded-md border border-border bg-card p-5 text-left"><p className="font-display text-lg font-extrabold">{route.name}</p><p className="mt-1 text-sm text-muted-foreground">{route.description}</p></button>)}</div></section>; }
function BusesView({ buses, routes, now }: { buses: Bus[]; routes: RouteInfo[]; now: number }) { return <section className="mx-auto max-w-xl px-5 py-7"><h1 className="font-display text-3xl font-extrabold">Buses</h1><div className="mt-7 space-y-3">{buses.map((bus) => <div key={bus.id} className="rounded-md border border-border bg-card p-4"><strong>{bus.bus_code}</strong><p className="mt-1 text-xs text-muted-foreground">{routes.find((route) => route.id === bus.route_id)?.name ?? "Unassigned route"} · {statusLabel[getStatus(bus.location?.received_at, now)]}</p></div>)}</div></section>; }
function AboutView() { return <section className="mx-auto max-w-xl px-5 py-7"><CircleHelp className="text-primary" /><h1 className="mt-4 font-display text-3xl font-extrabold">About E-Bus Tracker</h1><p className="mt-4 text-sm leading-6 text-muted-foreground">Follow public electric buses in Iloilo City using their latest received location. Positions and estimates are approximate.</p></section>; }
function MobileNav({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) { const entries: Array<{ id: Tab; label: string; icon: typeof MapPinned }> = [{ id: "map", label: "Map", icon: MapPinned }, { id: "routes", label: "Routes", icon: RouteIcon }, { id: "buses", label: "Buses", icon: BusFront }, { id: "about", label: "Help", icon: CircleHelp }]; return <nav className="fixed inset-x-0 bottom-0 z-40 flex h-20 border-t border-border bg-card md:hidden">{entries.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setTab(id)} className={`flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-bold ${tab === id ? "text-primary" : "text-muted-foreground"}`}><Icon size={19} />{label}</button>)}</nav>; }