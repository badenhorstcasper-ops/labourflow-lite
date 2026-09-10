import React from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import Index from "@/pages/Index";
const AdminPage = lazyWithRetry(() => import("@/pages/Admin"));
import { usePageView } from "@/hooks/usePageView";
const Pricing = lazyWithRetry(() => import("@/pages/Pricing"));
const Auth = lazyWithRetry(() => import("@/pages/Auth"));
const ResetPassword = lazyWithRetry(() => import("@/pages/ResetPassword"));
const Dashboard = lazyWithRetry(() => import("@/pages/Dashboard"));
const Settings = lazyWithRetry(() => import("@/pages/Settings"));
const PaymentSuccess = lazyWithRetry(() => import("@/pages/PaymentSuccess"));
const PaymentCancelled = lazyWithRetry(() => import("@/pages/PaymentCancelled"));
import NotFound from "@/pages/NotFound";
const CompanyProfilePage = lazyWithRetry(() => import("@/pages/CompanyProfile"));
const DocumentsPage = lazyWithRetry(() => import("@/pages/Documents"));
const GeneratePage = lazyWithRetry(() => import("@/pages/Generate"));
const CaraPage = lazyWithRetry(() => import("@/pages/Cara"));
const SharePage = lazyWithRetry(() => import("@/pages/Share"));
const PayLink = lazyWithRetry(() => import("@/pages/PayLink"));
const ContactPage = lazyWithRetry(() => import("@/pages/Contact"));
const HealthPage = lazyWithRetry(() => import("@/pages/Health"));
const VerifyCertificatePage = lazyWithRetry(() => import("@/pages/VerifyCertificate"));
const Terms = lazyWithRetry(() => import("@/pages/Terms"));
const Privacy = lazyWithRetry(() => import("@/pages/Privacy"));
const Disclaimer = lazyWithRetry(() => import("@/pages/Disclaimer"));
import ContrastAudit from "@/components/dev/ContrastAudit";
import ErrorBoundary from "@/components/ErrorBoundary";
import RequireSubscription from "@/components/RequireSubscription";
const PartnerApply = lazyWithRetry(() => import("@/pages/PartnerApply"));
const PartnerPortal = lazyWithRetry(() => import("@/pages/PartnerPortal"));
const PartnerAgreement = lazyWithRetry(() => import("@/pages/PartnerAgreement"));
const PartnerMarketing = lazyWithRetry(() => import("@/pages/PartnerMarketing"));
const AdminCommissions = lazyWithRetry(() => import("@/pages/AdminCommissions"));
const AdminSalespersonNew = lazyWithRetry(() => import("@/pages/AdminSalespersonNew"));
const AdminOverview = lazyWithRetry(() => import("@/pages/AdminOverview"));
const AdminPartnerDecision = lazyWithRetry(() => import("@/pages/AdminPartnerDecision"));
const AdminMarketing = lazyWithRetry(() => import("@/pages/AdminMarketing"));
const AdminHealth = lazyWithRetry(() => import("@/pages/AdminHealth"));
const GetApp = lazyWithRetry(() => import("@/pages/GetApp"));
const UifGuide = lazyWithRetry(() => import("@/pages/UifGuide"));
const ReferEarn = lazyWithRetry(() => import("@/pages/ReferEarn"));
const AdminReferrals = lazyWithRetry(() => import("@/pages/AdminReferrals"));
import { captureInviteFromUrl, attachInviteIfAny } from "@/lib/referral";
import { supabase } from "@/integrations/supabase/client";


import { isAppLaunch } from "@/lib/appLaunch";
import LaunchRouter from "@/components/LaunchRouter";

const queryClient = new QueryClient();

/** Light placeholder while a screen's code loads (keeps the app feeling instant). */
function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" aria-label="Loading" />
    </div>
  );
}

const gated = (el: React.ReactNode) => <RequireSubscription>{el}</RequireSubscription>;
/** Same protection, but visitors get a try-it screen instead of a dead end. */
const gatedWithPreview = (el: React.ReactNode) => (
  <RequireSubscription allowGuestPreview>{el}</RequireSubscription>
);

function useCaptureRef() {
  const search = typeof window !== "undefined" ? window.location.search : "";
  React.useEffect(() => {
    try {
      const p = new URLSearchParams(search);
      const ref = p.get("ref");
      if (ref && /^INR-[A-Z0-9]{4,12}$/i.test(ref)) {
        localStorage.setItem("inreco.ref", ref.toUpperCase());
      }
    } catch (_) {}
    captureInviteFromUrl(search);
  }, [search]);
}

/** Links a signed-in account to the invite link it arrived from (once). */
function useAttachInvite() {
  React.useEffect(() => {
    attachInviteIfAny();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") attachInviteIfAny();
    });
    return () => sub.subscription.unsubscribe();
  }, []);
}



function AppRoutes() {
  usePageView();
  useCaptureRef();
  useAttachInvite();

  return (
    <Routes>
      {/* Open routes */}
      <Route path="/" element={isAppLaunch() ? <LaunchRouter /> : <Index />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/get" element={<GetApp />} />
      <Route path="/guides/uif-ufiling" element={<UifGuide />} />

      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/payment-cancelled" element={<PaymentCancelled />} />
      <Route path="/d/:token" element={<SharePage />} />
      <Route path="/pay/:reference" element={<PayLink />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/disclaimer" element={<Disclaimer />} />

      {/* Admin (role-gated inside the page) */}
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/admin/commissions" element={<AdminCommissions />} />
      <Route path="/admin/salespersons/new" element={<AdminSalespersonNew />} />

      {/* Partner routes */}
      <Route path="/partner" element={<PartnerPortal />} />
      <Route path="/partner/apply" element={<PartnerApply />} />
      <Route path="/partner/agreement" element={<PartnerAgreement />} />
      <Route path="/partner/marketing" element={<PartnerMarketing />} />
      <Route path="/admin/overview" element={<AdminOverview />} />
      <Route path="/admin/partner-decision" element={<AdminPartnerDecision />} />
      <Route path="/admin/marketing" element={<AdminMarketing />} />
      <Route path="/admin/health" element={<AdminHealth />} />
      <Route path="/admin/referrals" element={<AdminReferrals />} />
      <Route path="/account-app/refer" element={gated(<ReferEarn />)} />




      {/* Subscription-gated routes */}
      <Route path="/app" element={gatedWithPreview(<CaraPage />)} />
      <Route path="/dashboard" element={gated(<Dashboard />)} />
      <Route path="/settings" element={gated(<Settings />)} />
      {/* Older links/bookmarks pointed at this address for billing. */}
      <Route path="/account-app/billing" element={<Navigate to="/settings" replace />} />
      <Route path="/account-app/settings" element={<Navigate to="/settings" replace />} />
      <Route path="/account-app/dashboard" element={<Navigate to="/dashboard" replace />} />
      <Route path="/account-app/app" element={<Navigate to="/app" replace />} />
      <Route path="/account-app" element={gated(<CompanyProfilePage />)} />
      <Route path="/account-app/profile" element={gated(<CompanyProfilePage />)} />
      <Route path="/account-app/documents" element={gated(<DocumentsPage />)} />
      <Route path="/account-app/generate" element={gated(<GeneratePage />)} />
      <Route path="/account-app/health" element={gated(<HealthPage />)} />
      <Route path="/account-app/verify-certificate" element={gated(<VerifyCertificatePage />)} />



      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <React.Suspense fallback={<PageLoader />}>
            <AppRoutes />
          </React.Suspense>
          <Toaster />
          {import.meta.env.DEV && <ContrastAudit />}
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

