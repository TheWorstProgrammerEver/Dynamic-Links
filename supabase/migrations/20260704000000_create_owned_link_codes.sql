create extension if not exists pgcrypto with schema extensions;

create type public.link_code_response_mode as enum ('redirect', 'raw_content');
create type public.link_code_status as enum ('draft', 'active', 'disabled');

create table public.link_codes (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  display_name text not null,
  code text not null,
  response_mode public.link_code_response_mode not null default 'redirect',
  status public.link_code_status not null default 'draft',
  redirect_url text,
  raw_content text,
  created_date date not null default current_date,
  updated_date date not null default current_date,
  constraint link_codes_display_name_not_blank check (length(trim(display_name)) > 0),
  constraint link_codes_code_not_blank check (length(trim(code)) > 0),
  constraint link_codes_code_has_no_surrounding_space check (code = trim(code)),
  constraint link_codes_code_key unique (code)
);

create index link_codes_owner_created_idx
  on public.link_codes (owner_user_id, created_date desc, display_name);

alter table public.link_codes enable row level security;

create policy "Owners can read link codes"
on public.link_codes
for select
to authenticated
using (owner_user_id = auth.uid());

create policy "Owners can create link codes"
on public.link_codes
for insert
to authenticated
with check (owner_user_id = auth.uid());

create policy "Owners can update link codes"
on public.link_codes
for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "Owners can delete link codes"
on public.link_codes
for delete
to authenticated
using (owner_user_id = auth.uid());
