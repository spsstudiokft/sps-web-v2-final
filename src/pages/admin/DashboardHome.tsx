import React, { useState, useEffect } from "react";
import { PageHeader } from "../../components/admin/PageHeader";
import { Card, CardContent } from "../../components/ui/Card";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useApi } from "../../hooks/useApi";
import { useLanguage } from "../../contexts/LanguageContext";
import { Link } from "react-router-dom";
import { 
  Sparkles, 
  Image as ImageIcon, 
  FolderKanban, 
  MessageSquare, 
  Settings, 
  ArrowRight,
  HelpCircle,
  Wallet,
  Users
} from "lucide-react";

export default function DashboardHome() {
  const { currentLanguage, tUi } = useLanguage();
  usePageTitle(tUi("admin.dashboard.title", currentLanguage));
  const { fetchApi } = useApi();
  const [stats, setStats] = useState({
    services: 0,
    faqs: 0,
    portfolio: 0,
    projects: 0,
    contacts: 0,
    leads: 0,
    budgetEntries: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchApi("/api/admin/services").then(r => r.ok ? r.json() : []).catch(() => []),
      fetchApi("/api/admin/faqs").then(r => r.ok ? r.json() : []).catch(() => []),
      fetchApi("/api/admin/portfolio").then(r => r.ok ? r.json() : []).catch(() => []),
      fetchApi("/api/admin/projects").then(r => r.ok ? r.json() : []).catch(() => []),
      fetchApi("/api/admin/contacts").then(r => r.ok ? r.json() : []).catch(() => []),
      fetchApi("/api/admin/crm/leads").then(r => r.ok ? r.json() : []).catch(() => []),
      fetchApi("/api/admin/budget/entries").then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([services, faqs, portfolio, projects, contacts, leads, budgetEntries]) => {
      setStats({
        services: Array.isArray(services) ? services.length : 0,
        faqs: Array.isArray(faqs) ? faqs.length : 0,
        portfolio: Array.isArray(portfolio) ? portfolio.length : 0,
        projects: Array.isArray(projects) ? projects.length : 0,
        contacts: Array.isArray(contacts) ? contacts.length : 0,
        leads: Array.isArray(leads) ? leads.length : 0,
        budgetEntries: Array.isArray(budgetEntries) ? budgetEntries.length : 0,
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const cards = [
    {
      title: tUi("admin.dashboard.services_title", currentLanguage) || "Services",
      description: tUi("admin.dashboard.services_desc", currentLanguage) || "Manage studio services and packages",
      count: stats.services,
      icon: Sparkles,
      to: "/admin/services",
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    },
    {
      title: tUi("admin.dashboard.projects_title", currentLanguage) || "Projects",
      description: tUi("admin.dashboard.projects_desc", currentLanguage) || "Active shoots and deliverables",
      count: stats.projects,
      icon: FolderKanban,
      to: "/admin/projects",
      color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    },
    {
      title: tUi("admin.dashboard.portfolio_title", currentLanguage) || "Portfolio",
      description: tUi("admin.dashboard.portfolio_desc", currentLanguage) || "Showcased gallery assets",
      count: stats.portfolio,
      icon: ImageIcon,
      to: "/admin/portfolio",
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: tUi("admin.dashboard.submissions_title", currentLanguage) || "Inquiries",
      description: tUi("admin.dashboard.submissions_desc", currentLanguage) || "Contact and booking inquiries",
      count: stats.contacts,
      icon: MessageSquare,
      to: "/admin/contacts",
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    },
    {
      title: "Budget & Cashflow",
      description: "Manage incomes, outcomes, and financial tracking",
      count: stats.budgetEntries,
      icon: Wallet,
      to: "/admin/budget",
      color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    },
    {
      title: tUi("admin.dashboard.faqs_title", currentLanguage) || "FAQs",
      description: tUi("admin.dashboard.faqs_desc", currentLanguage) || "Client questions & answers",
      count: stats.faqs,
      icon: HelpCircle,
      to: "/admin/faqs",
      color: "text-sky-500 bg-sky-500/10 border-sky-500/20",
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <PageHeader
            title={tUi("admin.dashboard.title", currentLanguage)}
            description={tUi("admin.dashboard.subtitle", currentLanguage)}
          />
        </div>
        <Link
          to="/"
          target="_blank"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <span>{tUi("admin.dashboard.open_live_site", currentLanguage)}</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.to}
              to={card.to}
              className="group block p-6 rounded-2xl bg-surface border border-border hover:border-primary/40 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-2xl font-bold text-text">
                  {loading ? "..." : card.count}
                </span>
              </div>
              <h3 className="text-base font-semibold text-text mb-1 group-hover:text-primary transition-colors">
                {card.title}
              </h3>
              <p className="text-xs text-muted-text leading-relaxed">
                {card.description}
              </p>
            </Link>
          );
        })}
      </div>

      <Card className="border-border">
        <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h4 className="text-base font-semibold text-text mb-1">
              {tUi("admin.dashboard.settings_card_title", currentLanguage)}
            </h4>
            <p className="text-sm text-muted-text">
              {tUi("admin.dashboard.settings_card_desc", currentLanguage)}
            </p>
          </div>
          <Link
            to="/admin/settings"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface hover:bg-surface/80 border border-border text-sm font-medium text-text transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>{tUi("admin.dashboard.manage_settings", currentLanguage)}</span>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
