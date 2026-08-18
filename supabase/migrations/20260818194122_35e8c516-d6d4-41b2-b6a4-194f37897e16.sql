-- Re-check and strictly revoke execute from PUBLIC for all security definer functions
-- Note: 'public' in REVOKE refers to the role 'PUBLIC' (all users), while in schema names it refers to the public schema.
revoke execute on function public.handle_updated_at() from public, authenticated, anon;
revoke execute on function public.handle_new_user() from public, authenticated, anon;

-- Ensure service_role still has access
grant execute on function public.handle_updated_at() to service_role;
grant execute on function public.handle_new_user() to service_role;

-- handle_new_user is used by a trigger on auth.users, so it needs to be callable during signup.
-- In Supabase, these triggers usually run as a privileged role, so revoking from public/authenticated/anon is correct.
