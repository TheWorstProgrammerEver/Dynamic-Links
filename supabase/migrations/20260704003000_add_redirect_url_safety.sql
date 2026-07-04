alter table public.link_codes
add constraint link_codes_redirect_url_safe_public_location
check (
  redirect_url is null
  or (
    redirect_url = trim(redirect_url)
    and redirect_url !~ '[\r\n]'
    and redirect_url ~* '^https?://'
  )
);
