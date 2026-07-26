import { useEffect } from "react";

/**
 * "/" belongs to the marketing landing page (rendered from index.html on a
 * fresh page load). React only ever ends up here through an in-app link, so
 * the only correct behaviour is a real page load back to the landing page.
 */
const Index = () => {
  useEffect(() => {
    window.location.assign("/");
  }, []);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
      Loading…
    </div>
  );
};

export default Index;
