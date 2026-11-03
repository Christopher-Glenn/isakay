import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BusFront, ChevronRight, CircleHelp, Clock3, LocateFixed, MapPin, MapPinned, Navigation, Route as RouteIcon, Search, UserRound, WifiOff } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { type Bus, type RouteInfo, formatUpdate, getStatus, statusLabel } from "@/lib/ebus";

type Tab = "map" | "routes" | "buses" | "about";
const LiveMap = lazy(() => import("@/components/live-map").then((module) => ({ default: module.LiveMap })));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "E-Bus Tracker | Iloilo live buses" },
      { name: "description", content: "See the latest public electric bus locations and service status in Iloilo City." },
      { property: "og:title", content: "E-Bus Tracker | Iloilo live buses" },
      { property: "og:description", content: "See the latest public electric bus locations and service status in Iloilo City." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Tracker,
});

function Tracker() {
  const [tab, setTab] = useState<Tab>("map");
  const [screen, setScreen] = useState<"welcome" | "search" | "tracker">("welcome");
  const [riderName, setRiderName] = useState("");
  const [destination, setDestination] = useState("");
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | "all">("all");
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [now, setNow] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);
  const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const fallbackTimer = window.setTimeout(() => {
      setRoutes((current) => current.length ? current : [fallbackRoute]);
      setBuses((current) => current.length ? current : [fallbackBus]);
      setIsLoading(false);
      setReconnecting(true);
    }, 1200);
    return () => window.clearTimeout(fallbackTimer);
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadTracker() {
      setIsLoading(true);
      const [{ data: routeRows, error: routeError }, { data: busRows, error: busError }, { data: locationRows, error: locationError }] = await Promise.all([
        supabase.from("routes").select("id,name,description,start_terminal,end_terminal,path").eq("is_active", true),
        supabase.from("buses").select("id,bus_code,plate_number,route_id,is_public").eq("is_public", true),
        supabase.from("bus_locations").select("bus_id,lat,lng,speed_kmh,heading,satellites,gps_time,received_at"),
      ]);
      if (!alive) return;
      if (routeError || busError || locationError) {
        setReconnecting(true);
        setIsLoading(false);
        return;
      }
      const safeRoutes = (routeRows ?? []).map((route) => ({
        ...route,
        path: Array.isArray(route.path) ? route.path.filter((p): p is [number, number] => Array.isArray(p) && p.length === 2 && typeof p[0] === "number" && typeof p[1] === "number") : [],
      }));
      setRoutes(safeRoutes);
      setBuses((busRows ?? []).map((bus) => {
        const rawLocation = (locationRows ?? []).find((location) => location.bus_id === bus.id);
        const location = rawLocation ? {
          lat: rawLocation.lat,
          lng: rawLocation.lng,
          speed_kmh: rawLocation.speed_kmh,
          heading: rawLocation.heading,
          satellites: rawLocation.satellites,
          gps_time: rawLocation.gps_time,
          received_at: rawLocation.received_at,
        } : undefined;
        return { ...bus, location };
      }));
      setReconnecting(false);
      setIsLoading(false);
    }
    void loadTracker();
    const channel = supabase.channel(`bus-locations-${Math.random().toString(36).slice(2)}`).on(
      "postgres_changes",
      { event: "*", schema: "public", table: "bus_locations" },
      (payload) => {
        const location = payload.new as Bus["location"] & { bus_id: string };
        if (!location?.bus_id) return;
        setBuses((current) => current.map((bus) => bus.id === location.bus_id ? { ...bus, location } : bus));
        setReconnecting(false);
      },
    ).subscribe((status) => setReconnecting(status === "CHANNEL_ERROR" || status === "TIMED_OUT"));
    return () => { alive = false; void supabase.removeChannel(channel); };
  }, []);

  const visibleBuses = useMemo(() => buses.filter((bus) => selectedRouteId === "all" || bus.route_id === selectedRouteId), [buses, selectedRouteId]);
  const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? routes[0];
  const requestRiderLocation = () => {
    if (!navigator.geolocation) { setLocationMessage("Location is not available on this device."); return; }
    setLocationMessage("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setRiderLocation({ lat: coords.latitude, lng: coords.longitude }); setLocationMessage("Your location is now shown on the map."); },
      () => setLocationMessage("Location was not shared. You can still follow the buses."),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  if (screen === "welcome") {
    return <WelcomeView riderName={riderName} onNameChange={setRiderName} onContinue={() => setScreen("search")} />;
  }

  if (screen === "search") {
    return <TripSearchView riderName={riderName} destination={destination} onDestinationChange={setDestination} buses={buses} selectedBusId={selectedBus?.id ?? ""} onSelectBus={(bus) => setSelectedBus(bus)} riderLocation={riderLocation} locationMessage={locationMessage} onRequestLocation={requestRiderLocation} onBack={() => setScreen("welcome")} onSearch={() => { if (destination.trim() && selectedBus) { setSelectedRouteId(selectedBus.route_id ?? "all"); setTab("map"); setScreen("tracker"); } }} />;
  }

  return (
    <main className="min-h-screen bg-background pb-24 md:pb-0">
      <section className="mx-auto min-h-screen max-w-6xl md:grid md:grid-cols-[1fr_380px] md:gap-0">
        <div className="relative overflow-hidden bg-card md:min-h-screen">
           {tab === "map" && <MapView riderName={riderName} routes={routes} buses={visibleBuses} selectedRoute={selectedRoute} selectedRouteId={selectedRouteId} setSelectedRouteId={setSelectedRouteId} onBusClick={setSelectedBus} now={now} isLoading={isLoading} reconnecting={reconnecting} riderLocation={riderLocation} locationMessage={locationMessage} onRequestLocation={requestRiderLocation} />}
          {tab === "routes" && <RoutesView routes={routes} onSelect={(route) => { setSelectedRouteId(route.id); setTab("map"); }} />}
          {tab === "buses" && <BusesView buses={buses} routes={routes} onSelect={setSelectedBus} now={now} />}
          {tab === "about" && <AboutView />}
        </div>
        <aside className="hidden border-l border-border bg-card p-7 md:block">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground"><BusFront size={21} /></span><div><p className="font-display text-lg font-extrabold">E-Bus Tracker</p><p className="text-xs text-muted-foreground">Iloilo City public transit</p></div></div>
          <div className="mt-10"><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Live service</p><p className="mt-2 font-display text-3xl font-extrabold">{buses.filter((bus) => getStatus(bus.location?.received_at, now) === "live").length} buses moving</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Drag the map to explore, or tap a bus for its latest update and speed.</p></div>
          <div className="mt-10 space-y-3">{routes.map((route) => <button type="button" key={route.id} onClick={() => { setSelectedRouteId(route.id); setTab("map"); }} className="flex w-full items-center justify-between rounded-md border border-border p-4 text-left hover:bg-accent"><span><strong className="block text-sm">{route.name}</strong><span className="mt-1 block text-xs text-muted-foreground">{route.start_terminal} → {route.end_terminal}</span></span><ChevronRight size={16} className="text-muted-foreground" /></button>)}</div>
          <Link to="/admin" className="mt-12 block text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">Administrator sign in</Link>
        </aside>
      </section>
      <MobileNav tab={tab} setTab={setTab} />
      <BusDrawer bus={selectedBus} route={routes.find((route) => route.id === selectedBus?.route_id)} now={now} onOpenChange={(open) => !open && setSelectedBus(null)} />
    </main>
  );
}

function WelcomeView({ riderName, onNameChange, onContinue }: { riderName: string; onNameChange: (name: string) => void; onContinue: () => void }) {
  return <main className="min-h-screen bg-blue-deep px-5 py-6 text-primary-foreground sm:grid sm:place-items-center">
    <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col justify-between overflow-hidden rounded-md bg-card text-card-foreground shadow-xl sm:min-h-[42rem]">
      <div className="bg-blue-deep px-7 pb-12 pt-10 text-primary-foreground"><span className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground"><BusFront size={25} /></span><p className="mt-10 text-sm font-bold uppercase tracking-[.14em] text-primary-foreground/75">Iloilo City</p><h1 className="mt-2 font-display text-4xl font-extrabold">Let’s get you moving.</h1><p className="mt-3 max-w-xs text-sm leading-6 text-primary-foreground/80">Find the live bus you plan to ride before you leave.</p></div>
      <form className="px-7 py-8" onSubmit={(event) => { event.preventDefault(); if (riderName.trim()) onContinue(); }}><label htmlFor="rider-name" className="text-sm font-extrabold">What’s your name?</label><div className="relative mt-3"><UserRound className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" /><Input id="rider-name" value={riderName} onChange={(event) => onNameChange(event.target.value)} placeholder="Enter your name" autoFocus className="h-14 border-border bg-muted pl-12 text-base" /></div><Button type="submit" className="mt-5 h-14 w-full gap-2 text-base" disabled={!riderName.trim()}>Continue <ChevronRight size={19} /></Button></form>
      <p className="px-7 pb-7 text-center text-xs leading-5 text-muted-foreground">Your name stays on this device and is only used to personalize your trip search.</p>
    </section>
  </main>;
}

function TripSearchView({ riderName, destination, onDestinationChange, buses, selectedBusId, onSelectBus, riderLocation, locationMessage, onRequestLocation, onBack, onSearch }: { riderName: string; destination: string; onDestinationChange: (destination: string) => void; buses: Bus[]; selectedBusId: string; onSelectBus: (bus: Bus) => void; riderLocation: { lat: number; lng: number } | null; locationMessage: string | null; onRequestLocation: () => void; onBack: () => void; onSearch: () => void }) {
  return <main className="min-h-screen bg-background px-5 py-6 sm:grid sm:place-items-center"><section className="mx-auto w-full max-w-md"><Button type="button" variant="ghost" size="icon" aria-label="Go back" onClick={onBack}><ArrowLeft size={20} /></Button><div className="mt-7 overflow-hidden rounded-md bg-card shadow-xl"><header className="bg-blue-deep px-7 pb-9 pt-8 text-primary-foreground"><p className="text-lg font-bold">Hi {riderName},</p><h1 className="mt-2 font-display text-3xl font-extrabold">Where are you going?</h1><p className="mt-2 text-sm text-primary-foreground/80">Choose a destination, then your bus.</p></header><form className="p-6" onSubmit={(event) => { event.preventDefault(); onSearch(); }}><label htmlFor="destination" className="text-sm font-extrabold">Your destination</label><div className="relative mt-2"><MapPin className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-primary" /><Input id="destination" value={destination} onChange={(event) => onDestinationChange(event.target.value)} placeholder="e.g. SM City Iloilo" className="h-14 bg-muted pl-12 text-base" /></div><Button type="button" variant="secondary" className="mt-3 h-11 w-full justify-start gap-2" onClick={onRequestLocation}><LocateFixed size={17} />{riderLocation ? "Current location is ready" : "Allow current location"}</Button>{locationMessage && <p className="mt-2 text-xs font-medium text-muted-foreground">{locationMessage}</p>}<div className="mt-7"><p className="text-sm font-extrabold">Which bus will you ride?</p><p className="mt-1 text-xs text-muted-foreground">Select a public bus to see its latest location.</p><div className="mt-3 space-y-2">{buses.map((bus) => <Button key={bus.id} type="button" variant={selectedBusId === bus.id ? "default" : "secondary"} className="h-auto w-full justify-between px-4 py-4 text-left" onClick={() => onSelectBus(bus)}><span className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-md bg-card/15"><BusFront size={18} /></span><span><span className="block font-bold">{bus.bus_code}</span><span className="mt-0.5 block text-xs opacity-80">{bus.plate_number}</span></span></span><ChevronRight size={18} /></Button>)}</div></div><Button type="submit" className="mt-7 h-14 w-full gap-2 text-base" disabled={!destination.trim() || !selectedBusId}><Search size={18} />Search live bus</Button></form></div></section></main>;
}

