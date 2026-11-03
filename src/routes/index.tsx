import { createFileRoute, Link } from "@tanstack/react-router";
import { BusFront, ChevronRight, CircleHelp, Clock3, MapPinned, Navigation, Route as RouteIcon, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { type Bus, type RouteInfo, formatUpdate, getStatus, statusLabel } from "@/lib/ebus";

type Tab = "map" | "routes" | "buses" | "about";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "E-Bus Tracker | Cebu City live buses" },
      { name: "description", content: "See the latest public electric bus locations, routes, and service status in Cebu City." },
      { property: "og:title", content: "E-Bus Tracker | Cebu City live buses" },
      { property: "og:description", content: "See the latest public electric bus locations, routes, and service status in Cebu City." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Tracker,
});

function Tracker() {
  const [tab, setTab] = useState<Tab>("map");
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | "all">("all");
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [now, setNow] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadTracker() {
      setIsLoading(true);
      const [{ data: routeRows, error: routeError }, { data: stopRows, error: stopError }, { data: busRows, error: busError }, { data: locationRows, error: locationError }] = await Promise.all([
        supabase.from("routes").select("id,name,description,start_terminal,end_terminal,path").eq("is_active", true),
        supabase.from("bus_stops").select("id,name,lat,lng,sequence,is_terminal,route_id").order("sequence"),
        supabase.from("buses").select("id,bus_code,plate_number,route_id,is_public").eq("is_public", true),
        supabase.from("bus_locations").select("bus_id,lat,lng,speed_kmh,heading,satellites,gps_time,received_at"),
      ]);
      if (!alive) return;
      if (routeError || stopError || busError || locationError) {
        setReconnecting(true);
        setIsLoading(false);
        return;
      }
      const safeRoutes = (routeRows ?? []).map((route) => ({
        ...route,
        path: Array.isArray(route.path) ? route.path.filter((p): p is [number, number] => Array.isArray(p) && p.length === 2 && typeof p[0] === "number" && typeof p[1] === "number") : [],
        stops: (stopRows ?? []).filter((stop) => stop.route_id === route.id),
      }));
      setRoutes(safeRoutes);
      setBuses((busRows ?? []).map((bus) => ({ ...bus, location: (locationRows ?? []).find((location) => location.bus_id === bus.id) })));
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

  return (
    <main className="min-h-screen bg-background pb-24 md:pb-0">
      <section className="mx-auto min-h-screen max-w-6xl md:grid md:grid-cols-[1fr_380px] md:gap-0">
        <div className="relative overflow-hidden bg-card md:min-h-screen">
          {tab === "map" && <MapView routes={routes} buses={visibleBuses} selectedRoute={selectedRoute} selectedRouteId={selectedRouteId} setSelectedRouteId={setSelectedRouteId} onBusClick={setSelectedBus} now={now} isLoading={isLoading} reconnecting={reconnecting} />}
          {tab === "routes" && <RoutesView routes={routes} onSelect={(route) => { setSelectedRouteId(route.id); setTab("map"); }} />}
          {tab === "buses" && <BusesView buses={buses} routes={routes} onSelect={setSelectedBus} now={now} />}
          {tab === "about" && <AboutView />}
        </div>
        <aside className="hidden border-l border-border bg-card p-7 md:block">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground"><BusFront size={21} /></span><div><p className="font-display text-lg font-extrabold">E-Bus Tracker</p><p className="text-xs text-muted-foreground">Cebu City public transit</p></div></div>
          <div className="mt-10"><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Live service</p><p className="mt-2 font-display text-3xl font-extrabold">{buses.filter((bus) => getStatus(bus.location?.received_at, now) === "live").length} buses moving</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Tap a bus on the map to see its last update, speed, and next stop.</p></div>
          <div className="mt-10 space-y-3">{routes.map((route) => <button type="button" key={route.id} onClick={() => { setSelectedRouteId(route.id); setTab("map"); }} className="flex w-full items-center justify-between rounded-md border border-border p-4 text-left hover:bg-accent"><span><strong className="block text-sm">{route.name}</strong><span className="mt-1 block text-xs text-muted-foreground">{route.start_terminal} → {route.end_terminal}</span></span><ChevronRight size={16} className="text-muted-foreground" /></button>)}</div>
          <Link to="/admin" className="mt-12 block text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">Administrator sign in</Link>
        </aside>
      </section>
      <MobileNav tab={tab} setTab={setTab} />
      <BusDrawer bus={selectedBus} route={routes.find((route) => route.id === selectedBus?.route_id)} now={now} onOpenChange={(open) => !open && setSelectedBus(null)} />
    </main>
  );
}

function MapView({ routes, buses, selectedRoute, selectedRouteId, setSelectedRouteId, onBusClick, now, isLoading, reconnecting }: { routes: RouteInfo[]; buses: Bus[]; selectedRoute?: RouteInfo; selectedRouteId: string | "all"; setSelectedRouteId: (id: string | "all") => void; onBusClick: (bus: Bus) => void; now: number; isLoading: boolean; reconnecting: boolean; }) {
  return <div className="relative min-h-[calc(100vh-5rem)] md:min-h-screen">
    <div className="absolute inset-0 map-grid opacity-85" />
    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_49%,color-mix(in_oklab,var(--map-road)_40%,transparent)_50%,transparent_51%)] opacity-60" />
    <header className="relative z-20 flex items-center justify-between px-5 pt-5 md:px-9 md:pt-8"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-md bg-blue-deep text-primary-foreground shadow-lg md:hidden"><BusFront size={21} /></span><div><p className="font-display text-lg font-extrabold text-blue-deep md:text-2xl">Where are you going?</p><p className="text-xs font-medium text-muted-foreground">Cebu City electric buses</p></div></div><span className="rounded-full bg-card px-3 py-2 text-xs font-bold shadow-sm"><span className="mr-1.5 inline-block size-2 rounded-full bg-live status-pulse" />Live tracking</span></header>
    <div className="relative z-20 mt-5 flex gap-2 overflow-x-auto px-5 pb-1 md:px-9"> <FilterButton active={selectedRouteId === "all"} onClick={() => setSelectedRouteId("all")}>All buses</FilterButton>{routes.map((route) => <FilterButton key={route.id} active={selectedRouteId === route.id} onClick={() => setSelectedRouteId(route.id)}>{route.name}</FilterButton>)}</div>
    {selectedRoute && <RouteLine />}
    {selectedRoute?.stops.map((stop, index) => <div key={stop.id} className="absolute z-10" style={{ left: `${20 + index * 21}%`, top: `${70 - index * 12}%` }}><span className="grid size-7 place-items-center rounded-full border-2 border-card bg-blue-mid text-[10px] font-bold text-primary-foreground shadow-md">{index + 1}</span><span className="absolute left-1/2 top-8 w-28 -translate-x-1/2 text-center text-[10px] font-bold text-blue-deep drop-shadow-sm">{stop.name}</span></div>)}
    {!isLoading && buses.map((bus, index) => <BusMarker key={bus.id} bus={bus} index={index} now={now} onClick={() => onBusClick(bus)} />)}
    {isLoading && <div className="absolute inset-0 grid place-items-center"><div className="rounded-md bg-card px-4 py-3 text-sm font-bold shadow-lg">Loading buses…</div></div>}
    {reconnecting && <div className="absolute left-5 top-32 z-30 rounded-md bg-card px-3 py-2 text-xs font-bold text-muted-foreground shadow-md">Reconnecting… showing last known positions</div>}
    <div className="absolute inset-x-4 bottom-5 z-20 rounded-md bg-card p-4 shadow-xl md:inset-x-9 md:bottom-9"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.13em] text-blue-mid">{selectedRoute?.name ?? "All routes"}</p><p className="mt-1 font-display text-lg font-extrabold">{selectedRoute?.start_terminal ?? "Cebu City"} <span className="text-muted-foreground">to</span> {selectedRoute?.end_terminal ?? "All destinations"}</p><p className="mt-1 text-xs text-muted-foreground">{selectedRoute?.stops.length ?? 0} stops · Tap a bus for details</p></div><span className="grid size-10 place-items-center rounded-md bg-blue-soft text-blue-deep"><Navigation size={18} /></span></div></div>
  </div>;
}

