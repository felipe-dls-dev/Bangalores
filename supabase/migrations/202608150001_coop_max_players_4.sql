-- Raise the coop room player cap from 2 to 4. The column already allowed up
-- to 4 (check constraint), it just defaulted to 2 and create_coop_room never
-- overrode it.
alter table public.coop_rooms alter column max_players set default 4;

create or replace function public.create_coop_room(p_display_name text,p_hero_id text default null) returns jsonb language plpgsql security definer set search_path=public as $$declare new_room public.coop_rooms;new_code text;attempt integer:=0;begin if auth.uid() is null then raise exception 'Sessão obrigatória';end if;loop attempt:=attempt+1;new_code:=public.random_room_code();begin insert into public.coop_rooms(code,host_id,max_players) values(new_code,auth.uid(),4) returning * into new_room;exit;exception when unique_violation then if attempt>=8 then raise;end if;end;end loop;insert into public.coop_room_members(room_id,user_id,display_name,hero_id) values(new_room.id,auth.uid(),left(coalesce(nullif(trim(p_display_name),''),'Aventureiro'),24),p_hero_id);return jsonb_build_object('room_id',new_room.id,'room_code',new_room.code);end$$;

-- backfill any already-open rooms so in-progress sessions also get the raised cap
update public.coop_rooms set max_players=4 where status<>'closed' and max_players<4;
