create table if not exists market_cache (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
