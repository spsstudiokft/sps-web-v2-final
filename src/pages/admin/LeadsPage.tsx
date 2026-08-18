import { useState, useEffect } from "react";
import { useApi } from "../../hooks/useApi";
import { useLanguage } from "../../contexts/LanguageContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { CRMRecord, ClientProperty, ClientLink } from "../../lib/types";
import { PageHeader } from "../../components/admin/PageHeader";
import { AdminListSkeleton } from "../../components/admin/AdminSkeleton";
import { Card, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ClientPropertyLinksManager } from "../../components/admin/ClientPropertyLinksManager";
import { cn } from "../../lib/utils";
import { 
  Search, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  UserPlus, 
  Phone, 
  Mail, 
  MapPin, 
  ExternalLink, 
  Eye, 
  Globe,
  Building,
  Copy,
  Check
} from "lucide-react";

export default function LeadsPage() {
  const { currentLanguage, tUi } = useLanguage();
  usePageTitle(tUi("admin.leads.title", currentLanguage));
  const { fetchApi } = useApi();
  const [leads, setLeads] = useState<CRMRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Partial<CRMRecord> | null>(null);
  const [leadProperties, setLeadProperties] = useState<Partial<ClientProperty>[]>([]);
  const [leadLinks, setLeadLinks] = useState<Partial<ClientLink>[]>([]);

  const [viewingLead, setViewingLead] = useState<CRMRecord | null>(null);
  const [viewingProperties, setViewingProperties] = useState<any[]>([]);
  const [viewingLinks, setViewingLinks] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetchApi(`/api/admin/crm/lead?search=${encodeURIComponent(search)}`);
      if (res.ok) setLeads(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [search]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenEdit = async (lead: Partial<CRMRecord>) => {
    setEditingLead(lead);
    if (lead.id) {
      try {
        const [pRes, lRes] = await Promise.all([
          fetchApi(`/api/admin/crm/${lead.id}/properties`),
          fetchApi(`/api/admin/crm/${lead.id}/links`)
        ]);
        if (pRes.ok) {
          const p = await pRes.json();
          setLeadProperties(Array.isArray(p) ? p : []);
        } else {
          setLeadProperties(lead.property_address ? [{ property_name: "Property 1", address: lead.property_address }] : []);
        }
        if (lRes.ok) {
          const l = await lRes.json();
          setLeadLinks(Array.isArray(l) ? l : []);
        } else {
          setLeadLinks(lead.advertisement_link ? [{ label: "Listing Link 1", url: lead.advertisement_link }] : []);
        }
      } catch {
        setLeadProperties(lead.property_address ? [{ property_name: "Property 1", address: lead.property_address }] : []);
        setLeadLinks(lead.advertisement_link ? [{ label: "Listing Link 1", url: lead.advertisement_link }] : []);
      }
    } else {
      setLeadProperties([]);
      setLeadLinks([]);
    }
    setIsModalOpen(true);
  };

  const handleOpenView = async (lead: CRMRecord) => {
    setViewingLead(lead);
    try {
      const [pRes, lRes] = await Promise.all([
        fetchApi(`/api/admin/crm/${lead.id}/properties`),
        fetchApi(`/api/admin/crm/${lead.id}/links`)
      ]);
      if (pRes.ok) {
        const p = await pRes.json();
        setViewingProperties(Array.isArray(p) ? p : []);
      }
      if (lRes.ok) {
        const l = await lRes.json();
        setViewingLinks(Array.isArray(l) ? l : []);
      }
    } catch {
      setViewingProperties([]);
      setViewingLinks([]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;

    const cleanProperties = leadProperties
      .map(p => ({
        property_name: p.property_name?.trim() || "Property",
        address: p.address?.trim() || "",
        metadata: p.metadata
      }))
      .filter(p => p.address.length > 0);

    const cleanLinks = leadLinks
      .map(l => ({
        label: l.label?.trim() || "Listing Link",
        url: l.url?.trim() || "",
        metadata: l.metadata
      }))
      .filter(l => l.url.length > 0);

    const primaryAddress = cleanProperties.length > 0 ? cleanProperties[0].address : null;
    const primaryLink = cleanLinks.length > 0 ? cleanLinks[0].url : null;
    
    try {
      const payload = {
        ...editingLead,
        property_address: primaryAddress,
        advertisement_link: primaryLink,
        properties: cleanProperties,
        links: cleanLinks,
      };

      if (editingLead.id) {
        await fetchApi(`/api/admin/crm/${editingLead.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi(`/api/admin/crm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, type: 'lead', status: editingLead.status || 'new' }),
        });
      }
      setIsModalOpen(false);
      setEditingLead(null);
      fetchLeads();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(tUi("admin.leads.confirm_delete", currentLanguage))) return;
    try {
      await fetchApi(`/api/admin/crm/${id}`, { method: "DELETE" });
      fetchLeads();
    } catch (e) {
      console.error(e);
    }
  };

  const convertToCustomer = async (id: string) => {
    try {
      const res = await fetchApi(`/api/admin/crm/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "customer", status: "active" }),
      });
      if (res.ok) fetchLeads();
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "contacted":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
      case "qualified":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "lost":
        return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getStageLabel = (status: string) => {
    switch (status) {
      case "new": return tUi("admin.leads.stage_new", currentLanguage);
      case "contacted": return tUi("admin.leads.stage_contacted", currentLanguage);
      case "qualified": return tUi("admin.leads.stage_qualified", currentLanguage);
      case "lost": return tUi("admin.leads.stage_lost", currentLanguage);
      default: return status;
    }
  };

  const filteredLeads = leads.filter(l => statusFilter === "all" || l.status === statusFilter);

  if (loading && leads.length === 0) {
    return <AdminListSkeleton title={tUi("admin.leads.title", currentLanguage)} />;
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader title={tUi("admin.leads.title", currentLanguage)} subtitle={tUi("admin.leads.subtitle", currentLanguage)} />
        <Button 
          onClick={() => { 
            handleOpenEdit({ status: 'new', property_address: '', advertisement_link: '' }); 
          }} 
          className="gap-2"
        >
          <Plus size={16} /> {tUi("admin.leads.add_lead", currentLanguage)}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-text" size={18} />
          <Input placeholder={tUi("admin.leads.search_placeholder", currentLanguage)} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <select 
          className="h-[38px] px-3 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">{tUi("admin.leads.stage_all", currentLanguage)}</option>
          <option value="new">{tUi("admin.leads.stage_new", currentLanguage)}</option>
          <option value="contacted">{tUi("admin.leads.stage_contacted", currentLanguage)}</option>
          <option value="qualified">{tUi("admin.leads.stage_qualified", currentLanguage)}</option>
          <option value="lost">{tUi("admin.leads.stage_lost", currentLanguage)}</option>
        </select>
      </div>

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider">{tUi("admin.leads.th_lead_info", currentLanguage)}</th>
                <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider">{tUi("admin.leads.th_stage", currentLanguage)}</th>
                <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider">{tUi("admin.leads.th_property_address", currentLanguage)}</th>
                <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider">{tUi("admin.leads.th_advertisement_link", currentLanguage)}</th>
                <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider">{tUi("admin.leads.th_source", currentLanguage)}</th>
                <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider">{tUi("admin.leads.th_added", currentLanguage)}</th>
                <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider text-right">{tUi("admin.leads.th_actions", currentLanguage)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-background/50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-text flex items-center gap-2">
                      {lead.name}
                    </div>
                    <div className="text-sm text-muted-text mt-1 space-y-0.5">
                      {lead.email && <div className="flex items-center gap-1.5"><Mail size={12} /> {lead.email}</div>}
                      {lead.phone && <div className="flex items-center gap-1.5"><Phone size={12} /> {lead.phone}</div>}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium", getStatusColor(lead.status))}>
                      {getStageLabel(lead.status)}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-text max-w-xs">
                    {lead.property_address ? (
                      <div className="space-y-1">
                        <span title={lead.property_address} className="inline-flex items-center gap-1 text-text text-xs">
                          <MapPin size={13} className="text-muted-text shrink-0" />
                          <span className="truncate max-w-[170px]">{lead.property_address}</span>
                        </span>
                        {lead.properties_count && lead.properties_count > 1 && (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-primary/10 text-primary px-1.5 py-0.2 rounded-full">
                              <Building size={11} />
                              <span>+{lead.properties_count - 1} more</span>
                            </span>
                          </div>
                        )}
                      </div>
                    ) : lead.properties_count && lead.properties_count > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                        <Building size={13} />
                        <span>{lead.properties_count} properties</span>
                      </span>
                    ) : (
                      <span className="text-muted-text text-xs">-</span>
                    )}
                  </td>
                  <td className="p-4 text-sm whitespace-nowrap">
                    {lead.advertisement_link ? (
                      <div className="space-y-1">
                        <a
                          href={lead.advertisement_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-hover hover:underline bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-md transition-colors"
                          title={lead.advertisement_link}
                        >
                          <span>{tUi("admin.leads.view_advert", currentLanguage)}</span>
                          <ExternalLink size={12} />
                        </a>
                        {lead.links_count && lead.links_count > 1 && (
                          <div className="text-[11px] text-muted-text">
                            +{lead.links_count - 1} more links
                          </div>
                        )}
                      </div>
                    ) : lead.links_count && lead.links_count > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-primary">
                        <Globe size={13} />
                        <span>{lead.links_count} links</span>
                      </span>
                    ) : (
                      <span className="text-muted-text text-xs">-</span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-muted-text">
                    {lead.source || '-'}
                  </td>
                  <td className="p-4 whitespace-nowrap text-sm text-muted-text">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right space-x-2 whitespace-nowrap">
                    <Button variant="secondary" size="sm" onClick={() => handleOpenView(lead)} title={tUi("admin.leads.view_details", currentLanguage)}>
                      <Eye size={16} />
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleOpenEdit(lead)} title={tUi("admin.leads.edit", currentLanguage)}>
                      <Edit2 size={16} />
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => convertToCustomer(lead.id)} title={tUi("admin.leads.convert_to_customer", currentLanguage)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      <UserPlus size={16} />
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(lead.id)} title={tUi("admin.leads.delete", currentLanguage)}>
                      <Trash2 size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-text">
                    {tUi("admin.leads.no_leads_found", currentLanguage)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details View Modal */}
      {viewingLead && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-lg shadow-lg flex flex-col my-auto max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold text-text">{tUi("admin.leads.details_title", currentLanguage)}</h3>
                <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", getStatusColor(viewingLead.status))}>
                  {getStageLabel(viewingLead.status)}
                </span>
              </div>
              <button onClick={() => setViewingLead(null)} className="text-muted-text hover:text-text transition-colors">
                <X size={20} />
              </button>
            </div>
            <CardContent className="p-6 space-y-4 text-sm overflow-y-auto">
              <div className="space-y-1">
                <div className="text-xs text-muted-text uppercase font-semibold">{tUi("admin.leads.field_name", currentLanguage)}</div>
                <div className="text-base font-semibold text-text">{viewingLead.name}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-text uppercase font-semibold">{tUi("admin.leads.field_email", currentLanguage)}</div>
                  <div className="text-text font-medium">{viewingLead.email || '-'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-text uppercase font-semibold">{tUi("admin.leads.field_phone", currentLanguage)}</div>
                  <div className="text-text">{viewingLead.phone || '-'}</div>
                </div>
              </div>

              {/* Properties Section */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="text-xs text-muted-text uppercase font-semibold flex items-center gap-1.5">
                  <Building size={14} className="text-primary" />
                  <span>{tUi("admin.leads.field_property_address", currentLanguage)} ({viewingProperties.length || (viewingLead.property_address ? 1 : 0)})</span>
                </div>

                {viewingProperties.length > 0 ? (
                  <div className="space-y-2">
                    {viewingProperties.map((p, idx) => (
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
                            title="Copy address"
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
                ) : viewingLead.property_address ? (
                  <div className="p-2.5 rounded-lg bg-surface border border-border flex items-center justify-between gap-2">
                    <div className="text-xs text-muted-text flex items-center gap-1 truncate">
                      <MapPin size={12} className="text-primary shrink-0" />
                      <span className="truncate">{viewingLead.property_address}</span>
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(viewingLead.property_address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-muted-text hover:text-primary"
                    >
                      <ExternalLink size={13} />
                    </a>
                  </div>
                ) : (
                  <span className="text-muted-text italic text-xs">-</span>
                )}
              </div>

              {/* Links Section */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="text-xs text-muted-text uppercase font-semibold flex items-center gap-1.5">
                  <Globe size={14} className="text-primary" />
                  <span>{tUi("admin.leads.field_advertisement_link", currentLanguage)} ({viewingLinks.length || (viewingLead.advertisement_link ? 1 : 0)})</span>
                </div>

                {viewingLinks.length > 0 ? (
                  <div className="space-y-2">
                    {viewingLinks.map((l, idx) => (
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
                ) : viewingLead.advertisement_link ? (
                  <div className="p-2.5 rounded-lg bg-surface border border-border flex items-center justify-between gap-2">
                    <a
                      href={viewingLead.advertisement_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium break-all text-xs"
                    >
                      <span>{viewingLead.advertisement_link}</span>
                    </a>
                    <a
                      href={viewingLead.advertisement_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-primary"
                    >
                      <ExternalLink size={13} />
                    </a>
                  </div>
                ) : (
                  <span className="text-muted-text italic text-xs">-</span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
                <div className="space-y-1">
                  <div className="text-xs text-muted-text uppercase font-semibold">{tUi("admin.leads.field_source", currentLanguage)}</div>
                  <div className="text-text">{viewingLead.source || '-'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-text uppercase font-semibold">{tUi("admin.leads.field_owner", currentLanguage)}</div>
                  <div className="text-text">{viewingLead.owner_id || '-'}</div>
                </div>
              </div>

              {viewingLead.notes && (
                <div className="space-y-1 pt-2 border-t border-border">
                  <div className="text-xs text-muted-text uppercase font-semibold">{tUi("admin.leads.field_notes", currentLanguage)}</div>
                  <div className="text-text bg-background/50 p-3 rounded-lg border border-border whitespace-pre-wrap">{viewingLead.notes}</div>
                </div>
              )}
            </CardContent>
            <div className="p-4 border-t border-border flex justify-end gap-2 bg-surface rounded-b-xl">
              <Button variant="secondary" onClick={() => setViewingLead(null)}>
                {tUi("admin.leads.cancel", currentLanguage)}
              </Button>
              <Button onClick={() => { const leadToEdit = viewingLead; setViewingLead(null); handleOpenEdit(leadToEdit); }}>
                <Edit2 size={15} className="mr-1.5" />
                {tUi("admin.leads.edit", currentLanguage)}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && editingLead && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl shadow-lg max-h-[92vh] flex flex-col my-auto border-border">
            <div className="flex justify-between items-center p-6 border-b border-border shrink-0">
              <h3 className="text-xl font-semibold text-text">{editingLead.id ? tUi("admin.leads.modal_title_edit", currentLanguage) : tUi("admin.leads.modal_title_add", currentLanguage)}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-text hover:text-text transition-colors">
                <X size={20} />
              </button>
            </div>
            <CardContent className="p-6 overflow-y-auto space-y-4">
              <form id="lead-form" onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-text">{tUi("admin.leads.field_name", currentLanguage)} <span className="text-red-500">*</span></label>
                  <Input required value={editingLead.name || ''} onChange={(e) => setEditingLead({...editingLead, name: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-text">{tUi("admin.leads.field_email", currentLanguage)}</label>
                    <Input type="email" value={editingLead.email || ''} onChange={(e) => setEditingLead({...editingLead, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-text">{tUi("admin.leads.field_phone", currentLanguage)}</label>
                    <Input type="tel" value={editingLead.phone || ''} onChange={(e) => setEditingLead({...editingLead, phone: e.target.value})} />
                  </div>
                </div>

                {/* Unlimited Properties and Links Manager */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-text">
                    Properties & Listing Links (Unlimited)
                  </label>
                  <ClientPropertyLinksManager
                    properties={leadProperties}
                    links={leadLinks}
                    onChangeProperties={setLeadProperties}
                    onChangeLinks={setLeadLinks}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-text">{tUi("admin.leads.field_stage", currentLanguage)}</label>
                    <select 
                      className="w-full h-[38px] px-3 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      value={editingLead.status || 'new'} 
                      onChange={(e) => setEditingLead({...editingLead, status: e.target.value})}
                    >
                      <option value="new">{tUi("admin.leads.stage_new", currentLanguage)}</option>
                      <option value="contacted">{tUi("admin.leads.stage_contacted", currentLanguage)}</option>
                      <option value="qualified">{tUi("admin.leads.stage_qualified", currentLanguage)}</option>
                      <option value="lost">{tUi("admin.leads.stage_lost", currentLanguage)}</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-text">{tUi("admin.leads.field_source", currentLanguage)}</label>
                    <Input placeholder={tUi("admin.leads.field_source_placeholder", currentLanguage)} value={editingLead.source || ''} onChange={(e) => setEditingLead({...editingLead, source: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-text">{tUi("admin.leads.field_owner", currentLanguage)}</label>
                  <Input placeholder={tUi("admin.leads.field_owner_placeholder", currentLanguage)} value={editingLead.owner_id || ''} onChange={(e) => setEditingLead({...editingLead, owner_id: e.target.value})} />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-text">{tUi("admin.leads.field_notes", currentLanguage)}</label>
                  <textarea 
                    className="w-full h-24 bg-surface border border-border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors text-text" 
                    value={editingLead.notes || ''} 
                    onChange={(e) => setEditingLead({...editingLead, notes: e.target.value})} 
                  />
                </div>
              </form>
            </CardContent>
            <div className="p-6 border-t border-border shrink-0 flex justify-end gap-3 bg-surface rounded-b-xl">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                {tUi("admin.leads.cancel", currentLanguage)}
              </Button>
              <Button form="lead-form" type="submit">
                {tUi("admin.leads.save_lead", currentLanguage)}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
