import { useLocation } from "react-router-dom";
import Settings from "./Settings";
import Pricing from "./Pricing";
import PaymentCancelled from "./PaymentCancelled";
import PaymentSuccess from "./PaymentSuccess";
import Dashboard from "./Dashboard";

const Index = () => {
  const { pathname } = useLocation();

  if (pathname === "/pricing") return <Pricing />;
  if (pathname === "/settings") return <Settings />;
  if (pathname === "/payment-success") return <PaymentSuccess />;
  if (pathname === "/payment-cancelled") return <PaymentCancelled />;

  return <Dashboard />;
};

export default Index;
