-- Daily holding snapshots, milestones, and plan versions.
-- Also persist whether the first-run setup has been finished.

alter table user_settings
  add column if not exists onboarding_completed boolean not null default false;

create table if not exists holding_snapshots (
  id                    serial primary key,
  user_id               text not null,
  holding_id            integer not null references holdings(id) on delete cascade,
  taken_at              date not null,
  symbol                text not null,
  asset_quantity        numeric not null,
  target_quantity       numeric not null,
  remaining_quantity    numeric not null,
  completion_pct        numeric not null,
  asset_price           numeric,
  holdings_usd          numeric,
  target_usd            numeric,
  usd_per_buy           numeric,
  projected_date        date,
  target_date           date,
  plan_status           text not null default 'none',
  created_at            timestamptz not null default now(),
  unique (holding_id, taken_at)
);

create index if not exists holding_snapshots_user_taken_idx
  on holding_snapshots (user_id, taken_at);
create index if not exists holding_snapshots_holding_taken_idx
  on holding_snapshots (holding_id, taken_at);

create table if not exists holding_milestones (
  id            serial primary key,
  user_id       text not null,
  holding_id    integer not null references holdings(id) on delete cascade,
  pct           smallint not null,
  achieved_at   date not null,
  created_at    timestamptz not null default now(),
  unique (holding_id, pct)
);

create index if not exists holding_milestones_user_idx
  on holding_milestones (user_id);

create table if not exists holding_plan_versions (
  id                serial primary key,
  user_id           text not null,
  holding_id        integer not null references holdings(id) on delete cascade,
  created_at        timestamptz not null default now(),
  target_quantity   numeric not null,
  target_date       date,
  frequency         text,
  usd_per_buy       numeric,
  assumed_price     numeric
);

create index if not exists holding_plan_versions_holding_idx
  on holding_plan_versions (holding_id, created_at);
