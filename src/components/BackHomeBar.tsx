import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  /** Where the Home button goes. Defaults to "/" (public landing). */
  homeTo?: string;
  /** Optional wrapper class (e.g. to control container/padding). */
  className?: string;
};

/**
 * Small navigation bar with Back + Home buttons for pages that are NOT
 * wrapped in AppShell (which already provides these).
 */
export default function BackHomeBar({ homeTo = "/", className = "" }: Props) {
  const navigate = useNavigate();
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) navigate(-1);
    else navigate(homeTo);
  };
  return (
    <div className={`flex items-center gap-2 mb-4 ${className}`}>
      <Button variant="ghost" size="sm" onClick={goBack} aria-label="Go back">
        <ArrowLeft className="h-4 w-4" />
        <span className="ml-1 hidden sm:inline">Back</span>
      </Button>
      <Button variant="ghost" size="sm" asChild aria-label="Home">
        <Link to={homeTo}>
          <Home className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline">Home</span>
        </Link>
      </Button>
    </div>
  );
}
