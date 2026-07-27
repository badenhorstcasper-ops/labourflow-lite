import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import Index from "@/pages/Index";
import AdminPage from "@/pages/Admin";
import { usePageView } from "@/hooks/usePageView";
import Pricing from "@/pages/Pricing";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Settings from "@/pages/Settings";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentCancelled from "@/pages/PaymentCancelled";
import NotFound from "@/pages/NotFound";
import CompanyProfilePage from "@/pages/CompanyProfile";
import DocumentsPage from "@/pages/Documents";
import GeneratePage from "@/pages/Generate";
import CaraPage from "@/pages/Cara";
import SharePage from "@/pages/Share";
import ContactPage from "@/pages/Contact";
import HealthPage from "@/pages/Health";
import VerifyCertificatePage from "@/pages/VerifyCertificate";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import Disclaimer from "@/pages/Disclaimer";
import ContrastAudit from "@/components/dev/ContrastAudit";
import ErrorBoundary from "@/components/ErrorBoundary";
import RequireSubscription from "@/components/RequireSubscription";
import PartnerApply from "@/pages/PartnerApply";
import PartnerPortal from "@/pages/PartnerPortal";
import PartnerAgreement from "@/pages/PartnerAgreement";
import PartnerMarketing from "@/pages/PartnerMarketing";
import AdminCommissions from "@/pages/AdminCommissions";
import AdminSalespersonNew from "@/pages/AdminSalespersonNew";
import AdminOverview from "@/pages/AdminOverview";
import AdminPartnerDecision from "@/pages/AdminPartnerDecision";
import AdminMarketing from "@/pages/AdminMarketing";
import AdminHealth from "@/pages/AdminHealth";
import GetApp from "@/pages/GetApp";



const queryClient = new QueryClient();

const gated = (el: React.ReactNode) => <RequireSubscription>{el}</RequireSubscription>;

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
  }, [search]);
}


function AppRoutes() {
  usePageView();
  useCaptureRef();

  return (
    <Routes>
      {/* Open routes */}
      <Route path="/" element={<Index />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/get" element={<GetApp />} />

      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/payment-cancelled" element={<PaymentCancelled />} />
      <Route path="/d/:token" element={<SharePage />} />
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




      {/* Subscription-gated routes */}
      <Route path="/app" element={gated(<CaraPage />)} />
      <Route path="/dashboard" element={gated(<Dashboard />)} />
      <Route path="/settings" element={gated(<Settings />)} />
      {/* Older links/bookmarks pointed at this address for billing. */}
      <Route path="/account-app/billing" element={<Navigate to="/settings" replace />} />
      <Route path="/account-app/settings" element={<Navigate to="/settings" replace />} />
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
          <AppRoutes />
          <Toaster />
          {import.meta.env.DEV && <ContrastAudit />}
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

