import { BrowserRouter } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { FeedbackProvider } from "./components/ui/Feedback";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <FeedbackProvider>
        <CartProvider>
          <AppRoutes />
        </CartProvider>
      </FeedbackProvider>
    </BrowserRouter>
  );
}
