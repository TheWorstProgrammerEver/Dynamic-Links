alter table public.link_codes
add column raw_response_message text;

update public.link_codes
set raw_response_message =
  'HTTP/1.1 '
  || coalesce(raw_status_code, 200)::text
  || ' OK'
  || E'\nContent-Type: '
  || coalesce(nullif(trim(raw_content_type), ''), 'text/plain; charset=utf-8')
  || E'\nContent-Length: '
  || length(convert_to(coalesce(raw_content, ''), 'UTF8'))::text
  || E'\n\n'
  || coalesce(raw_content, '')
where response_mode = 'raw_content'
  and raw_content is not null
  and raw_response_message is null;

alter table public.link_codes
drop column raw_content,
drop column raw_content_type,
drop column raw_status_code;

grant update (
  raw_response_message
) on public.link_codes to authenticated;
