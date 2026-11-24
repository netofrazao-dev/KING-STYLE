import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "../components/loja/Layout";
import Home from "../pages/loja/Home";
import Produto from "../pages/loja/Produto";
import NaoEncontrada from "../pages/loja/NaoEncontrada";
import { Carregando } from "../components/ui/Feedback";

// O painel só é baixado por quem acessa /admin (a loja fica mais leve)
const Login = lazy(() => import("../pages/admin/Login"));
const AdminLayout = lazy(() => import("../pages/admin/AdminLayout"));
const Dashboard = lazy(() => import("../pages/admin/Dashboard"));
const Produtos = lazy(() => import("../pages/admin/Produtos"));
const ProductForm = lazy(() => import("../pages/admin/ProductForm"));
const Categorias = lazy(() => import("../pages/admin/Categorias"));
const Pedidos = lazy(() => import("../pages/admin/Pedidos"));

export default function AppRoutes() {
  return (
    <Suspense fallback={<Carregando />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/produto/:id" element={<Produto />} />
          <Route path="*" element={<NaoEncontrada />} />
        </Route>

        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="produtos" element={<Produtos />} />
          <Route path="produtos/novo" element={<ProductForm key="novo" />} />
          <Route path="produtos/:id" element={<ProductForm />} />
          <Route path="categorias" element={<Categorias />} />
          <Route path="pedidos" element={<Pedidos />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
