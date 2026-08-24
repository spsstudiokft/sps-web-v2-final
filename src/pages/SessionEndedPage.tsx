import { useNavigate } from "react-router-dom";
import { BriefcaseBusiness, ShieldCheck, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { LAST_LOGIN_PORTAL_KEY, SESSION_ENDED_KEY, type LoginPortal } from "../contexts/AuthContext";

const portalCopy: Record<LoginPortal, { title: string; description: string; path: string; Icon: typeof ShieldCheck }> = {
  admin: { title: "Admin felület", description: "Webhely, tartalmak és üzleti beállítások kezelése.", path: "/admin/login", Icon: ShieldCheck },
  client: { title: "Ügyfélportál", description: "Projektek, fájlok, számlák és ügyféladatok elérése.", path: "/client/login", Icon: BriefcaseBusiness },
};

export default function SessionEndedPage() {
  const navigate = useNavigate();
  const savedPortal = localStorage.getItem(LAST_LOGIN_PORTAL_KEY);
  const lastPortal: LoginPortal | null = savedPortal === "admin" || savedPortal === "client" ? savedPortal : null;

  const continueTo = (portal: LoginPortal) => {
    sessionStorage.removeItem(SESSION_ENDED_KEY);
    sessionStorage.removeItem("admin_token_expired");
    navigate(portalCopy[portal].path, { replace: true });
  };

  return (
    <main className="aero-auth-page min-h-screen bg-background px-4 py-10 sm:flex sm:items-center sm:justify-center">
      <Card className="mx-auto w-full max-w-2xl border-border shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Sparkles className="h-6 w-6" /></div>
          <CardTitle className="text-2xl">A munkamenet véget ért</CardTitle>
          <CardDescription className="mx-auto max-w-lg">Biztonsági okból kijelentkeztettük. Válassza ki, melyik felületre szeretne újra belépni.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {(["admin", "client"] as LoginPortal[]).map((portal) => {
            const { title, description, Icon } = portalCopy[portal];
            const wasLast = lastPortal === portal;
            return <button key={portal} type="button" onClick={() => continueTo(portal)} className={`relative rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${wasLast ? "border-primary bg-primary/10" : "border-border bg-surface/60"}`}>
              {wasLast && <span className="absolute right-3 top-3 rounded-full bg-primary px-2 py-1 text-[10px] font-black uppercase tracking-wide text-primary-foreground">Legutóbb itt</span>}
              <Icon className="mb-4 h-6 w-6 text-primary" />
              <div className="text-base font-bold text-text">{title}</div>
              <p className="mt-1.5 text-sm leading-5 text-muted-text">{description}</p>
            </button>;
          })}
        </CardContent>
      </Card>
    </main>
  );
}
