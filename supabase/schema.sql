-- Run this in your Supabase SQL editor (Dashboard > SQL Editor > New query)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (one per user)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null default '',
  role text not null default 'user',
  target_calories int not null default 2000,
  target_weight float,
  created_at timestamptz default now()
);

-- Weekly budgets
create table public.weekly_budgets (
  id uuid default gen_random_uuid() primary key,
  week_start date not null,
  amount decimal(10,2) not null default 0,
  created_by uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(week_start)
);

-- Grocery items
create table public.grocery_items (
  id uuid default gen_random_uuid() primary key,
  week_start date not null,
  name text not null,
  quantity text,
  price decimal(10,2) default 0,
  checked boolean default false,
  added_by uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- Meal plans
create table public.meal_plans (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  meal_name text not null,
  notes text,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- Food logs
create table public.food_logs (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  food_name text not null,
  calories int default 0,
  protein float default 0,
  carbs float default 0,
  fat float default 0,
  photo_url text,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- Weight logs
create table public.weight_logs (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  weight float not null,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(date, user_id)
);

-- =============================================
-- Row Level Security (RLS) — tous les users connectés voient tout
-- =============================================

alter table public.profiles enable row level security;
alter table public.weekly_budgets enable row level security;
alter table public.grocery_items enable row level security;
alter table public.meal_plans enable row level security;
alter table public.food_logs enable row level security;
alter table public.weight_logs enable row level security;

-- Profiles: tout le monde peut voir, chacun modifie le sien
create policy "profiles_select" on public.profiles for select using (auth.role() = 'authenticated');
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Budget: tout le monde connecté peut lire/écrire (partagé)
create policy "budgets_all" on public.weekly_budgets for all using (auth.role() = 'authenticated');

-- Courses: tout le monde connecté peut lire/écrire (partagée)
create policy "groceries_all" on public.grocery_items for all using (auth.role() = 'authenticated');

-- Meal plans: tout le monde peut voir, chacun gère les siens
create policy "mealplans_select" on public.meal_plans for select using (auth.role() = 'authenticated');
create policy "mealplans_insert" on public.meal_plans for insert with check (auth.uid() = user_id);
create policy "mealplans_delete" on public.meal_plans for delete using (auth.uid() = user_id);

-- Food logs: tout le monde peut voir, chacun gère les siens
create policy "foodlogs_select" on public.food_logs for select using (auth.role() = 'authenticated');
create policy "foodlogs_insert" on public.food_logs for insert with check (auth.uid() = user_id);
create policy "foodlogs_delete" on public.food_logs for delete using (auth.uid() = user_id);

-- Weight logs: chacun gère les siens, son/sa partenaire peut voir
create policy "weight_select" on public.weight_logs for select using (auth.role() = 'authenticated');
create policy "weight_insert" on public.weight_logs for insert with check (auth.uid() = user_id);
create policy "weight_upsert" on public.weight_logs for update using (auth.uid() = user_id);
create policy "weight_delete" on public.weight_logs for delete using (auth.uid() = user_id);

-- =============================================
-- Storage bucket for meal photos
-- =============================================
insert into storage.buckets (id, name, public) values ('meal-photos', 'meal-photos', true);

create policy "meal_photos_select" on storage.objects for select using (bucket_id = 'meal-photos');
create policy "meal_photos_insert" on storage.objects for insert with check (bucket_id = 'meal-photos' and auth.role() = 'authenticated');
create policy "meal_photos_delete" on storage.objects for delete using (bucket_id = 'meal-photos' and auth.uid()::text = (storage.foldername(name))[2]);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
