import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import CompanyProfilePage from "@/pages/CompanyProfile";
import DocumentsPage from "@/pages/Documents";
import SharePage from "@/pages/Share";
import ContactPage from "@/pages/Contact";
import ContrastAudit from "@/components/dev/ContrastAudit";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/account-app" element={<Navigate to="/account-app/profile" replace />} />
          <Route path="/account-app/profile" element={<CompanyProfilePage />} />
          <Route path="/account-app/documents" element={<DocumentsPage />} />
          <Route path="/d/:token" element={<SharePage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
        {import.meta.env.DEV && <ContrastAudit />}
      </BrowserRouter>
    </QueryClientProvider>
  );
}
