-- ============================================================
-- KING STYLE — Migração 002: upgrade geral
-- ============================================================
-- Rode UMA vez em: Supabase → SQL Editor → New query → cole tudo → Run.
-- Pode rodar de novo sem problema (é idempotente).
--
-- O que faz:
--   1. SEGURANÇA: só usuários da tabela "admins" podem alterar a loja.
--      (Antes, qualquer pessoa que criasse uma conta pela API do Supabase
--      conseguia editar e apagar produtos.)
--   2. Novos campos em produtos: preço promocional, destaque, ordem.
--   3. Variações de produto (cor + tamanho + estoque + preço próprio).
--      Os tamanhos que já existem viram variações automaticamente.
--   4. Pedidos: cada pedido feito no site fica salvo no painel.
--   5. Keep-alive: função usada pela automação que impede o banco de pausar.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. Administradores
-- ------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  criado_em  timestamptz not null default now()
);
alter table public.admins enable row level security;

-- Os usuários que JÁ EXISTEM viram admins (a loja não tem cadastro pelo site,
-- então normalmente só existe a conta do dono). Confira no fim do arquivo.
insert into public.admins (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "admins_select_self" on public.admins;
create policy "admins_select_self" on public.admins
  for select to authenticated using (user_id = auth.uid());

-- Troca as políticas de escrita: de "qualquer logado" para "só admin"
drop policy if exists "categories_insert_auth" on public.categories;
drop policy if exists "categories_update_auth" on public.categories;
drop policy if exists "categories_delete_auth" on public.categories;
drop policy if exists "products_insert_auth" on public.products;
drop policy if exists "products_update_auth" on public.products;
drop policy if exists "products_delete_auth" on public.products;
drop policy if exists "categories_write_admin" on public.categories;
drop policy if exists "products_write_admin" on public.products;

create policy "categories_write_admin" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "products_write_admin" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Visitantes só veem produtos ativos; o admin vê todos
drop policy if exists "products_select_public" on public.products;
create policy "products_select_public" on public.products
  for select to anon, authenticated using (ativo or public.is_admin());

-- Storage (imagens)
drop policy if exists "product_images_insert_auth" on storage.objects;
drop policy if exists "product_images_update_auth" on storage.objects;
drop policy if exists "product_images_delete_auth" on storage.objects;
drop policy if exists "product_images_insert_admin" on storage.objects;
drop policy if exists "product_images_update_admin" on storage.objects;
drop policy if exists "product_images_delete_admin" on storage.objects;

create policy "product_images_insert_admin" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
create policy "product_images_update_admin" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and public.is_admin());
create policy "product_images_delete_admin" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());

-- ------------------------------------------------------------
-- 2. Novos campos
-- ------------------------------------------------------------
alter table public.products add column if not exists esgotado boolean not null default false;
alter table public.products add column if not exists preco_promocional numeric(10,2) check (preco_promocional is null or preco_promocional >= 0);
alter table public.products add column if not exists destaque boolean not null default false;
alter table public.products add column if not exists ordem integer not null default 0;
alter table public.products add column if not exists atualizado_em timestamptz not null default now();
alter table public.categories add column if not exists ordem integer not null default 0;

-- ------------------------------------------------------------
-- 3. Variações
-- ------------------------------------------------------------
create table if not exists public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  cor         text,                 -- ex: "Preto" (vazio = produto sem cor)
  cor_hex     text,                 -- ex: "#000000"
  tamanho     text,                 -- ex: "M", "42", "Único"
  estoque     integer check (estoque is null or estoque >= 0),  -- vazio = não controla estoque
  preco       numeric(10,2) check (preco is null or preco >= 0),-- vazio = usa o preço do produto
  imagem      text,                 -- foto específica da cor (opcional)
  sku         text,
  ativo       boolean not null default true,
  ordem       integer not null default 0,
  criado_em   timestamptz not null default now()
);
create index if not exists idx_variants_product on public.product_variants (product_id);

alter table public.product_variants enable row level security;
drop policy if exists "variants_select_public" on public.product_variants;
drop policy if exists "variants_write_admin" on public.product_variants;
create policy "variants_select_public" on public.product_variants
  for select to anon, authenticated using (true);
create policy "variants_write_admin" on public.product_variants
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Converte os tamanhos antigos em variações (só para produtos sem variações)
insert into public.product_variants (product_id, tamanho, ordem)
select p.id, t.tamanho, t.ord::int
from public.products p
cross join lateral unnest(p.tamanhos) with ordinality as t(tamanho, ord)
where not exists (select 1 from public.product_variants v where v.product_id = p.id);

-- ------------------------------------------------------------
-- 4. Pedidos
-- ------------------------------------------------------------
create table if not exists public.pedidos (
  id             bigint generated by default as identity primary key,
  criado_em      timestamptz not null default now(),
  status         text not null default 'novo'
                 check (status in ('novo','confirmado','enviado','entregue','cancelado')),
  cliente        jsonb not null,        -- nome, telefone, endereço...
  itens          jsonb not null,        -- cópia dos itens com preço do momento
  total          numeric(10,2) not null,
  entrega        text,                  -- 'entrega' | 'retirada'
  pagamento      text,
  observacoes    text,
  estoque_baixado boolean not null default false,
  anotacoes      text                   -- anotações internas do admin
);
create index if not exists idx_pedidos_criado on public.pedidos (criado_em desc);

