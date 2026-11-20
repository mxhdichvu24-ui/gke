create table if not exists public.gke_admin_notes (
 id uuid primary key default gen_random_uuid(),
 title text not null check (length(btrim(title)) between 1 and 160),
 body text not null default '' check (length(body) <= 4000),
 due_at timestamptz not null,
 done boolean not null default false,
 color text not null default 'blue' check (color in ('blue','green','amber','purple')),
 archived boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 updated_by text not null
);
alter table public.gke_admin_notes enable row level security;
revoke all on public.gke_admin_notes from public, anon, authenticated;
grant select, insert, update on public.gke_admin_notes to service_role;
create index if not exists gke_admin_notes_active_due_idx on public.gke_admin_notes (due_at,id) where archived = false;
