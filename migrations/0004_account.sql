-- Per-user account prefs: newsletter + DCA off-target email alerts.
create table if not exists user_settings (
  user_id            text primary key,
  newsletter         boolean not null default false,
  dca_alerts         boolean not null default false,
  last_dca_alert_at  timestamptz,
  updated_at         timestamptz not null default now()
);

create index if not exists user_settings_dca_alerts_idx
  on user_settings (dca_alerts)
  where dca_alerts = true;
