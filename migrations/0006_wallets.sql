create table if not exists user_wallets (
  id          serial primary key,
  user_id     text not null,
  address     text not null,
  label       text,
  created_at  timestamptz not null default now(),
  unique (user_id, address)
);

create index if not exists user_wallets_user_id_idx on user_wallets (user_id);

alter table holdings add column if not exists wallet_amount numeric not null default 0;
alter table holdings add column if not exists manual_amount numeric;

update holdings
set
  wallet_amount = case when source = 'wallet' then current_amount else 0 end,
  manual_amount = case when source = 'wallet' then 0 else current_amount end
where manual_amount is null;

update holdings set manual_amount = 0 where manual_amount is null;
