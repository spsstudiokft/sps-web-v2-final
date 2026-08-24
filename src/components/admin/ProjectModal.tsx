import React, { useState, useEffect, useMemo } from "react";
import { Project, PortfolioItem } from "../../lib/types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { KeywordTagInput } from "./KeywordTagInput";
import { 
  X, 
  FolderKanban, 
  User, 
  Link as LinkIcon, 
  AlertCircle, 
  Check, 
  Loader2, 
  Search,
  CheckSquare,
  Square,
  Sparkles,
  Info,
  Mail,
  Send
} from "lucide-react";
import { useApi } from "../../hooks/useApi";

interface ProjectModalProps {
  isOpen: boolean;
  project: (Partial<Project> & { portfolio_ids?: string[] }) | null;
  clients: { id: string; email: string }[];
  portfolios: PortfolioItem[];
  onClose: () => void;
  onSave: (projectData: Partial<Project> & { portfolio_ids?: string[]; new_property?: { property_name?: string; address: string; city?: string; postal_code?: string } }) => Promise<void>;
}

function parsePortfolioTitle(val: string | undefined): string {
  if (!val) return "Untitled Gallery";
  try {
    const parsed = JSON.parse(val);
    if (typeof parsed === "object" && parsed !== null) {
      return (
        parsed["en"] ||
        (Object.values(parsed).find((v) => typeof v === "string" && v.trim() !== "") as string) ||
        val
      );
    }
  } catch {
    return val;
  }
  return val;
}

