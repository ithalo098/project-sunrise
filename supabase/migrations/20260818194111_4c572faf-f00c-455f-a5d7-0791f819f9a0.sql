-- Fix search_path for security definer functions
alter function public.handle_updated_at() set search_path = public;
alter function public.handle_new_user() set search_path = public;

-- Revoke public execute on security definer functions
revoke execute on function public.has_role(uuid, public.app_role) from public;
revoke execute on function public.handle_updated_at() from public;
revoke execute on function public.handle_new_user() from public;

-- Grant execute only to necessary roles
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function public.handle_updated_at() to service_role;
grant execute on function public.handle_new_user() to service_role;

-- Add remaining RLS policies to satisfy linter
create policy "Verificacoes proprias" on public.verification_images for select using (exists (select 1 from public.coffee_entries where id = coffee_entry_id and user_id = auth.uid()));
create policy "Inserir verificacao" on public.verification_images for insert with check (exists (select 1 from public.coffee_entries where id = coffee_entry_id and user_id = auth.uid()));

create policy "Conquistas visiveis" on public.achievements for select using (true);

create policy "Proprias conquistas" on public.user_achievements for select using (auth.uid() = user_id);

create policy "Seguidores visiveis" on public.follows for select using (true);
create policy "Seguir" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Deixar de seguir" on public.follows for delete using (auth.uid() = follower_id);

create policy "Proprias notificacoes" on public.notifications for select using (auth.uid() = user_id);
create policy "Atualizar notificacao" on public.notifications for update using (auth.uid() = user_id);

create policy "Temporadas visiveis" on public.seasons for select using (true);

create policy "Pontuacoes visiveis" on public.season_scores for select using (true);