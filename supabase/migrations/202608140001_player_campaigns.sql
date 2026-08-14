create table if not exists public.player_campaigns (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  hero_id text,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists player_campaigns_user_idx on public.player_campaigns(user_id);

alter table public.player_campaigns enable row level security;
create policy "own campaigns select" on public.player_campaigns for select to authenticated using (user_id = auth.uid());
create policy "own campaigns insert" on public.player_campaigns for insert to authenticated with check (user_id = auth.uid());
create policy "own campaigns update" on public.player_campaigns for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own campaigns delete" on public.player_campaigns for delete to authenticated using (user_id = auth.uid());

create or replace function public.touch_player_campaign() returns trigger language plpgsql as $$begin new.updated_at:=now(); return new; end$$;
drop trigger if exists player_campaigns_touch on public.player_campaigns;
create trigger player_campaigns_touch before update on public.player_campaigns for each row execute function public.touch_player_campaign();
