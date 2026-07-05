# King Style — Estrutura do Projeto

```
king-style/
├── sql/
│   └── schema.sql                 # Tabelas, RLS e bucket de Storage
├── .env.example
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css                  # tokens de tema (preto/branco/dourado)
    ├── services/
    │   └── supabaseClient.js      # instância única do client Supabase
    ├── context/
    │   └── CartContext.jsx        # estado global do carrinho (Context API)
    ├── components/
    │   ├── Header.jsx
    │   ├── ProductCard.jsx
    │   ├── ProductGallery.jsx     # vitrine (fetch em products)
    │   ├── CartDrawer.jsx         # painel lateral do carrinho
    │   ├── WhatsAppCheckout.jsx   # monta o link wa.me
    │   └── ProtectedRoute.jsx     # guarda de rota do /admin
    ├── pages/
    │   ├── Home.jsx
    │   └── admin/
    │       ├── Login.jsx
    │       ├── Dashboard.jsx
    │       └── ProductForm.jsx    # CRUD de criação de produto + upload
    └── routes/
        └── AppRoutes.jsx
```

## Passo a passo de setup

1. `npm create vite@latest king-style -- --template react`
2. `npm install @supabase/supabase-js react-router-dom zustand`
3. `npm install -D tailwindcss postcss autoprefixer`
4. `npx tailwindcss init -p`
5. Copiar os arquivos deste pacote para as respectivas pastas.
6. Criar `.env` na raiz com base no `.env.example`.
7. Rodar `sql/schema.sql` no SQL Editor do Supabase.
8. Criar o usuário admin em **Authentication > Users** no painel do Supabase (e-mail/senha) — o cadastro de admin não é feito pelo front-end, por segurança.
9. `npm run dev`

## Paleta de marca (streetwear premium)

| Token          | Hex        | Uso                              |
|----------------|-----------|-----------------------------------|
| `--ks-black`   | `#0A0A0A`  | Fundo principal                  |
| `--ks-white`   | `#F5F5F5`  | Texto sobre fundo escuro          |
| `--ks-gold`    | `#C9A227`  | Detalhes, CTAs, bordas de destaque|
| `--ks-gunmetal`| `#2B2E33`  | Cards, superfícies secundárias    |
| `--ks-line`    | `#3A3A3A`  | Divisores/hairlines               |
