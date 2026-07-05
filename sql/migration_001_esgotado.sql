-- Migração: adiciona coluna de esgotado em produtos já existentes
alter table public.products
  add column if not exists esgotado boolean not null default false;

