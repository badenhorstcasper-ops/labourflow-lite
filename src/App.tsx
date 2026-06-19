import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import Index from "@/pages/Index";
import AdminPage from "@/pages/Admin";
import { usePageView } from "@/hooks/usePageView";
import Pricing from "@/pages/Pricing";
import Auth from "@/pages/Auth";
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
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import Disclaimer from "@/pages/Disclaimer";
import ContrastAudit from "@/components/dev/ContrastAudit";
import ErrorBoundary from "@/components/ErrorBoundary";
import RequireSubscription from "@/components/RequireSubscription";

const queryClient = new QueryClient();

const gated = (el: React.ReactNode) => <RequireSubscription>{el}</RequireSubscription>;

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Open routes */}
            <Route path="/" element={<Index />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-cancelled" element={<PaymentCancelled />} />
            <Route path="/d/:token" element={<SharePage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/disclaimer" element={<Disclaimer />} />

            {/* Subscription-gated routes */}
            <Route path="/app" element={gated(<CaraPage />)} />
            <Route path="/dashboard" element={gated(<Dashboard />)} />
            <Route path="/settings" element={gated(<Settings />)} />
            <Route path="/account-app" element={gated(<CompanyProfilePage />)} />
            <Route path="/account-app/profile" element={gated(<CompanyProfilePage />)} />
            <Route path="/account-app/documents" element={gated(<DocumentsPage />)} />
            <Route path="/account-app/generate" element={gated(<GeneratePage />)} />
            <Route path="/account-app/health" element={gated(<HealthPage />)} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
          {import.meta.env.DEV && <ContrastAudit />}
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
