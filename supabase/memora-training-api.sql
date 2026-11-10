
create table if not exists memora_training.request_limits (
 bucket text primary key, window_start timestamptz not null, requests integer not null
);
alter table memora_training.request_limits enable row level security;
grant usage on schema memora_training to service_role;
grant select, insert, update, delete on memora_training.consent_records, memora_training.game_trials, memora_training.request_limits to service_role;
revoke all on memora_training.consent_records, memora_training.game_trials, memora_training.request_limits from anon, authenticated;
create index if not exists memora_training_trials_consent_idx on memora_training.game_trials(consent_id);
create or replace function public.memora_training_request(p_action text,p_hash text,p_data jsonb,p_bucket text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c memora_training.consent_records%rowtype; n integer; v_id uuid;
begin
 if current_user <> 'service_role' then raise exception 'service only' using errcode='42501'; end if;
 if p_hash !~ '^[a-f0-9]{64}$' or p_bucket !~ '^[a-f0-9]{64}$' then return '{"error":"invalid_request","status":400}'::jsonb; end if;
 insert into memora_training.request_limits(bucket,window_start,requests)
 values(p_bucket,date_trunc('hour',now()),1)
 on conflict(bucket) do update set requests=case when memora_training.request_limits.window_start=date_trunc('hour',now()) then memora_training.request_limits.requests+1 else 1 end,window_start=date_trunc('hour',now())
 returning requests into n;
 if n>120 and p_action not in ('withdraw','export') then return '{"error":"rate_limited","status":429}'::jsonb; end if;
 if p_action='consent' then
  if p_data->>'notice_version' is distinct from 'adult-upload-v1' or p_data->'agree' is distinct from 'true'::jsonb or p_data->'adult' is distinct from 'true'::jsonb or coalesce(p_data->>'age_band','') not in ('18to29','30to44','45to59','60to75','76plus') then return '{"error":"adult_consent_required","status":400}'::jsonb; end if;
  insert into memora_training.consent_records(participant_token_hash,age_band,notice_version) values(p_hash,p_data->>'age_band','adult-upload-v1');
  return jsonb_build_object('ok',true,'notice_version','adult-upload-v1');
 end if;
 select * into c from memora_training.consent_records where participant_token_hash=p_hash for update;
 if p_action='withdraw' then
  delete from memora_training.consent_records where participant_token_hash=p_hash;
  return '{"ok":true,"deleted":true}'::jsonb;
 end if;
 if c.id is null or c.withdrawn_at is not null or c.consented_at<now()-interval '90 days' or c.notice_version<>'adult-upload-v1' then return '{"error":"active_consent_required","status":403}'::jsonb; end if;
 if p_action='export' then
  return jsonb_build_object('ok',true,'consent',jsonb_build_object('age_band',c.age_band,'notice_version',c.notice_version,'consented_at',c.consented_at),'trials',coalesce((select jsonb_agg(to_jsonb(t)-'consent_id') from memora_training.game_trials t where t.consent_id=c.id),'[]'::jsonb));
 end if;
 if p_action<>'trial' then return '{"error":"invalid_action","status":400}'::jsonb; end if;
 if (p_data->>'played_at')::timestamptz<c.consented_at or (p_data->>'played_at')::timestamptz>now()+interval '5 minutes' then return '{"error":"invalid_trial_time","status":400}'::jsonb; end if;
 select count(*) into n from memora_training.game_trials where consent_id=c.id;
 if n>=1000 then return '{"error":"contribution_limit_reached","status":429}'::jsonb; end if;
 v_id:=(p_data->>'id')::uuid;
 insert into memora_training.game_trials(id,consent_id,game_type,level,correct,response_ms,difficulty_version,played_at)
 values(v_id,c.id,p_data->>'game_type',(p_data->>'level')::int,(p_data->>'correct')::boolean,(p_data->>'response_ms')::int,'adult-upload-v1',(p_data->>'played_at')::timestamptz)
 on conflict(id) do nothing;
 return '{"ok":true}'::jsonb;
end; $$;
revoke all on function public.memora_training_request(text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.memora_training_request(text,text,jsonb,text) to service_role;
notify pgrst,'reload schema';
