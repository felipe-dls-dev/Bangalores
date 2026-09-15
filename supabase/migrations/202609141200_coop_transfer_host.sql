-- Permite ao lider atual repassar a lideranca da sala pra outro integrante ja
-- conectado, sem precisar sair da sala (unica forma que existia antes disso --
-- leave_coop_room ja promove o membro mais antigo quando o host sai sozinho).
create or replace function public.transfer_coop_host(p_room_id uuid,p_new_host_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.coop_rooms where id=p_room_id and host_id=auth.uid()) then
    raise exception 'Apenas o lider atual pode repassar a lideranca';
  end if;
  if p_new_host_id=auth.uid() then
    return;
  end if;
  if not exists(select 1 from public.coop_room_members where room_id=p_room_id and user_id=p_new_host_id) then
    raise exception 'O novo lider precisa estar na sala';
  end if;
  update public.coop_rooms set host_id=p_new_host_id,updated_at=now() where id=p_room_id;
end$$;
grant execute on function public.transfer_coop_host(uuid,uuid) to authenticated;
