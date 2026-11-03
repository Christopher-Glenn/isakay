CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  user_id uuid UNIQUE,
  role text NOT NULL DEFAULT 'admin' CHECK (role = 'admin'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admins TO authenticated;
GRANT ALL ON public.admins TO service_role;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  start_terminal text NOT NULL,
  end_terminal text NOT NULL,
  path jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.routes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.routes TO authenticated;
GRANT ALL ON public.routes TO service_role;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.bus_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  name text NOT NULL,
  lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng double precision NOT NULL CHECK (lng BETWEEN -180 AND 180),
  sequence integer NOT NULL CHECK (sequence >= 0),
  is_terminal boolean NOT NULL DEFAULT false,
  UNIQUE(route_id, sequence)
);
GRANT SELECT ON public.bus_stops TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.bus_stops TO authenticated;
GRANT ALL ON public.bus_stops TO service_role;
ALTER TABLE public.bus_stops ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.buses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_code text NOT NULL UNIQUE CHECK (char_length(bus_code) <= 32),
  plate_number text NOT NULL DEFAULT '',
  route_id uuid REFERENCES public.routes(id) ON DELETE SET NULL,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.buses TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.buses TO authenticated;
GRANT ALL ON public.buses TO service_role;
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.gps_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_code text NOT NULL UNIQUE,
  bus_id uuid UNIQUE REFERENCES public.buses(id) ON DELETE CASCADE,
  token_hash text NOT NULL DEFAULT '',
  last_seen timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gps_devices TO authenticated;
GRANT ALL ON public.gps_devices TO service_role;
ALTER TABLE public.gps_devices ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.bus_locations (
  bus_id uuid PRIMARY KEY REFERENCES public.buses(id) ON DELETE CASCADE,
  lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng double precision NOT NULL CHECK (lng BETWEEN -180 AND 180),
  speed_kmh real NOT NULL DEFAULT 0 CHECK (speed_kmh >= 0),
  heading real NOT NULL DEFAULT 0 CHECK (heading >= 0 AND heading < 360),
  satellites integer NOT NULL DEFAULT 0 CHECK (satellites >= 0),
  gps_time timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bus_locations TO anon, authenticated;
GRANT ALL ON public.bus_locations TO service_role;
ALTER TABLE public.bus_locations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()) $$;

CREATE OR REPLACE FUNCTION public.claim_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE verified_email text;
BEGIN
  SELECT email INTO verified_email FROM auth.users WHERE id = auth.uid();
  IF verified_email IS NULL THEN RETURN false; END IF;
  UPDATE public.admins SET user_id = auth.uid()
  WHERE lower(email) = lower(verified_email) AND user_id IS NULL;
  RETURN public.is_admin();
END;
$$;

CREATE POLICY "admins read own allowlist row" ON public.admins FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "public reads active routes" ON public.routes FOR SELECT TO anon, authenticated USING (is_active OR public.is_admin());
CREATE POLICY "admins manage routes" ON public.routes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "public reads stops" ON public.bus_stops FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.routes r WHERE r.id = route_id AND (r.is_active OR public.is_admin())));
CREATE POLICY "admins manage stops" ON public.bus_stops FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "public reads listed buses" ON public.buses FOR SELECT TO anon, authenticated USING (is_public OR public.is_admin());
CREATE POLICY "admins manage buses" ON public.buses FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admins manage devices" ON public.gps_devices FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "public reads public locations" ON public.bus_locations FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.buses b WHERE b.id = bus_id AND (b.is_public OR public.is_admin())));
CREATE POLICY "admins manage settings" ON public.app_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "public reads status settings" ON public.app_settings FOR SELECT TO anon, authenticated USING (key IN ('active_seconds','offline_seconds') OR public.is_admin());

ALTER PUBLICATION supabase_realtime ADD TABLE public.bus_locations;