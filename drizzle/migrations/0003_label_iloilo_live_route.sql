COMMENT ON TABLE public.bus_stops IS 'DEPRECATED: passenger tracking does not model fixed bus stops.';
UPDATE public.routes
SET name = 'Iloilo Live Loop',
    description = 'Live bus movement around Iloilo City',
    start_terminal = 'Iloilo City',
    end_terminal = 'Live service area',
    path = '[[10.693758,122.546383],[10.697459,122.546537],[10.693653,122.549420],[10.692008,122.548754]]'::jsonb
WHERE id = '6eb275f8-bb09-4381-bdad-28076ce7cf6f';