export function ProjectModal({
  isOpen,
  project,
  clients,
  portfolios,
  onClose,
  onSave,
}: ProjectModalProps) {
  const [formData, setFormData] = useState<Partial<Project> & { portfolio_ids?: string[] }>({
    name: "",
    description: "",
    status: "active",
    client_id: null,
    property_id: null,
    keywords: "",
    portfolio_ids: [],
  });

  const { fetchApi } = useApi();
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [portfolioSearch, setPortfolioSearch] = useState("");
  const [clientProperties, setClientProperties] = useState<Array<{ id: string; property_name?: string; address: string }>>([]);
  const [createProperty, setCreateProperty] = useState(false);
  const [newProperty, setNewProperty] = useState({ property_name: "", address: "", city: "", postal_code: "" });
  const [notifyingClient, setNotifyingClient] = useState(false);
  const [notifySuccess, setNotifySuccess] = useState<string | null>(null);

  const handleNotifyClient = async () => {
    if (!formData.id || !formData.client_id) return;
    try {
      setNotifyingClient(true);
      setNotifySuccess(null);
      const res = await fetchApi(`/api/admin/projects/${formData.id}/notify-client`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customMessage: formData.description || `Status updated to ${formData.status}. Deliverables are ready for viewing.`
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Failed to dispatch email to client.");
      } else {
        setNotifySuccess(data.reviewCampaignScheduled
          ? "Gallery delivery email sent. Google review reminders are now scheduled."
          : "Status update email successfully sent to client!");
        setTimeout(() => setNotifySuccess(null), 4000);
      }
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to notify client");
    } finally {
      setNotifyingClient(false);
    }
  };

  // Sync state when modal opens or active project changes
  useEffect(() => {
    if (isOpen) {
      if (project) {
        setFormData({
          id: project.id,
          name: project.name || "",
          description: project.description || "",
          status: project.status || "active",
          client_id: project.client_id || null,
          property_id: project.property_id || null,
          keywords: project.keywords || "",
          portfolio_ids: project.portfolio_ids || project.portfolios?.map((p) => p.id) || [],
        });
      } else {
        setFormData({
          name: "",
          description: "",
          status: "active",
          client_id: null,
          property_id: null,
          keywords: "",
          portfolio_ids: [],
        });
      }
      setErrorMessage("");
      setCreateProperty(false); setNewProperty({ property_name: "", address: "", city: "", postal_code: "" });
      setPortfolioSearch("");
    }
  }, [isOpen, project]);

  useEffect(() => {
    if (!formData.client_id) { setClientProperties([]); return; }
    void fetchApi(`/api/admin/clients/${formData.client_id}/properties`)
      .then((res) => res.ok ? res.json() : [])
      .then((rows) => setClientProperties(Array.isArray(rows) ? rows : []))
      .catch(() => setClientProperties([]));
  }, [formData.client_id, fetchApi]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const filteredPortfolios = useMemo(() => {
    if (!portfolioSearch.trim()) return portfolios;
    const q = portfolioSearch.toLowerCase();
    return portfolios.filter((p) => {
      const title = parsePortfolioTitle(p.title).toLowerCase();
      const cat = (p.category_name || "").toLowerCase();
      return title.includes(q) || cat.includes(q);
    });
  }, [portfolios, portfolioSearch]);

  if (!isOpen) return null;

  const isEditing = Boolean(formData.id);

  const togglePortfolioSelection = (id: string) => {
    const current = formData.portfolio_ids || [];
    const next = current.includes(id)
      ? current.filter((p) => p !== id)
      : [...current, id];
    setFormData((prev) => ({ ...prev, portfolio_ids: next }));
  };

  const handleSelectAllFiltered = () => {
    const current = new Set(formData.portfolio_ids || []);
    filteredPortfolios.forEach((p) => current.add(p.id));
    setFormData((prev) => ({ ...prev, portfolio_ids: Array.from(current) }));
  };

  const handleDeselectAllFiltered = () => {
    const toRemove = new Set(filteredPortfolios.map((p) => p.id));
    const next = (formData.portfolio_ids || []).filter((id) => !toRemove.has(id));
    setFormData((prev) => ({ ...prev, portfolio_ids: next }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!formData.name || formData.name.trim() === "") {
      setErrorMessage("Please enter a project name.");
      return;
    }

    try {
      setSaving(true);
      await onSave({
        ...formData,
        name: formData.name.trim(),
        description: formData.description?.trim() || "",
        status: formData.status || "active",
        new_property: createProperty ? newProperty : undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save project. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = (formData.portfolio_ids || []).length;

  return (
    <div
      id="project-editor-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="project-modal-title"
    >
      <div
        id="project-editor-modal-dialog"
        className="bg-background border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-border bg-surface/50 shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
              <FolderKanban className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="project-modal-title" className="text-lg font-bold text-text tracking-tight leading-snug">
                {isEditing ? "Edit Project" : "New Project"}
              </h2>
              <p className="text-xs text-muted-text">
                {isEditing
                  ? "Update client assignment, status, and linked portfolio galleries."
                  : "Create a client project workspace and attach showcase galleries."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-muted-text hover:text-text hover:bg-surface rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form
          id="project-editor-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-5"
        >
          {errorMessage && (
            <div
              className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm animate-in fade-in duration-150"
              role="alert"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {notifySuccess && (
            <div
              className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm animate-in fade-in duration-150"
              role="status"
            >
              <Check className="w-5 h-5 shrink-0" aria-hidden="true" />
              <div className="flex-1 font-medium">{notifySuccess}</div>
            </div>
          )}

          {/* Project Name */}
          <div className="space-y-1.5">
            <Label htmlFor="project-name-input" className="text-sm font-semibold text-text">
              Project Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="project-name-input"
              required
              placeholder="e.g. 742 Evergreen Terrace Photo & Virtual Tour"
              value={formData.name || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>

          {/* Status and Client Assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="project-status-select" className="text-sm font-semibold text-text">
                Project Status
              </Label>
              <select
                id="project-status-select"
                className="w-full px-3.5 py-2.5 border border-border bg-surface text-text rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none sm:text-sm transition-all"
                value={formData.status || "active"}
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as any }))}
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="project-client-select" className="text-sm font-semibold text-text">
                Linked Client
              </Label>
              <div className="relative">
                <select
                  id="project-client-select"
                  className="w-full px-3.5 py-2.5 border border-border bg-surface text-text rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none sm:text-sm transition-all"
                  value={formData.client_id || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      client_id: e.target.value ? e.target.value : null,
                      property_id: null,
                    }))
                  }
                >
                  <option value="">-- Select Client --</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-property-select" className="text-sm font-semibold text-text">Linked Property <span className="text-muted-text font-normal">(optional)</span></Label>
              <select id="project-property-select" disabled={!formData.client_id} className="w-full px-3.5 py-2.5 border border-border bg-surface text-text rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none sm:text-sm transition-all disabled:opacity-60" value={formData.property_id || ""} onChange={(e) => setFormData((prev) => ({ ...prev, property_id: e.target.value || null }))}>
                <option value="">-- No Property Linked --</option>
                {clientProperties.map((property) => <option key={property.id} value={property.id}>{property.property_name || property.address}{property.property_name ? ` · ${property.address}` : ""}</option>)}
              </select>
              {!isEditing && <button type="button" disabled={!formData.client_id} onClick={() => { setCreateProperty(value => !value); setFormData(prev => ({ ...prev, property_id: null })); }} className="mt-2 text-xs font-semibold text-primary hover:underline disabled:opacity-50">{createProperty ? "Meglévő Property kiválasztása" : "Új Property létrehozása ebből a projektből"}</button>}
            </div>
          </div>
          {createProperty && <div className="grid grid-cols-1 gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:grid-cols-2"><div className="sm:col-span-2 text-sm font-semibold text-text">Új Property adatai</div><Input placeholder="Ingatlan neve" value={newProperty.property_name} onChange={e => setNewProperty(value => ({ ...value, property_name: e.target.value }))} /><Input required placeholder="Cím *" value={newProperty.address} onChange={e => setNewProperty(value => ({ ...value, address: e.target.value }))} /><Input placeholder="Város" value={newProperty.city} onChange={e => setNewProperty(value => ({ ...value, city: e.target.value }))} /><Input placeholder="Irányítószám" value={newProperty.postal_code} onChange={e => setNewProperty(value => ({ ...value, postal_code: e.target.value }))} /><p className="sm:col-span-2 text-xs text-muted-text">Azonos aktív cím esetén a rendszer a mentés előtt figyelmeztet.</p></div>}

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="project-description-input" className="text-sm font-semibold text-text">
              Description & Notes
            </Label>
            <textarea
              id="project-description-input"
              rows={3}
              placeholder="Add internal notes, client deliverables, shoot location, or delivery timelines..."
              className="w-full px-3.5 py-2.5 border border-border bg-surface text-text rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none sm:text-sm transition-all resize-y"
              value={formData.description || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>

          {/* SEO Keywords */}
          <div className="space-y-1.5">
            <KeywordTagInput
              label="Project SEO Keywords"
              description="Target keywords for this specific project or client showcase."
              keywords={formData.keywords || ""}
              onChange={(val) => setFormData((prev) => ({ ...prev, keywords: val }))}
              placeholder="Add keyword (e.g. luxury estate, aerial drone, 3D tour)..."
            />
          </div>

          {/* Linked Portfolios */}
          <div className="space-y-2.5 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-semibold text-text">Link Portfolio Galleries</Label>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                  {selectedCount} Selected
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="text-primary hover:underline font-medium"
                >
                  Select All
                </button>
                <span className="text-border">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAllFiltered}
                  className="text-muted-text hover:text-text font-medium"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            {/* Portfolio search */}
            {portfolios.length > 5 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-text" />
                <Input
                  placeholder="Filter portfolio items..."
                  value={portfolioSearch}
                  onChange={(e) => setPortfolioSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            )}

            <div className="max-h-48 overflow-y-auto border border-border rounded-xl divide-y divide-border bg-surface">
              {filteredPortfolios.map((portfolio) => {
                const isSelected = (formData.portfolio_ids || []).includes(portfolio.id);
                return (
                  <label
                    key={portfolio.id}
                    className={`flex items-center gap-3 p-3 transition-colors cursor-pointer select-none ${
                      isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-background"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                      checked={isSelected}
                      onChange={() => togglePortfolioSelection(portfolio.id)}
                    />
                    <div className="flex-1 min-w-0 flex flex-col">
                      <span className={`text-sm font-medium truncate ${isSelected ? "text-primary font-semibold" : "text-text"}`}>
                        {parsePortfolioTitle(portfolio.title)}
                      </span>
                      {portfolio.category_name && (
                        <span className="text-xs text-muted-text truncate">{portfolio.category_name}</span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    )}
                  </label>
                );
              })}
              {filteredPortfolios.length === 0 && (
                <div className="p-6 text-center text-xs text-muted-text">
                  {portfolios.length === 0
                    ? "No portfolio galleries have been created yet."
                    : "No portfolio items match your filter."}
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-border bg-surface/50 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isEditing && formData.client_id && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleNotifyClient}
                disabled={notifyingClient || saving}
                className="text-xs flex items-center gap-1.5 w-full sm:w-auto"
                title={formData.status === "completed" ? "Send gallery delivery email and schedule Google review requests" : "Send branded email notification with project status to the assigned client"}
              >
                {notifyingClient ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending Email...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5 text-primary" />
                    <span>{formData.status === "completed" ? "Send Gallery & Schedule Review" : "Email Client Update"}</span>
                  </>
                )}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={saving}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="project-editor-form"
              disabled={saving}
              className="flex-1 sm:flex-none"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" aria-hidden="true" />
                  {isEditing ? "Save Changes" : "Create Project"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
