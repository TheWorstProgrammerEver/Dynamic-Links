revoke all on table public.link_codes from anon;

grant select, insert, delete
on table public.link_codes
to authenticated;

grant select, insert, update, delete
on table public.link_codes
to service_role;

revoke all on table public.manual_premium_entitlements from anon, authenticated;

grant select, insert, update, delete
on table public.manual_premium_entitlements
to service_role;
