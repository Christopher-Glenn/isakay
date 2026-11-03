CREATE TABLE public.gps_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at timestamptz NOT NULL DEFAULT now(),
  bus_id uuid REFERENCES public.buses(id),
  bus_code text,
  http_status integer NOT NULL,
  lat double precision,
  lng double precision
);

GRANT SELECT ON public.gps_request_logs TO authenticated;
GRANT ALL ON public.gps_request_logs TO service_role;

ALTER TABLE public.gps_request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read GPS request logs"
ON public.gps_request_logs
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE INDEX gps_request_logs_received_at_idx
ON public.gps_request_logs (received_at DESC);