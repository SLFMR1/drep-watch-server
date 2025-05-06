CREATE TABLE IF NOT EXISTS public.drep_search_index (
  id SERIAL PRIMARY KEY,
  drep_id TEXT NOT NULL UNIQUE,
  given_name TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drep_search_index_drep_id ON public.drep_search_index USING GIN (drep_id gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_drep_search_index_given_name ON public.drep_search_index USING GIN (given_name gin_trgm_ops);

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE public.drep_search_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public drep_search_index data is viewable by everyone."
  ON public.drep_search_index FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert into drep_search_index"
  ON public.drep_search_index FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update their own records in drep_search_index"
  ON public.drep_search_index FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true); 