const fallbackRoute: RouteInfo = {
  id: "route-a-demo",
  name: "Iloilo Live Loop",
  description: "Live bus movement around Iloilo City",
  start_terminal: "Iloilo City",
  end_terminal: "Live service area",
  path: [[10.693758, 122.546383], [10.697459, 122.546537], [10.693653, 122.549420], [10.692008, 122.548754]],
};

const fallbackBus: Bus = {
  id: "bus-01-demo",
  bus_code: "BUS-01",
  plate_number: "EBUS-001",
  route_id: "route-a-demo",
  is_public: true,
  location: { lat: 10.693758, lng: 122.546383, speed_kmh: 24, heading: 32, satellites: 10, gps_time: new Date().toISOString(), received_at: new Date().toISOString() },
};

function MapView({ riderName, routes, buses, selectedRoute, selectedRouteId, setSelectedRouteId, onBusClick, now, isLoading, reconnecting, riderLocation, locationMessage, onRequestLocation }: { riderName: string; routes: RouteInfo[]; buses: Bus[]; selectedRoute: RouteInfo | undefined; selectedRouteId: string | "all"; setSelectedRouteId: (id: string | "all") => void; onBusClick: (bus: Bus) => void; now: number; isLoading: boolean; reconnecting: boolean; riderLocation: { lat: number; lng: number } | null; locationMessage: string | null; onRequestLocation: () => void; }) {
  return <div className="isolate relative min-h-[calc(100vh-5rem)] md:min-h-screen">
     <div className="absolute inset-0 z-0"><ClientOnly fallback={<div className="h-full w-full bg-map-land" />}><Suspense fallback={<div className="h-full w-full bg-map-land" />}><LiveMap buses={buses} path={selectedRoute?.path ?? []} riderLocation={riderLocation} onBusClick={onBusClick} /></Suspense></ClientOnly></div>
     <header className="relative z-[1100] flex items-center justify-between px-5 pt-5 md:px-9 md:pt-8"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-md bg-blue-deep text-primary-foreground shadow-lg md:hidden"><BusFront size={21} /></span><div><p className="font-display text-lg font-extrabold text-blue-deep md:text-2xl">Your bus is on the way, {riderName}</p><p className="text-xs font-medium text-muted-foreground">Iloilo City electric buses</p></div></div><span className="rounded-full bg-card px-3 py-2 text-xs font-bold shadow-sm"><span className="mr-1.5 inline-block size-2 rounded-full bg-live status-pulse" />Live tracking</span></header>
    <div className="relative z-[1100] mt-5 flex gap-2 overflow-x-auto px-5 pb-1 md:px-9"> <FilterButton active={selectedRouteId === "all"} onClick={() => setSelectedRouteId("all")}>All buses</FilterButton>{routes.map((route) => <FilterButton key={route.id} active={selectedRouteId === route.id} onClick={() => setSelectedRouteId(route.id)}>{route.name}</FilterButton>)}</div>
    <div className="relative z-[1100] mt-3 px-5 md:px-9"><Button type="button" variant="secondary" size="sm" onClick={onRequestLocation} className="gap-2"><LocateFixed size={16} />{riderLocation ? "Update my location" : "Use my location"}</Button>{locationMessage && <p className="mt-2 text-xs font-semibold text-muted-foreground">{locationMessage}</p>}</div>
    {isLoading && <div className="absolute inset-0 z-[1200] grid place-items-center"><div className="rounded-md bg-card px-4 py-3 text-sm font-bold shadow-lg">Loading buses…</div></div>}
    {reconnecting && <div className="absolute left-5 top-32 z-[1200] rounded-md bg-card px-3 py-2 text-xs font-bold text-muted-foreground shadow-md">Reconnecting… showing last known positions</div>}
     <div className="absolute inset-x-4 bottom-5 z-[1100] rounded-md bg-card p-4 shadow-xl md:inset-x-9 md:bottom-9"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.13em] text-blue-mid">{selectedRoute?.name ?? "All buses"}</p><p className="mt-1 font-display text-lg font-extrabold">{selectedRoute?.start_terminal ?? "Iloilo City"} <span className="text-muted-foreground">·</span> {selectedRoute?.end_terminal ?? "Live service area"}</p><p className="mt-1 text-xs text-muted-foreground">Live service area · Tap a bus for details</p></div><span className="grid size-10 place-items-center rounded-md bg-blue-soft text-blue-deep"><Navigation size={18} /></span></div></div>
  </div>;
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <Button type="button" onClick={onClick} variant={active ? "default" : "secondary"} size="sm" className="shrink-0 rounded-full px-4">{children}</Button>; }

