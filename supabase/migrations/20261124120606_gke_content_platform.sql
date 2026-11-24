begin;
create table public.gke_documents (
 id uuid primary key,
 kind text not null check(kind in ('articles','articlePreviews','channels','agents','services','tariffs','promotions','staff','workspace','feedback','media','quoteSnapshots')),
 value jsonb not null check(jsonb_typeof(value)='object'),
 revision integer not null check(revision>0),
 deleted boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 updated_by text not null
);
create index gke_documents_kind_updated on public.gke_documents(kind,updated_at desc);
create unique index gke_staff_email_unique on public.gke_documents(lower(value->>'email')) where kind='staff' and not deleted;
create unique index gke_article_vi_slug_unique on public.gke_documents((value#>>'{translations,vi,slug}')) where kind='articles' and not deleted and coalesce(value#>>'{translations,vi,slug}','')<>'';
create unique index gke_article_en_slug_unique on public.gke_documents((value#>>'{translations,en,slug}')) where kind='articles' and not deleted and coalesce(value#>>'{translations,en,slug}','')<>'';
create unique index gke_article_zh_slug_unique on public.gke_documents((value#>>'{translations,zh,slug}')) where kind='articles' and not deleted and coalesce(value#>>'{translations,zh,slug}','')<>'';
create table public.gke_document_history (
 document_id uuid not null references public.gke_documents(id),
 kind text not null,revision integer not null,value jsonb not null,deleted boolean not null,
 created_at timestamptz not null,updated_at timestamptz not null,updated_by text not null,previous jsonb,
 primary key(document_id,revision)
);
create table public.gke_events (
 id bigint generated always as identity primary key,
 event text not null check(event in ('widget_open','channel_select','external_open')),
 channel uuid references public.gke_documents(id),department text,locale text not null check(locale in ('vi','en','zh')),
 created_at timestamptz not null default now()
);
create index gke_events_created on public.gke_events(created_at desc);
alter table public.gke_documents enable row level security;
alter table public.gke_document_history enable row level security;
alter table public.gke_events enable row level security;
revoke all on public.gke_documents,public.gke_document_history,public.gke_events from public,anon,authenticated;
grant select,insert,update on public.gke_documents to service_role;
grant select,insert on public.gke_document_history,public.gke_events to service_role;
grant usage,select on sequence public.gke_events_id_seq to service_role;
create function public.save_gke_document(document_kind text,document_id uuid,new_value jsonb,expected_revision integer,actor text,is_deleted boolean default false)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare old public.gke_documents; saved public.gke_documents;
begin
 if expected_revision<0 or jsonb_typeof(new_value)<>'object' or actor is null then return jsonb_build_object('code','invalid_input');end if;
 -- The lock also serialises creates and commercial overlap checks for a kind.
 perform pg_advisory_xact_lock(hashtextextended('gke-documents:'||document_kind,0));
 select * into old from public.gke_documents d where d.id=document_id for update;
 if coalesce(old.revision,0)<>expected_revision or old.id is not null and old.kind<>document_kind then return jsonb_build_object('code','conflict');end if;
 if document_kind='tariffs' and not is_deleted and new_value->>'status'='active' and new_value->>'classification'='public' and exists(
  select 1 from public.gke_documents d
  cross join lateral jsonb_array_elements(d.value->'bands') a
  cross join lateral jsonb_array_elements(new_value->'bands') b
  where d.kind='tariffs' and not d.deleted and d.id<>document_id and d.value->>'status'='active' and d.value->>'classification'='public'
  and d.value->>'currency'=new_value->>'currency'
  and tstzrange((d.value->>'startsAt')::timestamptz,(d.value->>'endsAt')::timestamptz,'[)') && tstzrange((new_value->>'startsAt')::timestamptz,(new_value->>'endsAt')::timestamptz,'[)')
  and a->>'route'=b->>'route' and a->>'service'=b->>'service'
  and (a->>'zone'=b->>'zone' or a->>'zone'='all' or b->>'zone'='all')
 ) then return jsonb_build_object('code','active_tariff_overlap');end if;
 insert into public.gke_documents as d(id,kind,value,revision,deleted,created_at,updated_at,updated_by)
 values(document_id,document_kind,new_value,expected_revision+1,is_deleted,coalesce(old.created_at,now()),now(),actor)
 on conflict(id)do update set value=excluded.value,revision=excluded.revision,deleted=excluded.deleted,updated_at=excluded.updated_at,updated_by=excluded.updated_by
 returning d.* into saved;
 insert into public.gke_document_history(document_id,kind,revision,value,deleted,created_at,updated_at,updated_by,previous)
 values(saved.id,saved.kind,saved.revision,saved.value,saved.deleted,saved.created_at,saved.updated_at,saved.updated_by,case when old.id is null then null else to_jsonb(old)end);
 return to_jsonb(saved);
exception when unique_violation then return jsonb_build_object('code','duplicate');
end $$;
revoke all on function public.save_gke_document(text,uuid,jsonb,integer,text,boolean) from public,anon,authenticated;
grant execute on function public.save_gke_document(text,uuid,jsonb,integer,text,boolean) to service_role;
-- Uploaded images remain private; the server serves only authorised previews
-- or assets referenced by published content.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('gke-media','gke-media',false,3145728,array['image/webp']) on conflict(id)do nothing;
commit;
