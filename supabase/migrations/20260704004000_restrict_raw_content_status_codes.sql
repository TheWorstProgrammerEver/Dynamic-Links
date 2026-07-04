alter table public.link_codes
drop constraint if exists link_codes_raw_status_code_http_range,
add constraint link_codes_raw_status_code_http_range
check (
  raw_status_code between 200 and 599
  and raw_status_code not in (204, 205, 304)
);
