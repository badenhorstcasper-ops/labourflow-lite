import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import InstallAppButton from "@/components/InstallAppButton";
import ShareAppButton from "@/components/ShareAppButton";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";

/**
 * Public landing spot for a shared shortcut. Anyone without an active plan
 * is pointed straight at the plan choices (pay now or 7-day free trial).
 */
const GetApp = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loading, isEntitled } = useSubscription();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref && /^INR-[A-Z0-9]{4,12}$/i.test(ref)) {
      try {
        localStorage.setItem("inreco.ref", ref.toUpperCase());
      } catch (_) {}
    }
  }, [searchParams]);

  const ref = searchParams.get("ref");
  const plansHref = `/pricing${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6 px-4 py-14 text-center">
        <img
          src="/icon-512.png"
          alt="iNRECO Pocket Consultant app icon"
          width={112}
          height={112}
          className="rounded-2xl shadow-lg"
        />
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">iNRECO Pocket Consultant</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Instant South African labour advice from CARA, plus ready-made warnings, hearings
            and HR documents — on your phone.
          </p>
        </div>

        <InstallAppButton />

        <Button size="lg" className="w-full max-w-xs" onClick={() => navigate(plansHref)}>
          See plans & start
        </Button>
        <p className="text-xs text-muted-foreground">
          Choose a plan and either start a 7-day free trial or join and pay right away.
        </p>

        {!loading && isEntitled && (
          <Button variant="outline" onClick={() => navigate("/app")}>
            Open the app
          </Button>
        )}

        <ShareAppButton />
      </div>
    </div>
  );
};

export default GetApp;
