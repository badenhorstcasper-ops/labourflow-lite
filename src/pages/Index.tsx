import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

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
