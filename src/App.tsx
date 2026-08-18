/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./components/ThemeProvider";
import { LanguageProvider } from "./contexts/LanguageContext";
import PublicHome from "./pages/PublicHome";
import AdminLogin from "./pages/AdminLogin";
import AdminSetup from "./pages/AdminSetup";
import AdminLayout from "./components/AdminLayout";
import DashboardHome from "./pages/admin/DashboardHome";
import SettingsPage from "./pages/admin/SettingsPage";
import ThemesPage from "./pages/admin/ThemesPage";
import PortfolioPage from "./pages/admin/PortfolioPage";
import ContactsPage from "./pages/admin/ContactsPage";
import ClientsPage from "./pages/admin/ClientsPage";
import LeadsPage from "./pages/admin/LeadsPage";
import CustomersPage from "./pages/admin/CustomersPage";
import ProjectsPage from "./pages/admin/ProjectsPage";
import ServicesPage from "./pages/admin/ServicesPage";
import PricingPage from "./pages/admin/PricingPage";
import SocialLinksPage from "./pages/admin/SocialLinksPage";
import InfoBarPage from "./pages/admin/InfoBarPage";
import FaqsPage from "./pages/admin/FaqsPage";
import FaqCategoriesPage from "./pages/admin/FaqCategoriesPage";
import TeamManagementPage from "./pages/admin/TeamManagementPage";
import ReferralsPage from "./pages/admin/ReferralsPage";
import BudgetPage from "./pages/admin/BudgetPage";
import MarketingEmailsPage from "./pages/admin/MarketingEmailsPage";
import AcceptInvitePage from "./pages/AcceptInvitePage";
import ClientLogin from "./pages/ClientLogin";
import ClientRegister from "./pages/ClientRegister";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import VerifyMagicLinkPage from "./pages/VerifyMagicLinkPage";
import ClientLayout from "./components/ClientLayout";
import ClientDashboardHome from "./pages/client/ClientDashboardHome";
import ClientProjectsPage from "./pages/client/ClientProjectsPage";
import ClientInvoicesPage from "./pages/client/ClientInvoicesPage";
import ClientReferralsPage from "./pages/client/ClientReferralsPage";
import PublicInvoicePage from "./pages/PublicInvoicePage";
import { IncidentStatusWidget } from "./components/common/IncidentStatusWidget";

const ProtectedClientRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, user } = useAuth();
  const location = useLocation();
  
  if (!token) {
    return <Navigate to="/client/login" state={{ from: location }} replace />;
  }
  
  let role = user?.role;
  if (!role && token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      role = payload.role;
    } catch {
      role = undefined;
    }
  }
  
  if (role !== 'client' && role !== 'admin') {
    return <Navigate to="/client/login" state={{ from: location }} replace />;
  }
  
  return children;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, user } = useAuth();
  const location = useLocation();
  
  if (!token) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  let role = user?.role;
  if (!role && token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      role = payload.role || 'admin';
    } catch {
      role = undefined;
    }
  }

  if (role !== 'admin' && role !== 'editor' && role !== 'viewer' && role !== 'superadmin') {
    if (role === 'client') {
      return <Navigate to="/client" replace />;
    }
    return <Navigate to="/" replace />;
  }
  return children;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LanguageProvider>
          <BrowserRouter>
            <IncidentStatusWidget />
            <Routes>
              <Route path="/" element={<PublicHome />} />
              <Route path="/admin/setup" element={<AdminSetup />} />
              <Route path="/admin/login" element={<AdminLogin />} />

              <Route path="/invite/accept" element={<AcceptInvitePage />} />
              <Route path="/invite/:token" element={<AcceptInvitePage />} />

              <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
              <Route path="/auth/verify" element={<VerifyMagicLinkPage />} />
              <Route path="/auth/magic-link" element={<VerifyMagicLinkPage />} />
              <Route path="/auth/verify" element={<VerifyMagicLinkPage />} />

              {/* Public Invoices */}
              <Route path="/invoice/:id" element={<PublicInvoicePage />} />
              <Route path="/invoices/:id" element={<PublicInvoicePage />} />

              <Route path="/client/login" element={<ClientLogin />} />
              <Route path="/client/register" element={<ClientRegister />} />
              <Route
                path="/client"
                element={
                  <ProtectedClientRoute>
                    <ClientLayout />
                  </ProtectedClientRoute>
                }
              >
                <Route index element={<ClientDashboardHome />} />
                <Route path="projects" element={<ClientProjectsPage />} />
                <Route path="invoices" element={<ClientInvoicesPage />} />
                <Route path="referrals" element={<ClientReferralsPage />} />
              </Route>

              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardHome />} />
                <Route path="budget" element={<BudgetPage />} />
                <Route path="invoices" element={<Navigate to="/admin/budget?tab=invoices" replace />} />
                <Route path="team" element={<TeamManagementPage />} />
                <Route path="referrals" element={<ReferralsPage />} />
                <Route path="themes" element={<ThemesPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="portfolio" element={<PortfolioPage />} />
                <Route path="services" element={<ServicesPage />} />
                <Route path="pricing" element={<PricingPage />} />
                <Route path="info-bar" element={<InfoBarPage />} />
                <Route path="announcements" element={<InfoBarPage />} />
                <Route path="social-links" element={<SocialLinksPage />} />
                <Route path="faqs" element={<FaqsPage />} />
                <Route path="faqs/categories" element={<FaqCategoriesPage />} />
                <Route path="contacts" element={<ContactsPage />} />
                <Route path="clients" element={<ClientsPage />} />
                <Route path="leads" element={<LeadsPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="marketing-emails" element={<MarketingEmailsPage />} />
              </Route>

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
