begin;
alter table public.gke_quote_requests add column if not exists notes text not null default '';
grant select,insert,update on public.gke_quote_requests to service_role;
create table public.gke_site_settings(id text primary key check(id='main'),value jsonb not null,revision integer not null default 0,updated_at timestamptz not null default now(),updated_by text);
alter table public.gke_site_settings enable row level security;
revoke all on public.gke_site_settings from public,anon,authenticated;
grant select,insert,update on public.gke_site_settings to service_role;
create function public.save_gke_settings(new_value jsonb, expected_revision integer, actor text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result public.gke_site_settings%rowtype;
begin
 perform pg_catalog.pg_advisory_xact_lock(723201);
 select * into result from public.gke_site_settings where id='main';
 if (found and result.revision<>expected_revision) or (not found and expected_revision<>0) then return jsonb_build_object('code','conflict');end if;
 insert into public.gke_site_settings(id,value,revision,updated_by) values('main',new_value,expected_revision+1,actor)
 on conflict(id)do update set value=excluded.value,revision=excluded.revision,updated_at=now(),updated_by=excluded.updated_by
 returning * into result;
 return jsonb_build_object('value',result.value,'revision',result.revision);
end $$;
create function public.consume_gke_limit(limit_key text,max_attempts integer,period_seconds integer)returns boolean language plpgsql security invoker set search_path='' as $$
declare counter integer;bucket bigint:=floor(extract(epoch from now())/period_seconds);
begin
 insert into public.gke_quote_limits as ql(client_hash,time_bucket)values(limit_key||':'||period_seconds,bucket)
 on conflict on constraint gke_quote_limits_pkey do update set submissions=ql.submissions+1 where ql.submissions<max_attempts returning submissions into counter;
 return counter is not null;
end $$;
create function public.accept_gke_contact(request_key uuid,payload_hash text,request_payload jsonb,client_hash text)returns jsonb language plpgsql security invoker set search_path='' as $$
declare existing public.gke_quote_requests%rowtype;reference_id uuid;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(request_key::text,0));
 select qr.* into existing from public.gke_quote_requests qr where qr.request_key=$1;
 if found then
  if existing.payload_hash<>$2 then return jsonb_build_object('code','idempotency_conflict');end if;
  return jsonb_build_object('reference',existing.reference);
 end if;
 if not public.consume_gke_limit('contact:'||$4,5,900)then return jsonb_build_object('code','rate_limited');end if;
 insert into public.gke_quote_requests(request_key,payload_hash,payload)values($1,$2,$3)returning reference into reference_id;
 return jsonb_build_object('reference',reference_id);
end $$;
revoke all on function public.save_gke_settings(jsonb,integer,text) from public,anon,authenticated;
revoke all on function public.consume_gke_limit(text,integer,integer) from public,anon,authenticated;
revoke all on function public.accept_gke_contact(uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.save_gke_settings(jsonb,integer,text)to service_role;
grant execute on function public.consume_gke_limit(text,integer,integer)to service_role;
grant execute on function public.accept_gke_contact(uuid,text,jsonb,text)to service_role;
commit;
