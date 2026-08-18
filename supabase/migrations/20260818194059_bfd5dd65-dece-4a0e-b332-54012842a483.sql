-- Habilita as extensões necessárias
create extension if not exists "uuid-ossp";

-- 1. Enum para Papéis de Usuário
create type public.app_role as enum ('admin', 'moderator', 'user');

-- 2. Enum para Status de Validação de Entrada
create type public.validation_status as enum ('pending', 'approved', 'rejected', 'manual_review');

-- 3. Tabela de Perfis (Profiles)
create table public.profiles (
    id uuid references auth.users(id) on delete cascade primary key,
    username text unique not null,
    display_name text,
    avatar_url text,
    bio text,
    country text,
    state text,
    city text,
    favorite_coffee text,
    favorite_brew_method text,
    profile_visibility boolean default true,
    xp integer default 0,
    level integer default 1,
    streak integer default 0,
    longest_streak integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint username_length check (char_length(username) >= 3)
);

-- 4. Tabela de Papéis de Usuário (user_roles)
create table public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    role app_role not null default 'user',
    unique (user_id, role)
);

-- 5. Tabela de Entradas de Café (coffee_entries)
create table public.coffee_entries (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    drink_type text not null,
    volume_ml integer not null,
    consumed_at timestamp with time zone default timezone('utc'::text, now()) not null,
    submitted_at timestamp with time zone default timezone('utc'::text, now()) not null,
    validation_status public.validation_status default 'pending' not null,
    ai_confidence float,
    fraud_score integer default 0,
    image_hash text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Tabela de Imagens de Verificação (verification_images)
create table public.verification_images (
    id uuid primary key default gen_random_uuid(),
    coffee_entry_id uuid references public.coffee_entries(id) on delete cascade not null,
    private_storage_path text not null,
    perceptual_hash text,
    uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null,
    delete_after timestamp with time zone
);

-- 7. Tabela de Conquistas (achievements)
create table public.achievements (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text not null,
    icon text,
    criteria_type text not null,
    criteria_value integer not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Tabela de Conquistas de Usuários (user_achievements)
create table public.user_achievements (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    achievement_id uuid references public.achievements(id) on delete cascade not null,
    unlocked_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, achievement_id)
);

-- 9. Tabela de Seguidores (follows)
create table public.follows (
    id uuid primary key default gen_random_uuid(),
    follower_id uuid references auth.users(id) on delete cascade not null,
    following_id uuid references auth.users(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(follower_id, following_id)
);

-- 10. Tabela de Notificações
create table public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    type text not null,
    payload jsonb not null,
    read boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. Tabela de Temporadas (seasons)
create table public.seasons (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    starts_at timestamp with time zone not null,
    ends_at timestamp with time zone not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 12. Tabela de Pontuações da Temporada (season_scores)
create table public.season_scores (
    id uuid primary key default gen_random_uuid(),
    season_id uuid references public.seasons(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    score integer default 0 not null,
    ranking integer,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(season_id, user_id)
);

-- GRANTS
grant select, insert, update, delete on public.profiles to authenticated;
grant select on public.profiles to anon;
grant all on public.profiles to service_role;

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

grant select, insert, update on public.coffee_entries to authenticated;
grant all on public.coffee_entries to service_role;

grant select, insert on public.verification_images to authenticated;
grant all on public.verification_images to service_role;

grant select on public.achievements to authenticated;
grant select on public.achievements to anon;
grant all on public.achievements to service_role;

grant select, insert on public.user_achievements to authenticated;
grant all on public.user_achievements to service_role;

grant select, insert, delete on public.follows to authenticated;
grant all on public.follows to service_role;

grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;

grant select on public.seasons to authenticated;
grant select on public.seasons to anon;
grant all on public.seasons to service_role;

grant select on public.season_scores to authenticated;
grant select on public.season_scores to anon;
grant all on public.season_scores to service_role;

-- RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.coffee_entries enable row level security;
alter table public.verification_images enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.follows enable row level security;
alter table public.notifications enable row level security;
alter table public.seasons enable row level security;
alter table public.season_scores enable row level security;

-- Funções de Segurança
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Políticas de RLS
create policy "Perfis visiveis" on public.profiles for select using (profile_visibility = true or auth.uid() = id);
create policy "Proprio perfil" on public.profiles for update using (auth.uid() = id);
create policy "Proprios papeis" on public.user_roles for select using (auth.uid() = user_id);
create policy "Proprios registros" on public.coffee_entries for select using (auth.uid() = user_id);
create policy "Criar registros" on public.coffee_entries for insert with check (auth.uid() = user_id);

-- Triggers
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger on_profile_updated
    before update on public.profiles
    for each row execute procedure public.handle_updated_at();

create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, username, display_name, avatar_url)
    values (new.id, split_part(new.email, '@', 1) || floor(random() * 1000)::text, new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'avatar_url');
    
    insert into public.user_roles (user_id, role)
    values (new.id, 'user');
    
    return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();