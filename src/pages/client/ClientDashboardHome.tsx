import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { ClientProperty, ClientLink } from "../../lib/types";
import { 
  Building, 
  MapPin, 
  Globe, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Copy, 
  Check, 
  FolderKanban,
  Edit2,
  Loader2,
  AlertCircle,
  Gift,
  ArrowRight,
  Sparkles
} from "lucide-react";

export default function ClientDashboardHome() {
  const { tUi } = useLanguage();
  usePageTitle(tUi("client.nav.dashboard"));
  const { fetchApi } = useApi();
  const { user } = useAuth();
  const [data, setData] = useState<{ message?: string; activeProjectCount?: number } | null>(null);
  
  // Properties and Links state
  const [properties, setProperties] = useState<ClientProperty[]>([]);
  const [links, setLinks] = useState<ClientLink[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  
  // Modal / Inline Add / Edit states
  const [editingProp, setEditingProp] = useState<Partial<ClientProperty> | null>(null);
  const [editingLink, setEditingLink] = useState<Partial<ClientLink> | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [dashRes, propRes, linkRes] = await Promise.all([
        fetchApi("/api/client/dashboard"),
        fetchApi("/api/client/properties"),
        fetchApi("/api/client/links")
      ]);

      if (dashRes.ok) {
        const d = await dashRes.json();
        setData(d);
      }
      if (propRes.ok) {
        const p = await propRes.json();
        setProperties(Array.isArray(p) ? p : []);
      }
      if (linkRes.ok) {
        const l = await linkRes.json();
        setLinks(Array.isArray(l) ? l : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingItems(false);
    }
  }, [fetchApi]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProp || !editingProp.address?.trim()) return;

    setSavingItem(true);
    setErrorMsg("");
    try {
      if (editingProp.id && !editingProp.id.startsWith("temp-")) {
        const res = await fetchApi(`/api/client/properties/${editingProp.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            property_name: editingProp.property_name?.trim() || "My Property",
            address: editingProp.address.trim()
          })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to update property");
        }
      } else {
        const res = await fetchApi(`/api/client/properties`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            property_name: editingProp.property_name?.trim() || "My Property",
            address: editingProp.address.trim()
          })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to add property (limit 10)");
        }
      }
      setEditingProp(null);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save property");
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteProperty = async (id: string) => {
    if (!confirm("Remove this property?")) return;
    try {
      await fetchApi(`/api/client/properties/${id}`, { method: "DELETE" });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLink || !editingLink.url?.trim()) return;

    const trimmedUrl = editingLink.url.trim();
    if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
      setErrorMsg("Link URL must start with http:// or https://");
      return;
    }

    setSavingItem(true);
    setErrorMsg("");
    try {
      if (editingLink.id && !editingLink.id.startsWith("temp-")) {
        const res = await fetchApi(`/api/client/links/${editingLink.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: editingLink.label?.trim() || "Listing Link",
            url: trimmedUrl
          })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to update link");
        }
      } else {
        const res = await fetchApi(`/api/client/links`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: editingLink.label?.trim() || "Listing Link",
            url: trimmedUrl
          })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to add link");
        }
      }
      setEditingLink(null);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save link");
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm("Remove this link?")) return;
    try {
      await fetchApi(`/api/client/links/${id}`, { method: "DELETE" });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const welcomeText = tUi("client.dashboard.welcome_user", { email: user?.email || "" });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
            {welcomeText}
          </h1>
          <p className="text-sm text-muted-text mt-1">
            Manage your registered property addresses, listing links, and view your project status.
          </p>
        </div>
      </div>
      
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <Card className="hover:border-primary/50 transition-colors bg-surface shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-text">{tUi("client.dashboard.my_projects")}</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <FolderKanban size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-text">{data?.activeProjectCount ?? 0}</p>
            <p className="text-xs text-muted-text mt-1">{tUi("client.dashboard.active_projects")}</p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors bg-surface shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-text">{tUi("client.home.properties")}</CardTitle>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                <Building size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-text">{properties.length}</p>
            <p className="text-xs text-muted-text mt-1">Registered address{properties.length === 1 ? "" : "es"} (up to 10)</p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors bg-surface shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-text">{tUi("client.home.listing_links")}</CardTitle>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Globe size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-text">{links.length}</p>
            <p className="text-xs text-muted-text mt-1">{tUi("client.home.links_summary")}</p>
          </CardContent>
        </Card>
      </div>

      {/* VIP Referral Program Banner */}
      <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-primary/5 to-indigo-500/10 shadow-xs overflow-hidden">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-text font-heading">{tUi("client.home.vip_title")}</h3>
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 uppercase">
                  Earn Credits
                </span>
              </div>
              <p className="text-xs text-muted-text">
                Invite fellow realtors & agency partners. Unlock tiered VIP discounts, earn booking credits, and gift your colleagues a 10% welcome discount.
              </p>
            </div>
          </div>

          <Link
            to="/client/referrals"
            className="shrink-0"
          >
            <Button size="sm" variant="primary" className="text-xs gap-1.5 shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{tUi("client.home.open_vip")}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Properties & Links Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Properties Card */}
        <Card className="shadow-xs border-border bg-surface flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                <Building size={16} />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-text">{tUi("client.home.my_properties")}</CardTitle>
                <p className="text-xs text-muted-text">{tUi("client.home.properties_desc")}</p>
              </div>
            </div>
            {properties.length < 10 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setErrorMsg("");
                  setEditingProp({
                    property_name: `Property ${properties.length + 1}`,
                    address: ""
                  });
                }}
                className="text-xs h-8 gap-1.5"
              >
                <Plus size={14} />
                <span>{tUi("client.home.add_property")}</span>
              </Button>
            )}
          </CardHeader>

          <CardContent className="p-4 sm:p-5 flex-1 space-y-3">
            {loadingItems ? (
              <div className="flex items-center justify-center py-8 text-muted-text text-xs gap-2">
                <Loader2 size={16} className="animate-spin text-primary" />
                <span>{tUi("client.home.loading_properties")}</span>
              </div>
            ) : properties.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-xl text-xs text-muted-text space-y-2">
                <MapPin size={24} className="mx-auto text-muted-text/60" />
                <p>{tUi("client.home.no_properties")}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setErrorMsg("");
                    setEditingProp({ property_name: "Primary Property", address: "" });
                  }}
                  className="text-xs gap-1.5"
                >
                  <Plus size={13} />
                  <span>{tUi("client.home.add_first_property")}</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {properties.map((prop, idx) => (
                  <div
                    key={prop.id}
                    className="p-3.5 rounded-xl bg-background border border-border/80 flex items-start justify-between gap-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-muted text-muted-text">
                          #{idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-text truncate">
                          {prop.property_name || `Property ${idx + 1}`}
                        </span>
                      </div>
                      <p className="text-xs text-muted-text flex items-center gap-1.5">
                        <MapPin size={13} className="text-primary shrink-0" />
                        <span className="truncate">{prop.address}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopy(prop.address, prop.id)}
                        className="p-1.5 rounded-lg text-muted-text hover:text-text hover:bg-muted/40 transition-colors"
                        title={tUi("client.home.copy_address")}
                      >
                        {copiedId === prop.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(prop.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-muted-text hover:text-primary hover:bg-muted/40 transition-colors"
                        title={tUi("client.home.view_maps")}
                      >
                        <ExternalLink size={14} />
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMsg("");
                          setEditingProp(prop);
                        }}
                        className="p-1.5 rounded-lg text-muted-text hover:text-text hover:bg-muted/40 transition-colors"
                        title={tUi("client.home.edit_property")}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProperty(prop.id)}
                        className="p-1.5 rounded-lg text-muted-text hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title={tUi("client.home.delete_property")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Listing Links Card */}
        <Card className="shadow-xs border-border bg-surface flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
                <Globe size={16} />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-text">{tUi("client.home.links_title")}</CardTitle>
                <p className="text-xs text-muted-text">{tUi("client.home.links_desc")}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setErrorMsg("");
                setEditingLink({
                  label: `Listing Link ${links.length + 1}`,
                  url: ""
                });
              }}
              className="text-xs h-8 gap-1.5"
            >
              <Plus size={14} />
              <span>{tUi("client.home.add_link")}</span>
            </Button>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 flex-1 space-y-3">
            {loadingItems ? (
              <div className="flex items-center justify-center py-8 text-muted-text text-xs gap-2">
                <Loader2 size={16} className="animate-spin text-primary" />
                <span>{tUi("client.home.loading_links")}</span>
              </div>
            ) : links.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-xl text-xs text-muted-text space-y-2">
                <Globe size={24} className="mx-auto text-muted-text/60" />
                <p>{tUi("client.home.no_links")}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setErrorMsg("");
                    setEditingLink({ label: "Main Listing Link", url: "" });
                  }}
                  className="text-xs gap-1.5"
                >
                  <Plus size={13} />
                  <span>{tUi("client.home.add_first_link")}</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {links.map((lnk, idx) => (
                  <div
                    key={lnk.id}
                    className="p-3.5 rounded-xl bg-background border border-border/80 flex items-center justify-between gap-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-muted text-muted-text">
                          #{idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-text truncate">
                          {lnk.label || `Listing Link ${idx + 1}`}
                        </span>
                      </div>
                      <a
                        href={lnk.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline truncate block"
                      >
                        {lnk.url}
                      </a>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopy(lnk.url, lnk.id)}
                        className="p-1.5 rounded-lg text-muted-text hover:text-text hover:bg-muted/40 transition-colors"
                        title={tUi("client.home.copy_link")}
                      >
                        {copiedId === lnk.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                      <a
                        href={lnk.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                        title={tUi("client.home.open_link")}
                      >
                        <ExternalLink size={14} />
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMsg("");
                          setEditingLink(lnk);
                        }}
                        className="p-1.5 rounded-lg text-muted-text hover:text-text hover:bg-muted/40 transition-colors"
                        title={tUi("client.home.edit_link")}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteLink(lnk.id)}
                        className="p-1.5 rounded-lg text-muted-text hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title={tUi("client.home.delete_link")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Property Modal */}
      {editingProp && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-border animate-in fade-in zoom-in-95 duration-150">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg font-bold text-text">
                {editingProp.id ? "Edit Property" : "Add Property"}
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleSaveProperty}>
              <CardContent className="p-5 space-y-3.5">
                {errorMsg && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 flex items-center gap-1.5">
                    <AlertCircle size={14} />
                    <span>{errorMsg}</span>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-text uppercase">{tUi("client.home.property_label")}</label>
                  <Input
                    placeholder={tUi("client.home.property_label_placeholder")}
                    value={editingProp.property_name || ""}
                    onChange={(e) => setEditingProp({ ...editingProp, property_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-text uppercase">
                    Address <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder={tUi("client.home.address_placeholder")}
                    value={editingProp.address || ""}
                    onChange={(e) => setEditingProp({ ...editingProp, address: e.target.value })}
                  />
                </div>
              </CardContent>
              <div className="p-4 border-t border-border flex justify-end gap-2 bg-surface/50 rounded-b-xl">
                <Button variant="secondary" type="button" onClick={() => setEditingProp(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingItem}>
                  {savingItem ? <Loader2 size={15} className="animate-spin mr-1.5" /> : null}
                  <span>{tUi("client.home.save_property")}</span>
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Link Modal */}
      {editingLink && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-border animate-in fade-in zoom-in-95 duration-150">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg font-bold text-text">
                {editingLink.id ? "Edit Listing Link" : "Add Listing Link"}
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleSaveLink}>
              <CardContent className="p-5 space-y-3.5">
                {errorMsg && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 flex items-center gap-1.5">
                    <AlertCircle size={14} />
                    <span>{errorMsg}</span>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-text uppercase">{tUi("client.home.link_label")}</label>
                  <Input
                    placeholder={tUi("client.home.link_label_placeholder")}
                    value={editingLink.label || ""}
                    onChange={(e) => setEditingLink({ ...editingLink, label: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-text uppercase">
                    URL <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    type="url"
                    placeholder={tUi("client.home.link_url_placeholder")}
                    value={editingLink.url || ""}
                    onChange={(e) => setEditingLink({ ...editingLink, url: e.target.value })}
                  />
                </div>
              </CardContent>
              <div className="p-4 border-t border-border flex justify-end gap-2 bg-surface/50 rounded-b-xl">
                <Button variant="secondary" type="button" onClick={() => setEditingLink(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingItem}>
                  {savingItem ? <Loader2 size={15} className="animate-spin mr-1.5" /> : null}
                  <span>{tUi("client.home.save_link")}</span>
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
