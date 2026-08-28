/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { lazy, ReactNode, Suspense } from "react";
import { AuthProvider, SESSION_ENDED_KEY, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./components/ThemeProvider";
import { LanguageProvider } from "./contexts/LanguageContext";
import PublicHome from "./pages/PublicHome";
import { IncidentStatusWidget } from "./components/common/IncidentStatusWidget";
import { ErrorPage, RouteErrorBoundary } from "./pages/ErrorPage";
import { ComingSoonGate } from "./components/public/ComingSoonGate";
import { BackgroundUploadProvider } from "./contexts/BackgroundUploadContext";
import { AdminCurrencyProvider } from "./contexts/AdminCurrencyContext";
import { CookieConsentProvider } from "./components/public/CookieConsent";

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
const CalendarPage = lazy(() => import("./pages/admin/CalendarPage"));
const ServicesPage = lazy(() => import("./pages/admin/ServicesPage"));
const PricingPage = lazy(() => import("./pages/admin/PricingPage"));
const VisualIdeasPage = lazy(() => import("./pages/admin/VisualIdeasPage"));
const PropertyListingsPage = lazy(() => import("./pages/admin/PropertyListingsPage"));
const PropertyDetailPage = lazy(() => import("./pages/admin/PropertyDetailPage"));
const CustomerOverviewPage = lazy(() => import("./pages/admin/CustomerOverviewPage"));
const SocialLinksPage = lazy(() => import("./pages/admin/SocialLinksPage"));
const InfoBarPage = lazy(() => import("./pages/admin/InfoBarPage"));
const FaqsPage = lazy(() => import("./pages/admin/FaqsPage"));
const FaqCategoriesPage = lazy(() => import("./pages/admin/FaqCategoriesPage"));
const TestimonialsPage = lazy(() => import("./pages/admin/TestimonialsPage"));
const TeamManagementPage = lazy(() => import("./pages/admin/TeamManagementPage"));
const ReferralsPage = lazy(() => import("./pages/admin/ReferralsPage"));
const BudgetPage = lazy(() => import("./pages/admin/BudgetPage"));
const MarketingEmailsPage = lazy(() => import("./pages/admin/MarketingEmailsPage"));
const AdminAccountSettingsPage = lazy(() => import("./pages/admin/AdminAccountSettingsPage"));
const AcceptInvitePage = lazy(() => import("./pages/AcceptInvitePage"));
const ClientLogin = lazy(() => import("./pages/ClientLogin"));
const ClientRegister = lazy(() => import("./pages/ClientRegister"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const VerifyMagicLinkPage = lazy(() => import("./pages/VerifyMagicLinkPage"));
const SessionEndedPage = lazy(() => import("./pages/SessionEndedPage"));
const ClientLayout = lazy(() => import("./components/ClientLayout"));
const ClientDashboardHome = lazy(() => import("./pages/client/ClientDashboardHome"));
const ClientProjectsPage = lazy(() => import("./pages/client/ClientProjectsPage"));
const ClientInvoicesPage = lazy(() => import("./pages/client/ClientInvoicesPage"));
const ClientReferralsPage = lazy(() => import("./pages/client/ClientReferralsPage"));
const ClientSettingsPage = lazy(() => import("./pages/client/ClientSettingsPage"));
const ClientListingAccountPage = lazy(() => import("./pages/client/ClientListingAccountPage"));
const ClientPropertyListingsPage = lazy(() => import("./pages/client/ClientPropertyListingsPage"));
const PropertyListingLoginPage = lazy(() => import("./pages/PropertyListingLoginPage"));
const PublicInvoicePage = lazy(() => import("./pages/PublicInvoicePage"));
const PortfolioGalleryPage = lazy(() => import("./pages/PortfolioGalleryPage"));
const PropertiesPage = lazy(() => import("./pages/PropertiesPage"));
const ChangelogPage = lazy(() => import("./pages/ChangelogPage"));
const AdminChangelogPage = lazy(() => import("./pages/admin/ChangelogPage"));

const ProtectedClientRoute = ({ children }: { children: ReactNode }) => {
  const { token, user } = useAuth();
  const location = useLocation();
  
  if (!token) {
    return <Navigate to={sessionStorage.getItem(SESSION_ENDED_KEY) ? "/session-ended" : "/client/login"} state={{ from: location }} replace />;
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
    return <ErrorPage status={403} />;
  }
  
  return children;
};

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { token, user } = useAuth();
  const location = useLocation();
  
  if (!token) {
    return <Navigate to={sessionStorage.getItem(SESSION_ENDED_KEY) ? "/session-ended" : "/admin/login"} state={{ from: location }} replace />;
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

  if (!['admin', 'editor', 'video_editor', 'real_estate_agent', 'advertiser', 'viewer', 'superadmin'].includes(String(role))) {
    return <ErrorPage status={403} />;
  }
  return children;
};

const ProtectedPropertyRoute = ({ children }: { children: ReactNode }) => {
  const token = localStorage.getItem("property_listing_token");
  try {
    if (!token) throw new Error("missing");
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    if (payload.role !== "property_client" || payload.scope !== "property-listings" || (payload.exp && payload.exp * 1000 <= Date.now())) throw new Error("invalid");
    return children;
  } catch {
    localStorage.removeItem("property_listing_token");
    localStorage.removeItem("property_listing_user");
    return <Navigate to="/property-listings/login" replace />;
  }
};

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider><AdminCurrencyProvider>
          <LanguageProvider>
            <BackgroundUploadProvider>
              <IncidentStatusWidget />
              <RouteErrorBoundary>
              <Suspense fallback={<div className="min-h-screen bg-background" aria-busy="true" />}>
              <Routes>
              <Route element={<CookieConsentProvider><ComingSoonGate /></CookieConsentProvider>}>
                <Route path="/" element={<PublicHome />} />
                <Route path="/changelog" element={<ChangelogPage />} />
                <Route path="/portfolio/:slug" element={<PortfolioGalleryPage />} />
                <Route path="/properties" element={<PropertiesPage />} />
                <Route path="/properties/:id" element={<PropertiesPage />} />
              </Route>
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
              <Route path="/session-ended" element={<SessionEndedPage />} />
              <Route path="/client/register" element={<ClientRegister />} />
              <Route path="/property-listings/login" element={<PropertyListingLoginPage />} />
              <Route path="/property-listings/manager" element={<ProtectedPropertyRoute><ClientPropertyListingsPage /></ProtectedPropertyRoute>} />
              <Route path="/ingatlanos/bejelentkezes" element={<Navigate to="/property-listings/login" replace />} />
              <Route path="/ingatlanos/kezelo" element={<Navigate to="/property-listings/manager" replace />} />
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
                <Route path="settings" element={<ClientSettingsPage />} />
                <Route path="property-listings" element={<ClientListingAccountPage />} />
                <Route path="*" element={<ErrorPage status={404} embedded />} />
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
                <Route path="account" element={<AdminAccountSettingsPage />} />
                <Route path="portfolio" element={<PortfolioPage />} />
                <Route path="services" element={<ServicesPage />} />
                <Route path="pricing" element={<PricingPage />} />
                <Route path="visual-ideas" element={<VisualIdeasPage />} />
                <Route path="property-listings" element={<PropertyListingsPage />} />
                <Route path="properties/:id" element={<PropertyDetailPage />} />
                <Route path="customers/:id" element={<CustomerOverviewPage />} />
                <Route path="info-bar" element={<InfoBarPage />} />
                <Route path="announcements" element={<InfoBarPage />} />
                <Route path="social-links" element={<SocialLinksPage />} />
                <Route path="faqs" element={<FaqsPage />} />
                <Route path="faqs/categories" element={<FaqCategoriesPage />} />
                <Route path="testimonials" element={<TestimonialsPage />} />
                <Route path="contacts" element={<ContactsPage />} />
                <Route path="clients" element={<ClientsPage />} />
                <Route path="leads" element={<LeadsPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="marketing-emails" element={<MarketingEmailsPage />} />
                <Route path="changelog" element={<AdminChangelogPage />} />
                <Route path="*" element={<ErrorPage status={404} embedded />} />
              </Route>

              <Route path="/401" element={<ErrorPage status={401} />} />
              <Route path="/403" element={<ErrorPage status={403} />} />
              <Route path="/404" element={<ErrorPage status={404} />} />
              <Route path="/500" element={<ErrorPage status={500} />} />
              <Route path="/503" element={<ErrorPage status={503} />} />
              <Route path="*" element={<ErrorPage status={404} />} />
              </Routes>
              </Suspense>
              </RouteErrorBoundary>
            </BackgroundUploadProvider>
          </LanguageProvider>
        </AdminCurrencyProvider></AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
