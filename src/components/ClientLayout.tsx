import { useEffect, useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { Building2, FileText, FolderKanban, Gift, LayoutDashboard, LogOut, Menu, Settings, UserRound, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { Button } from "./ui/Button";

type NavigationItem = { to: string; label: string; icon: typeof LayoutDashboard; active: (pathname: string) => boolean };

export default function ClientLayout() {
  const { logout, user } = useAuth();
  const { tUi } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  const navigation: NavigationItem[] = [
    { to: "/client", label: tUi("client.nav.dashboard") || "Áttekintés", icon: LayoutDashboard, active: (path) => path === "/client" },
    { to: "/client/projects", label: tUi("client.nav.projects") || "Projektjeim", icon: FolderKanban, active: (path) => path.startsWith("/client/projects") },
    { to: "/client/invoices", label: tUi("client.nav.invoices") || "Számlák", icon: FileText, active: (path) => path.startsWith("/client/invoices") },
    { to: "/client/referrals", label: tUi("client.nav.rewards") || "Ajánlások", icon: Gift, active: (path) => path.startsWith("/client/referrals") },
    { to: "/client/property-listings", label: tUi("client.nav.property_listings") || "Ingatlanhirdetések", icon: Building2, active: (path) => path.startsWith("/client/property-listings") },
    { to: "/client/settings", label: tUi("client.nav.settings") || "Fiókbeállítások", icon: Settings, active: (path) => path.startsWith("/client/settings") },
  ];
  const handleLogout = () => { logout(); navigate("/"); };
  const displayName = user?.name || user?.email?.split("@")[0] || "Ügyfél";

  const navigationContent = <div className="aero-client-sidebar flex h-full flex-col bg-background text-text">
    <div className="flex min-h-16 items-center gap-3 border-b border-border px-5"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"><UserRound className="h-5 w-5" /></div><div className="min-w-0"><p className="truncate text-sm font-bold">{tUi("client.nav.portal_title") || "Ügyfélportál"}</p><p className="truncate text-[11px] text-muted-text">SPS Studio</p></div><button type="button" onClick={() => setMobileMenuOpen(false)} className="ml-auto rounded-lg p-2 text-muted-text hover:bg-surface lg:hidden" aria-label="Menü bezárása"><X className="h-5 w-5" /></button></div>
    <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Ügyfélportál navigáció"><p className="px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-text">Portál</p>{navigation.map((item) => { const active = item.active(location.pathname); const Icon = item.icon; return <Link key={item.to} to={item.to} aria-current={active ? "page" : undefined} className={`aero-client-nav-item flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-text hover:bg-surface hover:text-text"}`}><Icon className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="truncate">{item.label}</span></Link>; })}</nav>
    <div className="border-t border-border p-3"><Link to="/client/settings" className="mb-2 flex items-center gap-3 rounded-xl p-2.5 hover:bg-surface"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">{displayName.slice(0, 1).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-text">{displayName}</p><p className="truncate text-[11px] text-muted-text">{user?.email}</p></div></Link><Button variant="secondary" size="sm" onClick={handleLogout} className="w-full justify-start gap-2.5"><LogOut className="h-4 w-4" />{tUi("client.nav.logout") || "Kijelentkezés"}</Button></div>
  </div>;

  return <div className="aero-workspace aero-client-shell min-h-screen bg-background lg:flex">
    <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:shrink-0 lg:border-r lg:border-border">{navigationContent}</aside>
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur lg:hidden"><button type="button" onClick={() => setMobileMenuOpen(true)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border bg-surface text-text" aria-label="Navigáció megnyitása" aria-expanded={mobileMenuOpen}><Menu className="h-5 w-5" /></button><p className="truncate px-3 text-sm font-bold text-text">{tUi("client.nav.portal_title") || "Ügyfélportál"}</p><Link to="/client/settings" className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary" aria-label="Fiókbeállítások">{displayName.slice(0, 1).toUpperCase()}</Link></header>
    {mobileMenuOpen && <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Ügyfélportál menü"><button type="button" className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" aria-label="Menü bezárása" onClick={() => setMobileMenuOpen(false)} /><aside className="relative h-full w-[min(20rem,86vw)] border-r border-border shadow-2xl">{navigationContent}</aside></div>}
    <main className="aero-workspace-content min-w-0 flex-1 p-4 sm:p-6 lg:p-8"><div className="mx-auto w-full max-w-7xl"><Outlet /></div></main>
  </div>;
}
