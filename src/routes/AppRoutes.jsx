import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import Login from "../pages/admin/Login";
import Dashboard from "../pages/admin/Dashboard";
import ProtectedRoute from "../components/ProtectedRoute";
import Header from "../components/Header";

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <>
            <Header />
            <Home />
          </>
        }
      />

      <Route path="/admin/login" element={<Login />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
