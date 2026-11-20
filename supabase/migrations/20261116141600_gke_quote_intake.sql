begin;

create table public.gke_quote_requests (
  request_key uuid primary key,
  reference uuid not null unique default gen_random_uuid(),
  payload_hash text not null,
  payload jsonb not null,
  status text not null default 'received',
  created_at timestamptz not null default now()
);
alter table public.gke_quote_requests enable row level security;
revoke all on public.gke_quote_requests from public, anon, authenticated;
grant select, insert on public.gke_quote_requests to service_role;

create table public.gke_quote_limits (
  client_hash text not null,
  time_bucket bigint not null,
  submissions integer not null default 1,
  primary key (client_hash, time_bucket)
);
alter table public.gke_quote_limits enable row level security;
revoke all on public.gke_quote_limits from public, anon, authenticated;
grant select, insert, update on public.gke_quote_limits to service_role;

create function public.accept_gke_quote(
  request_key uuid,
  client_hash text,
  payload_hash text,
  request_payload jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  existing public.gke_quote_requests%rowtype;
  counter integer;
  reference_id uuid;
  time_bucket bigint := floor(extract(epoch from now()) / 900);
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(request_key::text, 0));
  select qr.* into existing from public.gke_quote_requests qr where qr.request_key = $1;
  if found then
    if existing.payload_hash <> $3 then
      return jsonb_build_object('code', 'idempotency_conflict');
    end if;
    return jsonb_build_object('reference', existing.reference);
  end if;

  insert into public.gke_quote_limits as ql (client_hash, time_bucket)
  values ($2, time_bucket)
  on conflict on constraint gke_quote_limits_pkey do update
    set submissions = ql.submissions + 1 where ql.submissions < 5
  returning submissions into counter;
  if counter is null then
    return jsonb_build_object('code', 'rate_limited');
  end if;

  insert into public.gke_quote_requests (request_key, payload_hash, payload)
  values ($1, $3, $4) returning reference into reference_id;
  return jsonb_build_object('reference', reference_id);
end;
$$;
revoke all on function public.accept_gke_quote(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.accept_gke_quote(uuid, text, text, jsonb) to service_role;

commit;
