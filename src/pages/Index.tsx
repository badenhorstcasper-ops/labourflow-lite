import Settings from "./Settings";
import Pricing from "./Pricing";
import PaymentCancelled from "./PaymentCancelled";
import PaymentSuccess from "./PaymentSuccess";
import Auth from "./Auth";
import Dashboard from "./Dashboard";

const Index = () => {
  const pathname = window.location.pathname;

  if (pathname === "/pricing") return <Pricing />;
  if (pathname === "/settings") return <Settings />;
  if (pathname === "/payment-success") return <PaymentSuccess />;
  if (pathname === "/payment-cancelled") return <PaymentCancelled />;
  if (pathname === "/auth") return <Auth />;

  return <Dashboard />;
};

export default Index;
