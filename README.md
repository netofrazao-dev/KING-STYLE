# 👑 King Style — Streetwear Premium

Loja virtual com vitrine, carrinho e pedido pelo WhatsApp, além de um painel administrativo completo.
Feita com React + Vite + Tailwind e Supabase (banco, login e fotos).

## O que tem

**Loja**
- Vitrine com destaques, filtro por categoria, busca e ordenação por preço.
- Página de cada produto: galeria de fotos, **cores e tamanhos**, estoque em tempo real ("Últimas unidades"), preço promocional.
- Carrinho com variações e quantidade limitada ao estoque.
- Checkout: entrega ou retirada, forma de pagamento. O pedido é **registrado no banco**, com preço e estoque conferidos lá, e abre pronto no WhatsApp com o número do pedido.

**Painel (`/admin`)**
- **Visão geral:** produtos à venda, esgotados, pedidos novos, vendas do mês e estoque baixo.
- **Produtos:**
  - Busca e filtros (à venda, ocultos, esgotados, estoque baixo, destaques).
  - Botões rápidos de "à venda", "esgotado" e "destaque".
  - Duplicar e excluir produtos (as fotos são apagadas junto).
- **Cadastro e edição de produtos:**
  - Até 12 fotos, reduzidas automaticamente, com reordenação e capa.
  - **Variações:** cores com amostra e foto própria, e tamanhos com atalhos (P ao GG, calçados, calças, único).
  - Estoque, preço e SKU para cada combinação, com "aplicar a todas".
- **Pedidos:**
  - Status: novo, confirmado, enviado, entregue ou cancelado.
  - Botão para chamar o cliente no WhatsApp.
  - "Baixar estoque" quando a venda é confirmada; cancelar devolve o estoque.
  - Anotações internas.
- **Categorias:** criar, renomear, ordenar e excluir.

## ⚠️ Passo obrigatório no banco (uma vez)

Rode o arquivo [`sql/migration_002_upgrade.sql`](sql/migration_002_upgrade.sql). Para isso, abra o Supabase, vá em **SQL Editor**, clique em **New query**, cole o conteúdo e clique em **Run**.

Ele faz quatro coisas:
- **Corrige uma falha de segurança.** Antes, qualquer pessoa que criasse uma conta pela API do Supabase conseguia editar e apagar produtos. Agora só quem está na tabela `admins` mexe na loja. As contas que já existem viram admin; confira com a consulta que está no fim do arquivo.
- **Cria as variações.** Os tamanhos que já existem viram variações automaticamente.
- **Cria os pedidos.**
- **Cria a função do keep-alive.**

A loja continua funcionando antes disso, mas variações, estoque e pedidos só aparecem depois.

**Recomendado:** em **Authentication → Providers → Email**, desative *Allow new users to sign up*. O admin é criado em **Authentication → Users**.

## 🟢 Banco sempre ativo (keep-alive)

O Supabase grátis pausa o projeto depois de 7 dias sem uso. A automação `.github/workflows/keep-alive.yml` consulta o banco todos os dias, sozinha.

- Ela lê a URL e a chave do próprio `.env` do projeto, então não precisa configurar nada.
- Ela mantém o próprio agendamento ligado, sem criar commits.
- Se o banco não responder, o GitHub manda um email.

Ela só roda a partir da branch `main`. Depois do merge, vá em **Actions → Manter Supabase ativo → Run workflow** e confira que ficou verde. Se o projeto já estiver pausado, abra o Supabase e clique em **Restore project**.

## 🚀 Publicar no Vercel

1. Em [vercel.com](https://vercel.com), clique em **Add New → Project** e importe este repositório. O Vercel detecta o Vite sozinho.
2. Clique em **Deploy**. O `vercel.json` já cuida das rotas (`/produto/...` e `/admin`), do cache e dos cabeçalhos de segurança.
3. Opcional: em **Settings → Environment Variables**, cadastre `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `VITE_WHATSAPP_NUMBER`. Sem isso, o Vercel usa o arquivo `.env`.

## Rodar no computador

```bash
npm install
npm run dev
```

## Estrutura

```
sql/                      banco (schema inicial + migrações)
src/lib/                  dados: produtos, pedidos, admin, imagens, formatação
src/context/              carrinho
src/components/loja/      topo, rodapé, card de produto, carrinho/checkout
src/components/ui/        ícones, avisos, modal, carregando
src/pages/loja/           vitrine, produto, 404
src/pages/admin/          login, visão geral, produtos, formulário, pedidos, categorias
.github/workflows/        keep-alive do Supabase
vercel.json               configuração do Vercel
```

Desenvolvido por [Neto Dev](https://netofrazao.vercel.app/).
