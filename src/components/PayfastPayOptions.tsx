import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import {
  SCAN_SESSION_MS,
  createCheckout,
  payLinkFor,
  rememberPendingCheckout,
  submitPreparedCheckout,
  supportsApplePay,
  supportsGooglePay,
  type WalletMethod,
} from "@/lib/payfast";

type Props = {
  planName: string;
  priceLabel: string;
  email: string;
  referralCode?: string | null;
  /** Wallets and scan codes always charge today — the free trial keeps the card flow. */
  disabled?: boolean;
  onError?: (message: string) => void;
};

function AppleLogo() {
  return (
    <svg viewBox="0 0 384 512" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-2.7-.4-3.9H24v7.1h12.1c-.2 1.8-1.6 4.6-4.5 6.4l6.9 5.3c4.1-3.8 6.6-9.4 6.6-14.9z" />
      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.3c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.7-3.8-12.4-9.1l-7.1 5.5C8.1 41.1 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.6 28.5c-.5-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1l-7.1-5.5C3 17.6 2.2 20.7 2.2 24s.8 6.4 2.3 9.1l7.1-4.6z" />
      <path fill="#EA4335" d="M24 10.6c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 4.4 29.9 2 24 2 15.4 2 8.1 6.9 4.5 14.8l7.1 5.5C13.3 15 18.2 10.6 24 10.6z" />
    </svg>
  );
}

const WALLET_CLASS =
  "flex w-full items-center justify-center gap-2 rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50";

export default function PayfastPayOptions({
  planName,
  priceLabel,
  email,
  referralCode,
  disabled,
  onError,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [showScan, setShowScan] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [scanLink, setScanLink] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  const expired = expiresAt !== null && now >= expiresAt;
  const minutesLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / 60000)) : 0;

  const startWallet = useCallback(
    async (method: WalletMethod) => {
      if (!email) {
        onError?.("Please enter your email address before continuing.");
        return;
      }
      setBusy(method);
      try {
        const data = await createCheckout({
          planName,
          email,
          mode: "now",
          referralCode,
          paymentMethod: method,
        });
        rememberPendingCheckout(email, planName, data.mPaymentId);
        submitPreparedCheckout(data.actionUrl!, data.fields!);
      } catch (e) {
        onError?.(e instanceof Error ? e.message : "Checkout could not start. Please try again.");
        setBusy(null);
      }
    },
    [email, planName, referralCode, onError],
  );

  const makeScanCode = useCallback(async () => {
    if (!email) {
      onError?.("Please enter your email address before continuing.");
      return;
    }
    setBusy("scan");
    try {
      const data = await createCheckout({ planName, email, mode: "now", referralCode });
      const link = payLinkFor(data.mPaymentId!);
      const image = await QRCode.toDataURL(link, { width: 320, margin: 1 });
      if (!mounted.current) return;
      setScanLink(link);
      setQr(image);
      setExpiresAt(Date.now() + SCAN_SESSION_MS);
      setNow(Date.now());
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "The payment code could not be created.");
    } finally {
      if (mounted.current) setBusy(null);
    }
  }, [email, planName, referralCode, onError]);

  function toggleScan() {
    const next = !showScan;
    setShowScan(next);
    if (next && !qr) void makeScanCode();
  }

  const canApple = supportsApplePay();
  const canGoogle = supportsGooglePay();

  return (
    <div className="space-y-2">
      <p className="text-center text-[11px] uppercase tracking-wide text-muted-foreground">
        Or pay {priceLabel} today with
      </p>

      {canApple && (
        <button
          type="button"
          className={WALLET_CLASS}
          disabled={disabled || busy !== null}
          onClick={() => startWallet("ap")}
        >
          <AppleLogo />
          {busy === "ap" ? "Opening Apple Pay…" : "Pay with Apple Pay"}
        </button>
      )}

      {canGoogle && (
        <button
          type="button"
          className={WALLET_CLASS}
          disabled={disabled || busy !== null}
          onClick={() => startWallet("gp")}
        >
          <GoogleLogo />
          {busy === "gp" ? "Opening Google Pay…" : "Pay with Google Pay"}
        </button>
      )}

      <Button
        type="button"
        variant="ghost"
        className="w-full text-xs"
        disabled={disabled || busy !== null}
        onClick={toggleScan}
      >
        {showScan ? "Hide Scan to Pay" : "Scan to Pay"}
      </Button>

      {showScan && (
        <div className="rounded-md border border-border bg-card p-3 text-center">
          {busy === "scan" && <p className="text-xs text-muted-foreground">Creating your payment code…</p>}

          {qr && !expired && (
            <>
              <img
                src={qr}
                alt={`Payment code for the iNRECO ${planName} plan`}
                className="mx-auto h-40 w-40 rounded-md border border-border bg-white p-2"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Scan this with your phone camera or banking app to pay {priceLabel} for {planName}.
                This code works for another {minutesLeft} minute{minutesLeft === 1 ? "" : "s"}.
              </p>
              {scanLink && (
                <p className="mt-1 break-all text-[10px] text-muted-foreground">{scanLink}</p>
              )}
            </>
          )}

          {qr && expired && (
            <>
              <img
                src={qr}
                alt="Expired payment code"
                className="mx-auto h-40 w-40 rounded-md border border-border bg-white p-2 opacity-30"
              />
              <p className="mt-2 text-xs text-destructive">This code has expired.</p>
              <Button type="button" size="sm" variant="outline" className="mt-2" onClick={makeScanCode}>
                Refresh code
              </Button>
            </>
          )}

          <button
            type="button"
            className="mt-3 text-[11px] underline text-muted-foreground"
            disabled={disabled || busy !== null}
            onClick={() => startWallet("mp")}
          >
            {busy === "mp" ? "Opening PayFast…" : "Or use PayFast Scan to Pay on this device"}
          </button>
        </div>
      )}

      <p className="text-center text-[10px] text-muted-foreground">
        Wallet and scan payments start your plan today. To use the free trial, use the button above.
      </p>
    </div>
  );
}
