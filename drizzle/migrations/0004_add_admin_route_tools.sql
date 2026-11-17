CREATE OR REPLACE FUNCTION public.update_route_path(_route_id uuid, _path jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF jsonb_typeof(_path) <> 'array' OR jsonb_array_length(_path) < 2 THEN
    RAISE EXCEPTION 'invalid_path';
  END IF;
  UPDATE public.routes
  SET path = _path
  WHERE id = _route_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_route_path(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_route_path(uuid, jsonb) TO service_role;