alter table public.pedidos enable row level security;
drop policy if exists "pedidos_admin" on public.pedidos;
create policy "pedidos_admin" on public.pedidos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Cria o pedido validando preço e estoque NO BANCO (o cliente não consegue
-- alterar o valor pelo navegador). Retorna o número e o total.
create or replace function public.criar_pedido(
  p_cliente jsonb,
  p_itens jsonb,
  p_entrega text default null,
  p_pagamento text default null,
  p_observacoes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_prod public.products%rowtype;
  v_var public.product_variants%rowtype;
  v_qtd int;
  v_preco numeric(10,2);
  v_itens jsonb := '[]'::jsonb;
  v_total numeric(10,2) := 0;
  v_id bigint;
begin
  if coalesce(trim(p_cliente->>'nome'), '') = '' or coalesce(trim(p_cliente->>'telefone'), '') = '' then
    raise exception 'Informe nome e telefone.';
  end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'O carrinho está vazio.';
  end if;
  if jsonb_array_length(p_itens) > 50 then
    raise exception 'Pedido com itens demais.';
  end if;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_qtd := greatest(1, least(99, coalesce((v_item->>'quantidade')::int, 1)));

    select * into v_prod from public.products where id = (v_item->>'product_id')::uuid;
    if not found or not v_prod.ativo or v_prod.esgotado then
      raise exception 'O produto "%" não está mais disponível.', coalesce(v_prod.nome, 'selecionado');
    end if;

    v_var := null;
    if coalesce(v_item->>'variant_id', '') <> '' then
      select * into v_var from public.product_variants
        where id = (v_item->>'variant_id')::uuid and product_id = v_prod.id;
      if not found or not v_var.ativo then
        raise exception 'A opção escolhida de "%" não está mais disponível.', v_prod.nome;
      end if;
      if v_var.estoque is not null and v_var.estoque < v_qtd then
        raise exception 'Estoque insuficiente de "%" (%): restam %.', v_prod.nome,
          concat_ws(' / ', v_var.cor, v_var.tamanho), v_var.estoque;
      end if;
    end if;

    v_preco := coalesce(
      v_var.preco,
      case when v_prod.preco_promocional is not null and v_prod.preco_promocional < v_prod.preco
           then v_prod.preco_promocional end,
      v_prod.preco
    );

    v_itens := v_itens || jsonb_build_object(
      'product_id', v_prod.id,
      'variant_id', v_var.id,
      'nome', v_prod.nome,
      'cor', v_var.cor,
      'tamanho', coalesce(v_var.tamanho, v_item->>'tamanho'),
      'preco', v_preco,
      'quantidade', v_qtd,
      'subtotal', v_preco * v_qtd,
      'imagem', coalesce(v_var.imagem, v_prod.imagens[1])
    );
    v_total := v_total + v_preco * v_qtd;
  end loop;

  insert into public.pedidos (cliente, itens, total, entrega, pagamento, observacoes)
  values (p_cliente, v_itens, v_total, left(p_entrega, 30), left(p_pagamento, 60), left(p_observacoes, 1000))
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'total', v_total, 'itens', v_itens);
end;
$$;
revoke all on function public.criar_pedido(jsonb, jsonb, text, text, text) from public;
grant execute on function public.criar_pedido(jsonb, jsonb, text, text, text) to anon, authenticated;

-- Baixa (ou devolve) o estoque das variações de um pedido. Só admin.
create or replace function public.aplicar_estoque_pedido(p_pedido bigint, p_baixar boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ped public.pedidos%rowtype;
  v_item jsonb;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores.';
  end if;
  select * into v_ped from public.pedidos where id = p_pedido for update;
  if not found then raise exception 'Pedido não encontrado.'; end if;
  if v_ped.estoque_baixado = p_baixar then return; end if;

  for v_item in select * from jsonb_array_elements(v_ped.itens) loop
    if coalesce(v_item->>'variant_id', '') <> '' then
      update public.product_variants
         set estoque = greatest(0, estoque + case when p_baixar then -1 else 1 end * (v_item->>'quantidade')::int)
       where id = (v_item->>'variant_id')::uuid and estoque is not null;
    end if;
  end loop;

  update public.pedidos set estoque_baixado = p_baixar where id = p_pedido;
end;
$$;
revoke all on function public.aplicar_estoque_pedido(bigint, boolean) from public;
grant execute on function public.aplicar_estoque_pedido(bigint, boolean) to authenticated;

-- ------------------------------------------------------------
-- 5. Keep-alive (usado pela automação do GitHub)
-- ------------------------------------------------------------
create table if not exists public.keep_alive (
  id smallint primary key default 1 check (id = 1),
  ultimo_ping timestamptz not null default now(),
  total_pings bigint not null default 0
);
alter table public.keep_alive enable row level security;

create or replace function public.keep_alive()
returns timestamptz
language sql
security definer
set search_path = public
as $$
  insert into public.keep_alive (id, ultimo_ping, total_pings) values (1, now(), 1)
  on conflict (id) do update set ultimo_ping = excluded.ultimo_ping,
                                 total_pings = public.keep_alive.total_pings + 1
  returning ultimo_ping;
$$;
revoke all on function public.keep_alive() from public;
grant execute on function public.keep_alive() to anon, authenticated;

-- ------------------------------------------------------------
-- Confira quem ficou como admin (deve ser só você):
--   select u.email from public.admins a join auth.users u on u.id = a.user_id;
-- Para remover alguém:
--   delete from public.admins where user_id = (select id from auth.users where email = 'email@exemplo.com');
-- Para adicionar um novo admin (crie o usuário em Authentication > Users antes):
--   insert into public.admins (user_id) select id from auth.users where email = 'email@exemplo.com';
-- ------------------------------------------------------------
