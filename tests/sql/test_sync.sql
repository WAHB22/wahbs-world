-- Runs as the authenticated role; every failed check raises and stops the run.
\set ON_ERROR_STOP on
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-00000000000a';

do $$
declare r jsonb; p jsonb; before bigint;
begin
  -- 1. a new row is accepted, owned by the caller, and gets a revision
  r := public.sync_push('[{"table":"checkins","row":{"id":"11111111-1111-4111-8111-111111111111","created_at":"2026-09-24T10:00:00Z","updated_at":"2026-09-24T10:00:00Z","hlc":"0001790000000:000000:phone","device_id":"phone","occurred_at":"2026-09-24T10:00:00Z","local_day":"2026-09-24","kind":"gym_done","payload":{}}}]');
  if jsonb_array_length(r->'accepted') <> 1 then raise exception 'insert not accepted: %', r; end if;
  if (select user_id from public.checkins where id = '11111111-1111-4111-8111-111111111111') <> auth.uid() then raise exception 'owner not set'; end if;

  -- 2. pull returns it
  p := public.sync_pull(0, 500);
  if jsonb_array_length(p->'changes') <> 1 or (p->>'more')::boolean then raise exception 'pull wrong: %', p; end if;
  before := (p->>'max_rev')::bigint;

  -- 3. an older edit loses and the server row comes back
  r := public.sync_push('[{"table":"checkins","row":{"id":"11111111-1111-4111-8111-111111111111","created_at":"2026-09-24T10:00:00Z","updated_at":"2026-09-24T09:00:00Z","hlc":"0001780000000:000000:laptop","device_id":"laptop","occurred_at":"2026-09-24T10:00:00Z","local_day":"2026-09-24","kind":"task_done","payload":{}}}]');
  if jsonb_array_length(r->'newer') <> 1 or r->'newer'->0->'row'->>'kind' <> 'gym_done' then raise exception 'older edit not rejected: %', r; end if;

  -- 4. a newer edit wins, gets a higher revision, and the old version lands in history
  r := public.sync_push('[{"table":"checkins","row":{"id":"11111111-1111-4111-8111-111111111111","created_at":"2026-09-24T10:00:00Z","updated_at":"2026-09-24T11:00:00Z","hlc":"0001800000000:000000:laptop","device_id":"laptop","occurred_at":"2026-09-24T10:00:00Z","local_day":"2026-09-24","kind":"task_done","payload":{"note":"x"},"deleted_at":"2026-09-24T11:00:00Z"}}]');
  if (r->'accepted'->0->>'rev')::bigint <= before then raise exception 'revision did not advance: %', r; end if;
  if (select kind from public.checkins where id = '11111111-1111-4111-8111-111111111111') <> 'task_done' then raise exception 'newer edit not stored'; end if;
  p := public.sync_pull(before, 500);
  if p->'changes'->0->'row'->>'deleted_at' is null then raise exception 'tombstone not pulled: %', p; end if;

  -- 5. arrays, times, dates and json round trip
  r := public.sync_push('[{"table":"schedule_blocks","row":{"id":"22222222-2222-4222-8222-222222222222","created_at":"2026-09-24T10:00:00Z","updated_at":"2026-09-24T10:00:00Z","hlc":"0001790000000:000001:phone","device_id":"phone","kind":"lecture","title":"CHG 3337 lecture","weekday":1,"starts_at":"17:30","ends_at":"18:50","location":"Morisset Hall 205"}},
                           {"table":"courses","row":{"id":"33333333-3333-4333-8333-333333333333","created_at":"2026-09-24T10:00:00Z","updated_at":"2026-09-24T10:00:00Z","hlc":"0001790000000:000002:phone","device_id":"phone","term_id":"44444444-4444-4444-8444-444444444444","code":"CHG 3735","name":"Contrôle des procédés","language":"fr","topics":["Laplace","PID"],"links":[{"label":"Brightspace","url":"https://uottawa.brightspace.com"}]}}]');
  if jsonb_array_length(r->'accepted') <> 2 then raise exception 'multi table push failed: %', r; end if;
  if (select topics[2] from public.courses where id = '33333333-3333-4333-8333-333333333333') <> 'PID' then raise exception 'array lost'; end if;

  -- 6. pagination across tables returns everything exactly once
  p := public.sync_pull(0, 1);
  if not (p->>'more')::boolean then raise exception 'expected more'; end if;

  -- 7. unknown tables are refused
  begin
    perform public.sync_push('[{"table":"history","row":{}}]');
    raise exception 'unknown table accepted';
  exception when others then
    if sqlerrm not like 'unknown table%' then raise; end if;
  end;
end $$;

-- 8. another account sees nothing of Wahb's data
set request.jwt.claim.sub = '00000000-0000-4000-8000-00000000000b';
do $$ begin
  if jsonb_array_length(public.sync_pull(0, 500)->'changes') <> 0 then raise exception 'rows leaked to another account'; end if;
  if (select count(*) from public.checkins) <> 0 then raise exception 'row level security leak'; end if;
end $$;

-- 9. without a session nothing works
reset request.jwt.claim.sub;
do $$ begin
  begin perform public.sync_pull(0, 10); raise exception 'anonymous pull allowed';
  exception when others then if sqlerrm <> 'not signed in' then raise; end if; end;
end $$;

reset role;
do $$ begin
  if (select count(*) from wahb.history) <> 1 then raise exception 'history count wrong'; end if;
end $$;
select 'sql sync tests passed' as result;
