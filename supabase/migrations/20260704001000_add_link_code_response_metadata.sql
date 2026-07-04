alter table public.link_codes
add column raw_content_type text not null default 'text/plain; charset=utf-8',
add column raw_status_code integer not null default 200,
add constraint link_codes_raw_content_type_no_line_breaks check (raw_content_type !~ '[\r\n]'),
add constraint link_codes_raw_status_code_http_range check (raw_status_code between 100 and 599);
