-- ============================================================
-- KING STYLE — Schema Supabase (PostgreSQL)
-- ============================================================
-- Execute este script no SQL Editor do Supabase (Project > SQL Editor)

-- Extensão para geração de UUID
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Tabela: categories
-- ------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null unique,
  criado_em   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Tabela: products
-- ------------------------------------------------------------
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  descricao    text,
  preco        numeric(10,2) not null check (preco >= 0),
  tamanhos     text[] not null default '{}',       -- ex: {"P","M","G","GG"}
  imagens      text[] not null default '{}',       -- URLs do Supabase Storage
  category_id  uuid references public.categories(id) on delete set null,
  ativo        boolean not null default true,
  esgotado     boolean not null default false,
  criado_em    timestamptz not null default now()
);

create index if not exists idx_products_category on public.products (category_id);
create index if not exists idx_products_ativo on public.products (ativo);

-- ------------------------------------------------------------
-- Row Level Security (RLS)
-- ------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.products enable row level security;

-- Leitura pública (qualquer visitante do site, mesmo sem login)
create policy "categories_select_public"
  on public.categories
  for select
  to anon, authenticated
  using (true);

create policy "products_select_public"
  on public.products
  for select
  to anon, authenticated
  using (true);

-- Escrita restrita a usuários autenticados (admin da loja)
create policy "categories_insert_auth"
  on public.categories
  for insert
  to authenticated
  with check (true);

create policy "categories_update_auth"
  on public.categories
  for update
  to authenticated
  using (true)
  with check (true);

create policy "categories_delete_auth"
  on public.categories
  for delete
  to authenticated
  using (true);

create policy "products_insert_auth"
  on public.products
  for insert
  to authenticated
  with check (true);

create policy "products_update_auth"
  on public.products
  for update
  to authenticated
  using (true)
  with check (true);

create policy "products_delete_auth"
  on public.products
  for delete
  to authenticated
  using (true);

-- ------------------------------------------------------------
-- Storage: bucket público para imagens de produtos
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Leitura pública das imagens
create policy "product_images_select_public"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'product-images');

-- Upload/alteração/remoção apenas para admin autenticado
create policy "product_images_insert_auth"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'product-images');

create policy "product_images_update_auth"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'product-images');

create policy "product_images_delete_auth"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'product-images');

-- ------------------------------------------------------------
-- Seed opcional de categorias
-- ------------------------------------------------------------
insert into public.categories (nome) values
  ('Camisetas'), ('Moletons'), ('Bonés'), ('Acessórios')
on conflict (nome) do nothing;