function RoutesView({ routes, onSelect }: { routes: RouteInfo[]; onSelect: (route: RouteInfo) => void }) { return <section className="mx-auto max-w-xl px-5 py-7 md:px-10 md:py-10"><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-mid">Live service</p><h1 className="mt-2 font-display text-3xl font-extrabold">Service areas</h1><div className="mt-7 space-y-3">{routes.map((route) => <button type="button" key={route.id} onClick={() => onSelect(route)} className="w-full rounded-md border border-border bg-card p-5 text-left shadow-sm hover:bg-accent"><div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-md bg-blue-soft text-blue-deep"><RouteIcon size={18} /></span><ChevronRight size={18} className="text-muted-foreground" /></div><p className="mt-4 font-display text-lg font-extrabold">{route.name}</p><p className="mt-1 text-sm text-muted-foreground">{route.description}</p><p className="mt-4 text-xs font-bold text-blue-mid">{route.start_terminal} · {route.end_terminal}</p></button>)}</div></section>; }
function BusesView({ buses, routes, onSelect, now }: { buses: Bus[]; routes: RouteInfo[]; onSelect: (bus: Bus) => void; now: number }) { return <section className="mx-auto max-w-xl px-5 py-7 md:px-10 md:py-10"><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-mid">Fleet overview</p><h1 className="mt-2 font-display text-3xl font-extrabold">Buses</h1><div className="mt-7 space-y-3">{buses.map((bus) => { const status = getStatus(bus.location?.received_at, now); return <button type="button" key={bus.id} onClick={() => onSelect(bus)} className="flex w-full items-center gap-4 rounded-md border border-border bg-card p-4 text-left shadow-sm hover:bg-accent"><span className="grid size-11 place-items-center rounded-md bg-blue-soft text-blue-deep"><BusFront size={21} /></span><span className="min-w-0 flex-1"><strong className="block font-display text-base">{bus.bus_code}</strong><span className="mt-1 block truncate text-xs text-muted-foreground">{routes.find((route) => route.id === bus.route_id)?.name ?? "Unassigned route"}</span></span><StatusBadge status={status} /><ChevronRight size={16} className="text-muted-foreground" /></button>; })}</div></section>; }
function AboutView() { return <section className="mx-auto max-w-xl px-5 py-7 md:px-10 md:py-10"><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-mid">Helpful information</p><h1 className="mt-2 font-display text-3xl font-extrabold">About E-Bus Tracker</h1><div className="mt-8 space-y-7 text-sm leading-6 text-muted-foreground"><p>Follow public electric buses in Iloilo City using their latest received location. Positions may be approximate and buses move continuously without fixed stops.</p><div className="space-y-3"><p className="font-bold text-foreground">Service colours</p><Legend color="bg-live" text="Live — updated within the last 30 seconds" /><Legend color="bg-delayed" text="Delayed — waiting for a fresh update" /><Legend color="bg-offline" text="Offline — last known position only" /></div><div><p className="font-bold text-foreground">Install on your phone</p><p className="mt-1">Use your browser menu and choose “Add to Home Screen” to keep E-Bus Tracker close by.</p></div><Link to="/admin" className="block pt-4 text-xs underline underline-offset-4 hover:text-foreground">Administrator sign in</Link></div></section>; }
function Legend({ color, text }: { color: string; text: string }) { return <div className="flex items-center gap-3"><span className={`size-3 rounded-full ${color}`} /><span>{text}</span></div>; }
function StatusBadge({ status }: { status: ReturnType<typeof getStatus> }) { const color = status === "live" ? "bg-live" : status === "delayed" ? "bg-delayed" : "bg-offline"; return <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold"><span className={`size-1.5 rounded-full ${color}`} />{statusLabel[status]}</span>; }
function MobileNav({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) { const entries: Array<{ id: Tab; label: string; icon: typeof MapPinned }> = [{ id: "map", label: "Map", icon: MapPinned }, { id: "routes", label: "Routes", icon: RouteIcon }, { id: "buses", label: "Buses", icon: BusFront }, { id: "about", label: "Help", icon: CircleHelp }]; return <nav className="fixed inset-x-0 bottom-0 z-40 flex h-20 border-t border-border bg-card md:hidden">{entries.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setTab(id)} className={`flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-bold ${tab === id ? "text-primary" : "text-muted-foreground"}`}><Icon size={19} strokeWidth={tab === id ? 2.5 : 1.8} />{label}</button>)}</nav>; }
function BusDrawer({ bus, route, now, onOpenChange }: { bus: Bus | null; route: RouteInfo | undefined; now: number; onOpenChange: (open: boolean) => void }) { const status = getStatus(bus?.location?.received_at, now); return <Drawer open={Boolean(bus)} onOpenChange={onOpenChange}><DrawerContent><DrawerHeader className="px-6 pb-6 text-left"><div className="flex items-start justify-between gap-4"><div><DrawerTitle className="font-display text-2xl font-extrabold">{bus?.bus_code ?? "Bus"}</DrawerTitle><DrawerDescription className="mt-1">{route?.name ?? "Public service"} · {bus?.plate_number}</DrawerDescription></div><StatusBadge status={status} /></div><div className="mt-6 grid grid-cols-3 gap-3"><Metric icon={<Clock3 size={16} />} label="Last update" value={formatUpdate(bus?.location?.received_at, now)} /><Metric icon={<Navigation size={16} />} label="Speed" value={bus?.location ? `${Math.round(bus.location.speed_kmh)} km/h` : "—"} /><Metric icon={<MapPinned size={16} />} label="Service area" value={route?.end_terminal ?? "Iloilo City"} /></div>{status === "offline" && <p className="mt-5 rounded-md bg-muted px-3 py-2 text-xs font-medium text-muted-foreground"><WifiOff className="mr-1 inline size-3.5" /> Last known position</p>}</DrawerHeader></DrawerContent></Drawer>; }
function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-md bg-muted p-3"><span className="text-blue-mid">{icon}</span><p className="mt-2 text-[10px] font-bold uppercase tracking-[.08em] text-muted-foreground">{label}</p><p className="mt-1 text-xs font-bold leading-4 text-foreground">{value}</p></div>; }