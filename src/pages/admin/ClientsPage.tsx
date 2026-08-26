import { useState, useEffect, useCallback } from "react";
import { useApi } from "../../hooks/useApi";
import { useLanguage } from "../../contexts/LanguageContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { Client, ClientProperty, ClientLink } from "../../lib/types";
import { Card, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/admin/PageHeader";
import { AdminListSkeleton } from "../../components/admin/AdminSkeleton";
import { ClientPropertyLinksManager } from "../../components/admin/ClientPropertyLinksManager";
import { 
  Search, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  XCircle, 
  X, 
  Plus, 
  MapPin, 
  Globe, 
  ExternalLink, 
  Eye, 
  Mail, 
  Lock,
  Building,
  Copy,
  Check
} from "lucide-react";
import { Link } from "react-router-dom";

const ADMIN_DATE_LOCALES: Record<string, string> = {
  hu: "hu-HU", en: "en-GB", de: "de-DE", fr: "fr-FR", es: "es-ES",
};

function parseAccountCreatedAt(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return null;
    const timestamp = value < 10_000_000_000 ? value * 1000 : value;
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();
  if (/^0+(?:\.0+)?$/.test(raw)) return null;
  // SQLite CURRENT_TIMESTAMP is UTC but omits the ISO timezone marker.
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(raw)
    ? `${raw.replace(" ", "T")}Z`
    : raw;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatAccountCreatedAt(value: unknown, language: string) {
  const date = parseAccountCreatedAt(value);
  if (!date) return null;
  const locale = ADMIN_DATE_LOCALES[language] || ADMIN_DATE_LOCALES.en;
  return {
    date: new Intl.DateTimeFormat(locale, {
      year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Europe/Budapest",
    }).format(date),
    time: new Intl.DateTimeFormat(locale, {
      hour: "2-digit", minute: "2-digit", timeZone: "Europe/Budapest",
    }).format(date),
    iso: date.toISOString(),
  };
}

export default function ClientsPage() {
  const { currentLanguage, tUi } = useLanguage();
  usePageTitle(tUi("admin.clients.title", currentLanguage));
  const { fetchApi } = useApi();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingClient, setEditingClient] = useState<Partial<Client> & { password?: string } | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [clientProperties, setClientProperties] = useState<Partial<ClientProperty>[]>([]);
  const [clientLinks, setClientLinks] = useState<Partial<ClientLink>[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi(`/api/admin/clients?search=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error("Failed to fetch clients");
      const data = await res.json();
      setClients(data);
    } catch (error) {
      console.error("Failed to fetch clients", error);
    } finally {
      setLoading(false);
    }
  }, [fetchApi, search]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const loadClientDetails = async (client: Client) => {
    try {
      const res = await fetchApi(`/api/admin/clients/${client.id}`);
      if (res.ok) {
        const fullData = await res.json();
        return fullData;
      }
    } catch (err) {
      console.warn("Could not load full client data:", err);
    }
    return client;
  };

  const handleOpenEdit = async (client: Partial<Client> & { password?: string }) => {
    setSaveError("");
    if (client.id) {
      const full = await loadClientDetails(client as Client);
      setEditingClient(full);
      setClientProperties(full.properties || (full.property_address ? [{ id: crypto.randomUUID(), property_name: "Primary Property", address: full.property_address }] : []));
      setClientLinks(full.links || (full.advertisement_link ? [{ id: crypto.randomUUID(), label: "Main Listing Link", url: full.advertisement_link }] : []));
    } else {
      setEditingClient(client);
      setClientProperties([]);
      setClientLinks([]);
    }
  };

  const handleOpenView = async (client: Client) => {
    const full = await loadClientDetails(client);
    setViewingClient(full);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(tUi("admin.clients.confirm_delete", currentLanguage))) return;
    try {
      await fetchApi(`/api/admin/clients/${id}`, { method: "DELETE" });
      fetchClients();
    } catch (error) {
      console.error("Failed to delete client", error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    const cleanProperties = clientProperties
      .map(p => ({
        property_name: p.property_name?.trim() || "Property",
        address: p.address?.trim() || "",
        metadata: p.metadata
      }))
      .filter(p => p.address.length > 0);

    const cleanLinks = clientLinks
      .map(l => ({
        label: l.label?.trim() || "Listing Link",
        url: l.url?.trim() || "",
        metadata: l.metadata
      }))
      .filter(l => l.url.length > 0);

    const primaryAddress = cleanProperties.length > 0 ? cleanProperties[0].address : "";
    const primaryLink = cleanLinks.length > 0 ? cleanLinks[0].url : "";

    try {
      setIsSaving(true);
      setSaveError("");
      const payload = {
        email: editingClient.email?.trim(),
        password: editingClient.password || undefined,
        is_active: editingClient.is_active !== undefined ? editingClient.is_active : 1,
        property_address: primaryAddress,
        advertisement_link: primaryLink,
        properties: cleanProperties,
        links: cleanLinks,
      };

      if (editingClient.id) {
        const updateResponse = await fetchApi(`/api/admin/clients/${editingClient.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!updateResponse.ok) {
          const errorData = await updateResponse.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to update client account");
        }

        // Sync properties & links via admin endpoints if needed
        try {
          await Promise.all([
            fetchApi(`/api/admin/clients/${editingClient.id}/properties/reorder`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ items: cleanProperties })
            }),
            fetchApi(`/api/admin/clients/${editingClient.id}/links/reorder`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ items: cleanLinks })
            })
          ]);
        } catch (syncErr) {
          console.warn("Properties sync notice:", syncErr);
        }
      } else {
        const createResponse = await fetchApi(`/api/admin/clients`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!createResponse.ok) {
          const errorData = await createResponse.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to create client account");
        }
      }
      setEditingClient(null);
      await fetchClients();
    } catch (error: any) {
      console.error("Failed to save client", error);
      setSaveError(error?.message || "Failed to save client account");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading && clients.length === 0) {
    return <AdminListSkeleton title={tUi("admin.clients.title", currentLanguage)} />;
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader title={tUi("admin.clients.title", currentLanguage)} subtitle={tUi("admin.clients.subtitle", currentLanguage)} />
        <Button 
          onClick={() => { 
            handleOpenEdit({ email: '', is_active: 1, property_address: '', advertisement_link: '', password: '' }); 
          }} 
          className="gap-2"
        >
          <Plus size={16} /> {tUi("admin.clients.add_client", currentLanguage)}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-text" size={18} />
          <Input
            placeholder={tUi("admin.clients.search_placeholder", currentLanguage)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {clients.length === 0 ? (
          <div className="p-12 text-center text-muted-text">
            {tUi("admin.clients.empty_clients", currentLanguage)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider">{tUi("admin.clients.th_email", currentLanguage)}</th>
                  <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider">Properties & Addresses</th>
                  <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider">Listing Links</th>
                  <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider">{tUi("admin.clients.th_status", currentLanguage)}</th>
                  <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider">{tUi("admin.clients.th_projects", currentLanguage)}</th>
                  <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider">{tUi("admin.clients.th_joined", currentLanguage)}</th>
                  <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider text-right">{tUi("admin.clients.th_actions", currentLanguage)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map((client) => {
                  const propCount = client.properties_count || (client.property_address ? 1 : 0);
                  const linkCount = client.links_count || (client.advertisement_link ? 1 : 0);
                  const createdAt = formatAccountCreatedAt(client.created_at, currentLanguage);

                  return (
                    <tr key={client.id} className="hover:bg-background/50 transition-colors">
                      <td className="p-4">
                        {client.name && <div className="font-semibold text-text">{client.name}</div>}
                        <div className="font-medium text-text">{client.email}</div>
                        {client.customer_name && (
                          <div className="text-xs text-muted-text mt-0.5">CRM: {client.customer_name}</div>
                        )}
                      </td>
                      <td className="p-4 text-sm text-text max-w-xs">
                        {client.property_address ? (
                          <div className="space-y-1">
                            <span title={client.property_address} className="inline-flex items-center gap-1 text-text text-xs">
                              <MapPin size={13} className="text-muted-text shrink-0" />
                              <span className="truncate max-w-[180px]">{client.property_address}</span>
                            </span>
                            {propCount > 1 && (
                              <div>
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-primary/10 text-primary px-1.5 py-0.2 rounded-full">
                                  <Building size={11} />
                                  <span>+{propCount - 1} more</span>
                                </span>
                              </div>
                            )}
                          </div>
                        ) : propCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                            <Building size={13} />
                            <span>{propCount} properties</span>
                          </span>
                        ) : (
                          <span className="text-muted-text text-xs">-</span>
                        )}
                      </td>
                      <td className="p-4 text-sm whitespace-nowrap">
                        {client.advertisement_link ? (
                          <div className="space-y-1">
                            <a
                              href={client.advertisement_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-hover hover:underline bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-md transition-colors"
                              title={client.advertisement_link}
                            >
                              <span>View Listing</span>
                              <ExternalLink size={11} />
                            </a>
                            {linkCount > 1 && (
                              <div className="text-[11px] text-muted-text">
                                +{linkCount - 1} more links
                              </div>
                            )}
                          </div>
                        ) : linkCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-primary">
                            <Globe size={13} />
                            <span>{linkCount} links</span>
                          </span>
                        ) : (
                          <span className="text-muted-text text-xs">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {client.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <CheckCircle2 size={14} /> {tUi("admin.clients.status_active", currentLanguage)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                            <XCircle size={14} /> {tUi("admin.clients.status_disabled", currentLanguage)}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-sm font-medium text-text">
                        {client.project_count || 0}
                      </td>
                      <td className="p-4 whitespace-nowrap text-sm text-muted-text">
                        {createdAt ? (
                          <time dateTime={createdAt.iso} title={createdAt.iso} className="inline-flex flex-col leading-tight">
                            <span className="font-medium text-text tabular-nums">{createdAt.date}</span>
                            <span className="mt-1 text-xs text-muted-text tabular-nums">{createdAt.time}</span>
                          </time>
                        ) : (
                          <span title="Missing or invalid account creation date">—</span>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenView(client)}
                          title={tUi("admin.clients.view_details", currentLanguage)}
                        >
                          <Eye size={16} />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEdit(client)}
                          title={tUi("admin.clients.edit_client", currentLanguage)}
                        >
                          <Edit2 size={16} />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(client.id)}
                          title={tUi("admin.clients.delete_client", currentLanguage)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details View Modal */}
      {viewingClient && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-xl shadow-lg flex flex-col my-auto max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold text-text">{tUi("admin.clients.details_title", currentLanguage)}</h3>
                {viewingClient.is_active ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckCircle2 size={12} /> {tUi("admin.clients.status_active", currentLanguage)}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                    <XCircle size={12} /> {tUi("admin.clients.status_disabled", currentLanguage)}
                  </span>
                )}
              </div>
              <button onClick={() => setViewingClient(null)} className="text-muted-text hover:text-text transition-colors">
                <X size={20} />
              </button>
            </div>

            <CardContent className="p-6 space-y-4 overflow-y-auto">
              <div className="flex items-center gap-2 text-sm text-text">
                <Mail size={16} className="text-muted-text shrink-0" />
                <span className="font-medium">{viewingClient.email}</span>
              </div>

              {/* Properties Section */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-text flex items-center gap-1.5">
                    <Building size={14} className="text-primary" />
                    <span>Registered Properties ({viewingClient.properties?.length || (viewingClient.property_address ? 1 : 0)})</span>
                  </div>
                </div>

                {viewingClient.properties && viewingClient.properties.length > 0 ? (
                  <div className="space-y-2">
                    {viewingClient.properties.map((p, idx) => (
                      <div key={p.id || idx} className="p-2.5 rounded-lg bg-surface border border-border flex items-start justify-between gap-2">
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="text-xs font-semibold text-text">{p.property_name || `Property ${idx + 1}`}</div>
                          <div className="text-xs text-muted-text flex items-center gap-1">
                            <MapPin size={12} className="text-primary shrink-0" />
                            <span className="truncate">{p.address}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopy(p.address, p.id || String(idx))}
                            className="p-1 text-muted-text hover:text-text rounded hover:bg-muted/40"
                            title={tUi("client.home.copy_address")}
                          >
                            {copiedId === (p.id || String(idx)) ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                          </button>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-muted-text hover:text-primary rounded hover:bg-muted/40"
                            title="View on Maps"
                          >
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : viewingClient.property_address ? (
                  <div className="p-2.5 rounded-lg bg-surface border border-border flex items-center justify-between gap-2">
                    <div className="text-xs text-muted-text flex items-center gap-1 truncate">
                      <MapPin size={12} className="text-primary shrink-0" />
                      <span className="truncate">{viewingClient.property_address}</span>
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(viewingClient.property_address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-muted-text hover:text-primary"
                    >
                      <ExternalLink size={13} />
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-muted-text italic">No properties registered</p>
                )}
              </div>

              {/* Links Section */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-text flex items-center gap-1.5">
                  <Globe size={14} className="text-primary" />
                  <span>Listing & Advertisement Links ({viewingClient.links?.length || (viewingClient.advertisement_link ? 1 : 0)})</span>
                </div>

                {viewingClient.links && viewingClient.links.length > 0 ? (
                  <div className="space-y-2">
                    {viewingClient.links.map((l, idx) => (
                      <div key={l.id || idx} className="p-2.5 rounded-lg bg-surface border border-border flex items-center justify-between gap-2">
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="text-xs font-semibold text-text">{l.label || `Listing Link ${idx + 1}`}</div>
                          <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block">
                            {l.url}
                          </a>
                        </div>
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-primary hover:bg-primary/10 rounded"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : viewingClient.advertisement_link ? (
                  <div className="p-2.5 rounded-lg bg-surface border border-border flex items-center justify-between gap-2">
                    <a href={viewingClient.advertisement_link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate">
                      {viewingClient.advertisement_link}
                    </a>
                    <a href={viewingClient.advertisement_link} target="_blank" rel="noopener noreferrer" className="p-1 text-primary">
                      <ExternalLink size={13} />
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-muted-text italic">No listing links registered</p>
                )}
              </div>

              {/* Associated Projects */}
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-text block">
                  {tUi("admin.clients.associated_projects", currentLanguage)} ({viewingClient.projects?.length || 0})
                </label>
                {viewingClient.projects && viewingClient.projects.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {viewingClient.projects.map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-surface border border-border rounded-lg p-2.5">
                        <span className="text-xs text-text font-medium">{p.name}</span>
                        <Link to="/admin/projects" className="text-xs text-primary hover:underline">
                          {tUi("admin.clients.view", currentLanguage)}
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-text italic">{tUi("admin.clients.no_projects", currentLanguage)}</p>
                )}
              </div>
            </CardContent>

            <div className="p-4 border-t border-border flex justify-end gap-2 bg-surface rounded-b-xl">
              <Button variant="secondary" onClick={() => setViewingClient(null)}>
                {tUi("admin.clients.cancel", currentLanguage)}
              </Button>
              <Button onClick={() => { const clientToEdit = viewingClient; setViewingClient(null); handleOpenEdit(clientToEdit); }}>
                <Edit2 size={15} className="mr-1.5" />
                {tUi("admin.clients.edit_client", currentLanguage)}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Add / Edit Modal */}
      {editingClient && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl shadow-lg max-h-[92vh] flex flex-col my-auto border-border">
            <div className="flex justify-between items-center p-6 border-b border-border shrink-0">
              <h3 className="text-xl font-semibold text-text">
                {editingClient.id ? tUi("admin.clients.modal_edit_title", currentLanguage) : tUi("admin.clients.modal_add_title", currentLanguage)}
              </h3>
              <button onClick={() => setEditingClient(null)} className="text-muted-text hover:text-text transition-colors">
                <X size={20} />
              </button>
            </div>
            <CardContent className="p-6 overflow-y-auto space-y-4">
              <form id="client-form" onSubmit={handleSave} className="space-y-4">
                {saveError && (
                  <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-300">
                    {saveError}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-text">
                    {tUi("admin.clients.field_email", currentLanguage)} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    value={editingClient.email || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                    required
                  />
                </div>

                {!editingClient.id && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-text flex items-center gap-1.5">
                      <Lock size={14} className="text-muted-text" />
                      {tUi("admin.clients.field_password", currentLanguage)}
                    </label>
                    <Input
                      type="password"
                      placeholder={tUi("admin.clients.field_password_placeholder", currentLanguage)}
                      value={editingClient.password || ''}
                      onChange={(e) => setEditingClient({ ...editingClient, password: e.target.value })}
                    />
                  </div>
                )}

                {/* Unlimited Properties and Links Manager */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-text">
                    Properties & Listing Links (Unlimited)
                  </label>
                  <ClientPropertyLinksManager
                    properties={clientProperties}
                    links={clientLinks}
                    onChangeProperties={setClientProperties}
                    onChangeLinks={setClientLinks}
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={editingClient.is_active === 1 || editingClient.is_active === undefined}
                    onChange={(e) => setEditingClient({ ...editingClient, is_active: e.target.checked ? 1 : 0 })}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-text">
                    {tUi("admin.clients.account_active", currentLanguage)}
                  </label>
                </div>
              </form>
            </CardContent>
            <div className="p-6 border-t border-border shrink-0 flex justify-end gap-3 bg-surface rounded-b-xl">
              <Button variant="secondary" type="button" onClick={() => setEditingClient(null)}>
                {tUi("admin.clients.cancel", currentLanguage)}
              </Button>
              <Button form="client-form" type="submit" disabled={isSaving}>
                {isSaving ? "Saving…" : tUi("admin.clients.save_changes", currentLanguage)}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
