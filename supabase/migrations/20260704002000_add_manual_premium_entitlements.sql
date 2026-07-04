create table public.manual_premium_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_date date not null default current_date,
  note text,
  created_date date not null default current_date
);

comment on table public.manual_premium_entitlements is
  'Manual premium capability grants. Managed by operators only; no billing or self-service upgrade flow.';

alter table public.manual_premium_entitlements enable row level security;

revoke all on table public.manual_premium_entitlements from anon, authenticated;

create function public.current_user_can_edit_custom_link_codes()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.manual_premium_entitlements
    where manual_premium_entitlements.user_id = auth.uid()
  );
$$;

revoke all on function public.current_user_can_edit_custom_link_codes() from public;
grant execute on function public.current_user_can_edit_custom_link_codes() to authenticated;

alter table public.link_codes
add constraint link_codes_code_url_path_segment
check (code ~ '^[A-Za-z0-9._~-]+$');

comment on constraint link_codes_code_url_path_segment on public.link_codes is
  'Link Codes are URL path segment safe: letters, numbers, periods, hyphens, underscores, and tildes.';

revoke update on public.link_codes from anon, authenticated;
grant update (
  display_name,
  response_mode,
  status,
  redirect_url,
  raw_content,
  raw_content_type,
  raw_status_code,
  updated_date
) on public.link_codes to authenticated;

create function public.update_owned_link_code_code(
  target_link_code_id uuid,
  target_code text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in before editing Link Codes.' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.manual_premium_entitlements
    where manual_premium_entitlements.user_id = auth.uid()
  ) then
    raise exception 'Premium is required to edit custom Link Codes.' using errcode = 'P0001';
  end if;

  if target_code is null
    or target_code <> trim(target_code)
    or target_code !~ '^[A-Za-z0-9._~-]+$'
  then
    raise exception 'Link Codes can only use letters, numbers, periods, hyphens, underscores, and tildes.' using errcode = 'P0001';
  end if;

  update public.link_codes
  set
    code = target_code,
    updated_date = current_date
  where id = target_link_code_id
    and owner_user_id = auth.uid();

  if not found then
    raise exception 'Link Code was not found.' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.update_owned_link_code_code(uuid, text) from public;
grant execute on function public.update_owned_link_code_code(uuid, text) to authenticated;
