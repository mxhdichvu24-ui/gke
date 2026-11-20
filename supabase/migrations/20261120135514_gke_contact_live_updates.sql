begin;
create table public.gke_contact_revision (
  id text primary key check (id='main'),
  version bigint not null default 0
);
insert into public.gke_contact_revision(id) values ('main');
alter table public.gke_contact_revision enable row level security;
revoke all on public.gke_contact_revision from public,anon,authenticated,service_role;
grant select,update on public.gke_contact_revision to service_role;

create function public.bump_gke_contact_revision() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  update public.gke_contact_revision set version=version+1 where id='main';
  return null;
end;
$$;
revoke all on function public.bump_gke_contact_revision() from public,anon,authenticated;
grant execute on function public.bump_gke_contact_revision() to service_role;
create trigger gke_contact_changed after insert or update or delete on public.gke_quote_requests
for each statement execute function public.bump_gke_contact_revision();
commit;