function RouteLine() { return <div className="absolute left-[20%] top-[31%] h-[40%] w-[63%] rotate-[-36deg] border-t-[5px] border-dashed border-blue-mid opacity-85" />; }
function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <Button type="button" onClick={onClick} variant={active ? "default" : "secondary"} size="sm" className="shrink-0 rounded-full px-4">{children}</Button>; }
function BusMarker({ bus, index, now, onClick }: { bus: Bus; index: number; now: number; onClick: () => void }) { const status = getStatus(bus.location?.received_at, now); const pos = [{ left: "45%", top: "49%" }, { left: "65%", top: "35%" }][index % 2]; const color = status === "live" ? "bg-live" : status === "delayed" ? "bg-delayed" : "bg-offline"; return <button type="button" aria-label={`Open ${bus.bus_code} details`} onClick={onClick} className="absolute z-20 grid size-12 place-items-center rounded-full border-4 border-card bg-blue-deep text-primary-foreground shadow-xl transition-transform hover:scale-110" style={pos}><BusFront size={21} /><span className={`absolute -right-1 -top-1 size-3 rounded-full border-2 border-card ${color}`} /></button>; }

function RoutesView({ routes, onSelect }: { routes: RouteInfo[]; onSelect: (route: RouteInfo) => void }) { return <section className="mx-auto max-w-xl px-5 py-7 md:px-10 md:py-10"><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-mid">Plan your ride</p><h1 className="mt-2 font-display text-3xl font-extrabold">Routes</h1><div className="mt-7 space-y-3">{routes.map((route) => <button type="button" key={route.id} onClick={() => onSelect(route)} className="w-full rounded-md border border-border bg-card p-5 text-left shadow-sm hover:bg-accent"><div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-md bg-blue-soft text-blue-deep"><RouteIcon size={18} /></span><ChevronRight size={18} className="text-muted-foreground" /></div><p className="mt-4 font-display text-lg font-extrabold">{route.name}</p><p className="mt-1 text-sm text-muted-foreground">{route.start_terminal} → {route.end_terminal}</p><div className="mt-4 flex flex-wrap gap-2">{route.stops.map((stop) => <span key={stop.id} className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{stop.name}</span>)}</div></button>)}</div></section>; }
function BusesView({ buses, routes, onSelect, now }: { buses: Bus[]; routes: RouteInfo[]; onSelect: (bus: Bus) => void; now: number }) { return <section className="mx-auto max-w-xl px-5 py-7 md:px-10 md:py-10"><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-mid">Fleet overview</p><h1 className="mt-2 font-display text-3xl font-extrabold">Buses</h1><div className="mt-7 space-y-3">{buses.map((bus) => { const status = getStatus(bus.location?.received_at, now); return <button type="button" key={bus.id} onClick={() => onSelect(bus)} className="flex w-full items-center gap-4 rounded-md border border-border bg-card p-4 text-left shadow-sm hover:bg-accent"><span className="grid size-11 place-items-center rounded-md bg-blue-soft text-blue-deep"><BusFront size={21} /></span><span className="min-w-0 flex-1"><strong className="block font-display text-base">{bus.bus_code}</strong><span className="mt-1 block truncate text-xs text-muted-foreground">{routes.find((route) => route.id === bus.route_id)?.name ?? "Unassigned route"}</span></span><StatusBadge status={status} /><ChevronRight size={16} className="text-muted-foreground" /></button>; })}</div></section>; }
function AboutView() { return <section className="mx-auto max-w-xl px-5 py-7 md:px-10 md:py-10"><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-mid">Helpful information</p><h1 className="mt-2 font-display text-3xl font-extrabold">About E-Bus Tracker</h1><div className="mt-8 space-y-7 text-sm leading-6 text-muted-foreground"><p>Follow public electric buses in Cebu City using their latest received location. Positions may be approximate.</p><div className="space-y-3"><p className="font-bold text-foreground">Service colours</p><Legend color="bg-live" text="Live — updated within the last 30 seconds" /><Legend color="bg-delayed" text="Delayed — waiting for a fresh update" /><Legend color="bg-offline" text="Offline — last known position only" /></div><div><p className="font-bold text-foreground">Install on your phone</p><p className="mt-1">Use your browser menu and choose “Add to Home Screen” to keep E-Bus Tracker close by.</p></div><Link to="/admin" className="block pt-4 text-xs underline underline-offset-4 hover:text-foreground">Administrator sign in</Link></div></section>; }
function Legend({ color, text }: { color: string; text: string }) { return <div className="flex items-center gap-3"><span className={`size-3 rounded-full ${color}`} /><span>{text}</span></div>; }
function StatusBadge({ status }: { status: ReturnType<typeof getStatus> }) { const color = status === "live" ? "bg-live" : status === "delayed" ? "bg-delayed" : "bg-offline"; return <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold"><span className={`size-1.5 rounded-full ${color}`} />{statusLabel[status]}</span>; }
function MobileNav({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) { const entries: Array<{ id: Tab; label: string; icon: typeof MapPinned }> = [{ id: "map", label: "Map", icon: MapPinned }, { id: "routes", label: "Routes", icon: RouteIcon }, { id: "buses", label: "Buses", icon: BusFront }, { id: "about", label: "Help", icon: CircleHelp }]; return <nav className="fixed inset-x-0 bottom-0 z-40 flex h-20 border-t border-border bg-card md:hidden">{entries.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setTab(id)} className={`flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-bold ${tab === id ? "text-primary" : "text-muted-foreground"}`}><Icon size={19} strokeWidth={tab === id ? 2.5 : 1.8} />{label}</button>)}</nav>; }
function BusDrawer({ bus, route, now, onOpenChange }: { bus: Bus | null; route?: RouteInfo; now: number; onOpenChange: (open: boolean) => void }) { const status = getStatus(bus?.location?.received_at, now); return <Drawer open={Boolean(bus)} onOpenChange={onOpenChange}><DrawerContent><DrawerHeader className="px-6 pb-6 text-left"><div className="flex items-start justify-between gap-4"><div><DrawerTitle className="font-display text-2xl font-extrabold">{bus?.bus_code ?? "Bus"}</DrawerTitle><DrawerDescription className="mt-1">{route?.name ?? "Public service"} · {bus?.plate_number}</DrawerDescription></div><StatusBadge status={status} /></div><div className="mt-6 grid grid-cols-3 gap-3"><Metric icon={<Clock3 size={16} />} label="Last update" value={formatUpdate(bus?.location?.received_at, now)} /><Metric icon={<Navigation size={16} />} label="Speed" value={bus?.location ? `${Math.round(bus.location.speed_kmh)} km/h` : "—"} /><Metric icon={<MapPinned size={16} />} label="Next stop" value={route?.stops[1]?.name ?? "—"} /></div>{status === "offline" && <p className="mt-5 rounded-md bg-muted px-3 py-2 text-xs font-medium text-muted-foreground"><WifiOff className="mr-1 inline size-3.5" /> Last known position</p>}</DrawerHeader></DrawerContent></Drawer>; }
function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-md bg-muted p-3"><span className="text-blue-mid">{icon}</span><p className="mt-2 text-[10px] font-bold uppercase tracking-[.08em] text-muted-foreground">{label}</p><p className="mt-1 text-xs font-bold leading-4 text-foreground">{value}</p></div>; }