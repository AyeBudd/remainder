create table if not exists newsletters (
  id            serial primary key,
  slug          text not null unique,
  title         text not null,
  lede          text not null,
  body          jsonb not null,
  tester        boolean not null default false,
  published_at  timestamptz not null default now()
);

create index if not exists newsletters_published_at_idx on newsletters (published_at desc);
