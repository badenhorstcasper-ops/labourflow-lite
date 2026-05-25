import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import Settings from "./Settings";
import Pricing from "./Pricing";
import PaymentCancelled from "./PaymentCancelled";
import PaymentSuccess from "./PaymentSuccess";

const supabase = createClient(
  (import.meta.env.VITE_SUPABASE_URL as string) || "",
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
    "",
);

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const pathname = window.location.pathname;

  if (pathname === "/payment-success") {
    return <PaymentSuccess />;
  }

  if (pathname === "/pricing") {
    return <Pricing />;
  }

  if (pathname === "/settings") {
    return <Settings />;
  }

  if (pathname === "/payment-cancelled") {
    return <PaymentCancelled />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6" style={{ backgroundColor: '#fcfbf8' }}>
      <nav className="absolute top-0 right-0 flex gap-2 p-4">
        <Link
          to="/pricing"
          className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Pricing
        </Link>
        {isLoggedIn && (
          <Link
            to="/settings"
            className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Settings
          </Link>
        )}
      </nav>
      <img src="/placeholder.svg" alt="Your app will live here!" />
    </div>
  );
};

export default Index;
