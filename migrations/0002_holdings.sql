-- Remainder: per-user target holdings and optional DCA plans
create table if not exists holdings (
  id              serial primary key,
  user_id         text not null,
  symbol          text not null,
  name            text not null,
  coingecko_id    text not null,
  target_amount   numeric not null,
  current_amount  numeric not null default 0,
  source          text not null default 'manual',
  wallet_address  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists holdings_user_id_idx on holdings (user_id);

create table if not exists dca_plans (
  id              serial primary key,
  user_id         text not null,
  holding_id      integer not null references holdings(id) on delete cascade,
  target_date     date not null,
  frequency       text not null,
  assumed_price   numeric,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists dca_plans_holding_unique on dca_plans (holding_id);
create index if not exists dca_plans_user_id_idx on dca_plans (user_id);
