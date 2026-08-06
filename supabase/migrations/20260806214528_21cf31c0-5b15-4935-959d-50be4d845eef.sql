ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS event text;
CREATE INDEX IF NOT EXISTS page_views_event_idx ON public.page_views (event, created_at DESC);