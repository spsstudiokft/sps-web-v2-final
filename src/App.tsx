/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./components/ThemeProvider";
import { LanguageProvider } from "./contexts/LanguageContext";
import PublicHome from "./pages/PublicHome";
import { IncidentStatusWidget } from "./components/common/IncidentStatusWidget";

const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminSetup = lazy(() => import("./pages/AdminSetup"));
const AdminLayout = lazy(() => import("./components/AdminLayout"));
const DashboardHome = lazy(() => import("./pages/admin/DashboardHome"));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage"));
const ThemesPage = lazy(() => import("./pages/admin/ThemesPage"));
const PortfolioPage = lazy(() => import("./pages/admin/PortfolioPage"));
const ContactsPage = lazy(() => import("./pages/admin/ContactsPage"));
const ClientsPage = lazy(() => import("./pages/admin/ClientsPage"));
const LeadsPage = lazy(() => import("./pages/admin/LeadsPage"));
const CustomersPage = lazy(() => import("./pages/admin/CustomersPage"));
const ProjectsPage = lazy(() => import("./pages/admin/ProjectsPage"));
const ServicesPage = lazy(() => import("./pages/admin/ServicesPage"));
const PricingPage = lazy(() => import("./pages/admin/PricingPage"));
const VisualIdeasPage = lazy(() => import("./pages/admin/VisualIdeasPage"));
const SocialLinksPage = lazy(() => import("./pages/admin/SocialLinksPage"));
const InfoBarPage = lazy(() => import("./pages/admin/InfoBarPage"));
const FaqsPage = lazy(() => import("./pages/admin/FaqsPage"));
const FaqCategoriesPage = lazy(() => import("./pages/admin/FaqCategoriesPage"));
const TeamManagementPage = lazy(() => import("./pages/admin/TeamManagementPage"));
const ReferralsPage = lazy(() => import("./pages/admin/ReferralsPage"));
const BudgetPage = lazy(() => import("./pages/admin/BudgetPage"));
const MarketingEmailsPage = lazy(() => import("./pages/admin/MarketingEmailsPage"));
const AcceptInvitePage = lazy(() => import("./pages/AcceptInvitePage"));
const ClientLogin = lazy(() => import("./pages/ClientLogin"));
const ClientRegister = lazy(() => import("./pages/ClientRegister"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const VerifyMagicLinkPage = lazy(() => import("./pages/VerifyMagicLinkPage"));
const ClientLayout = lazy(() => import("./components/ClientLayout"));
const ClientDashboardHome = lazy(() => import("./pages/client/ClientDashboardHome"));
const ClientProjectsPage = lazy(() => import("./pages/client/ClientProjectsPage"));
const ClientInvoicesPage = lazy(() => import("./pages/client/ClientInvoicesPage"));
const ClientReferralsPage = lazy(() => import("./pages/client/ClientReferralsPage"));
const PublicInvoicePage = lazy(() => import("./pages/PublicInvoicePage"));
const PortfolioGalleryPage = lazy(() => import("./pages/PortfolioGalleryPage"));

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
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <LanguageProvider>
            <IncidentStatusWidget />
            <Suspense fallback={<div className="min-h-screen bg-background" aria-busy="true" />}>
            <Routes>
              <Route path="/" element={<PublicHome />} />
              <Route path="/portfolio/:slug" element={<PortfolioGalleryPage />} />
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
                <Route path="visual-ideas" element={<VisualIdeasPage />} />
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
            </Suspense>
          </LanguageProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
