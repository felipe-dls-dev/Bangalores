create extension if not exists pgcrypto;

create table if not exists public.coop_rooms (
  id uuid primary key default gen_random_uuid(), code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  host_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'lobby' check (status in ('lobby','playing','closed')),
  max_players smallint not null default 2 check (max_players between 2 and 4),
  shared_state jsonb not null default '{}'::jsonb, state_version bigint not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.coop_room_members (
  id uuid primary key default gen_random_uuid(), room_id uuid not null references public.coop_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, display_name text not null check (char_length(display_name) between 1 and 24),
  hero_id text, ready boolean not null default false, joined_at timestamptz not null default now(), last_seen timestamptz not null default now(),
  unique(room_id,user_id)
);
create table if not exists public.coop_room_events (
  id bigint generated always as identity primary key, room_id uuid not null references public.coop_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, event_type text not null,
  payload jsonb not null default '{}'::jsonb, sequence bigint not null, created_at timestamptz not null default now(), unique(room_id,sequence)
);
create index if not exists coop_room_members_room_idx on public.coop_room_members(room_id);
create index if not exists coop_room_events_room_sequence_idx on public.coop_room_events(room_id,sequence desc);

alter table public.coop_rooms enable row level security;
alter table public.coop_room_members enable row level security;
alter table public.coop_room_events enable row level security;
create or replace function public.is_coop_member(target_room uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.coop_room_members where room_id=target_room and user_id=auth.uid())$$;
revoke all on function public.is_coop_member(uuid) from public; grant execute on function public.is_coop_member(uuid) to authenticated;
create policy "members read rooms" on public.coop_rooms for select to authenticated using (public.is_coop_member(id));
create policy "members read members" on public.coop_room_members for select to authenticated using (public.is_coop_member(room_id));
create policy "members update self" on public.coop_room_members for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid() and public.is_coop_member(room_id));
create policy "members read events" on public.coop_room_events for select to authenticated using (public.is_coop_member(room_id));

create or replace function public.random_room_code() returns text language plpgsql volatile set search_path=public as $$declare chars constant text:='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';result text:='';i integer;begin for i in 1..6 loop result:=result||substr(chars,1+floor(random()*length(chars))::integer,1);end loop;return result;end$$;
create or replace function public.create_coop_room(p_display_name text,p_hero_id text default null) returns jsonb language plpgsql security definer set search_path=public as $$declare new_room public.coop_rooms;new_code text;attempt integer:=0;begin if auth.uid() is null then raise exception 'Sessão obrigatória';end if;loop attempt:=attempt+1;new_code:=public.random_room_code();begin insert into public.coop_rooms(code,host_id) values(new_code,auth.uid()) returning * into new_room;exit;exception when unique_violation then if attempt>=8 then raise;end if;end;end loop;insert into public.coop_room_members(room_id,user_id,display_name,hero_id) values(new_room.id,auth.uid(),left(coalesce(nullif(trim(p_display_name),''),'Aventureiro'),24),p_hero_id);return jsonb_build_object('room_id',new_room.id,'room_code',new_room.code);end$$;
create or replace function public.join_coop_room(p_code text,p_display_name text,p_hero_id text default null) returns jsonb language plpgsql security definer set search_path=public as $$declare target public.coop_rooms;member_count integer;begin if auth.uid() is null then raise exception 'Sessão obrigatória';end if;select * into target from public.coop_rooms where code=upper(trim(p_code)) and status<>'closed' for update;if target.id is null then raise exception 'Sala não encontrada';end if;select count(*) into member_count from public.coop_room_members where room_id=target.id;if member_count>=target.max_players and not exists(select 1 from public.coop_room_members where room_id=target.id and user_id=auth.uid()) then raise exception 'Sala cheia';end if;insert into public.coop_room_members(room_id,user_id,display_name,hero_id) values(target.id,auth.uid(),left(coalesce(nullif(trim(p_display_name),''),'Aventureiro'),24),p_hero_id) on conflict(room_id,user_id) do update set display_name=excluded.display_name,hero_id=excluded.hero_id,last_seen=now();return jsonb_build_object('room_id',target.id,'room_code',target.code);end$$;
create or replace function public.leave_coop_room(p_room_id uuid) returns void language plpgsql security definer set search_path=public as $$begin delete from public.coop_room_members where room_id=p_room_id and user_id=auth.uid();if not exists(select 1 from public.coop_room_members where room_id=p_room_id) then delete from public.coop_rooms where id=p_room_id;elsif exists(select 1 from public.coop_rooms where id=p_room_id and host_id=auth.uid()) then update public.coop_rooms set host_id=(select user_id from public.coop_room_members where room_id=p_room_id order by joined_at limit 1),updated_at=now() where id=p_room_id;end if;end$$;
create or replace function public.update_coop_room_state(p_room_id uuid,p_state jsonb,p_expected_version bigint) returns bigint language plpgsql security definer set search_path=public as $$declare next_version bigint;begin if not public.is_coop_member(p_room_id) then raise exception 'Acesso negado';end if;update public.coop_rooms set shared_state=p_state,state_version=state_version+1,updated_at=now() where id=p_room_id and state_version=p_expected_version returning state_version into next_version;if next_version is null then raise exception 'STATE_VERSION_CONFLICT';end if;return next_version;end$$;
create or replace function public.append_coop_event(p_room_id uuid,p_event_type text,p_payload jsonb default '{}'::jsonb) returns bigint language plpgsql security definer set search_path=public as $$declare next_sequence bigint;begin if not public.is_coop_member(p_room_id) then raise exception 'Acesso negado';end if;select coalesce(max(sequence),0)+1 into next_sequence from public.coop_room_events where room_id=p_room_id;insert into public.coop_room_events(room_id,user_id,event_type,payload,sequence) values(p_room_id,auth.uid(),left(p_event_type,64),p_payload,next_sequence);return next_sequence;end$$;
grant execute on function public.create_coop_room(text,text),public.join_coop_room(text,text,text),public.leave_coop_room(uuid),public.update_coop_room_state(uuid,jsonb,bigint),public.append_coop_event(uuid,text,jsonb) to authenticated;
alter publication supabase_realtime add table public.coop_rooms,public.coop_room_members,public.coop_room_events;
