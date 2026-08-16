create table if not exists studio_sets (
  id text primary key,
  user_id text not null,
  name text not null,
  payload text not null,
  created_at timestamptz not null default now()
);

create index if not exists studio_sets_user_idx
  on studio_sets (user_id, created_at desc);
