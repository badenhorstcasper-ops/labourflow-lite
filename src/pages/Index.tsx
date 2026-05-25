import Settings from "./Settings";
import Pricing from "./Pricing";
import PaymentCancelled from "./PaymentCancelled";
import PaymentSuccess from "./PaymentSuccess";
import Dashboard from "./Dashboard";

const Index = () => {
  const path = window.location.pathname;

  if (path === "/pricing") return <Pricing />;
  if (path === "/settings") return <Settings />;
  if (path === "/payment-success") return <PaymentSuccess />;
  if (path === "/payment-cancelled") return <PaymentCancelled />;

  return <Dashboard />;
};

export default Index;
