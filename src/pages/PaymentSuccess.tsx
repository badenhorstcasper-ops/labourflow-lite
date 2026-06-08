import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import InstallAppButton from "@/components/InstallAppButton";
import TestModeBanner from "@/components/TestModeBanner";

const PaymentSuccess = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsLoggedIn(!!data.session));
  }, []);

  const pendingEmail =
    typeof window !== "undefined" ? localStorage.getItem("inreco.pendingEmail") : null;

  return (
    <div className="min-h-screen bg-background">
      <TestModeBanner />
      <div className="flex min-h-[calc(100vh-2.5rem)] flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-bold">Payment successful!</h1>

      {isLoggedIn ? (
        <>
          <p className="text-muted-foreground">Your subscription is now active.</p>
          <Button asChild>
            <Link to="/">Open CARA</Link>
          </Button>
        </>
      ) : (
        <>
          <p className="max-w-md text-muted-foreground">
            Now create your iNRECO account
            {pendingEmail ? (
              <>
                {" "}using <span className="font-medium text-foreground">{pendingEmail}</span>
              </>
            ) : null}{" "}
            so we can link this payment to you.
          </p>
          <Button asChild>
            <Link to="/auth">Create your account</Link>
          </Button>
        </>
      )}

      <InstallAppButton />
      <p className="text-xs text-muted-foreground">
        Tip: on iPhone, use Safari's Share menu → "Add to Home Screen" to install iNRECO.
      </p>
      </div>
    </div>
  );
};

export default PaymentSuccess;
