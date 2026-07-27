import { useState } from "react";
import { Share2 } from "lucide-react";

/**
 * Lets anyone pass iNRECO on to a friend. Uses the phone's normal share
 * sheet (WhatsApp, SMS, email) when available, otherwise copies the link.
 */
const ShareAppButton = ({ className = "" }: { className?: string }) => {
  const [copied, setCopied] = useState(false);

  const shareUrl = (() => {
    const base =
      typeof window !== "undefined" && window.location.hostname.endsWith("inreco.co.za")
        ? window.location.origin
        : "https://app.inreco.co.za";
    let ref = "";
    try {
      ref = localStorage.getItem("inreco.ref") || "";
    } catch (_) {}
    return `${base}/get${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;
  })();

  const text =
    "iNRECO Pocket Consultant — instant South African labour advice and ready-made HR documents on your phone.";

  const handleShare = async () => {
    const nav = navigator as Navigator & {
      share?: (data: { title: string; text: string; url: string }) => Promise<void>;
    };
    if (nav.share) {
      try {
        await nav.share({ title: "iNRECO Pocket Consultant", text, url: shareUrl });
        return;
      } catch (_) {
        // person cancelled — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (_) {
      window.prompt("Copy this link and send it to a friend:", shareUrl);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={handleShare}
        className={`inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted ${className}`}
      >
        <Share2 className="h-4 w-4" />
        Share iNRECO with a friend
      </button>
      {copied && <span className="text-xs text-muted-foreground">Link copied — paste it anywhere.</span>}
    </div>
  );
};

export default ShareAppButton;
