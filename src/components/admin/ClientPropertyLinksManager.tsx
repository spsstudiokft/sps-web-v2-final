import React, { useState, useEffect } from "react";
import { ClientProperty, ClientLink } from "../../lib/types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { cn } from "../../lib/utils";
import { 
  Building, 
  MapPin, 
  Globe, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  ExternalLink, 
  Copy, 
  Check, 
  AlertCircle,
  Link2,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export interface ClientPropertyLinksManagerProps {
  properties: Partial<ClientProperty>[];
  links: Partial<ClientLink>[];
  onChangeProperties?: (properties: Partial<ClientProperty>[]) => void;
  onChangeLinks?: (links: Partial<ClientLink>[]) => void;
  readOnly?: boolean;
  className?: string;
  defaultExpanded?: boolean;
}

export function ClientPropertyLinksManager({
  properties,
  links,
  onChangeProperties,
  onChangeLinks,
  readOnly = false,
  className = "",
  defaultExpanded = true
}: ClientPropertyLinksManagerProps) {
  const [activeTab, setActiveTab] = useState<"properties" | "links">("properties");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [urlErrors, setUrlErrors] = useState<Record<string, string>>({});
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const isValidUrl = (url: string): boolean => {
    if (!url) return false;
    const trimmed = url.trim();
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return false;
    try {
      new URL(trimmed);
      return true;
    } catch {
      return false;
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Property Handlers
  const handleAddProperty = () => {
    if (!onChangeProperties) return;
    const newIdx = properties.length + 1;
    const newProp: Partial<ClientProperty> = {
      id: crypto.randomUUID(),
      property_name: `Property ${newIdx}`,
      address: "",
      sort_order: properties.length
    };
    onChangeProperties([...properties, newProp]);
  };

  const handleUpdateProperty = (index: number, field: keyof ClientProperty, value: any) => {
    if (!onChangeProperties) return;
    const next = [...properties];
    next[index] = { ...next[index], [field]: value };
    onChangeProperties(next);
  };

  const handleRemoveProperty = (index: number) => {
    if (!onChangeProperties) return;
    const next = properties.filter((_, i) => i !== index);
    onChangeProperties(next);
  };

  const handleMoveProperty = (index: number, direction: "up" | "down") => {
    if (!onChangeProperties) return;
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= properties.length) return;
    const next = [...properties];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    onChangeProperties(next);
  };

  // Link Handlers
  const handleAddLink = () => {
    if (!onChangeLinks) return;
    const newIdx = links.length + 1;
    const newLink: Partial<ClientLink> = {
      id: crypto.randomUUID(),
      label: `Listing Link ${newIdx}`,
      url: "",
      sort_order: links.length
    };
    onChangeLinks([...links, newLink]);
  };

  const handleUpdateLink = (index: number, field: keyof ClientLink, value: any) => {
    if (!onChangeLinks) return;
    const next = [...links];
    next[index] = { ...next[index], [field]: value };

    if (field === "url") {
      const linkId = next[index].id || String(index);
      if (value && !isValidUrl(value)) {
        setUrlErrors(prev => ({ ...prev, [linkId]: "Must start with http:// or https://" }));
      } else {
        setUrlErrors(prev => {
          const updated = { ...prev };
          delete updated[linkId];
          return updated;
        });
      }
    }

    onChangeLinks(next);
  };

  const handleRemoveLink = (index: number) => {
    if (!onChangeLinks) return;
    const next = links.filter((_, i) => i !== index);
    onChangeLinks(next);
  };

  const handleMoveLink = (index: number, direction: "up" | "down") => {
    if (!onChangeLinks) return;
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= links.length) return;
    const next = [...links];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    onChangeLinks(next);
  };

  return (
    <div className={cn("rounded-xl border border-border bg-surface/70 overflow-hidden", className)}>
      {/* Header with Tabs */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("properties")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              activeTab === "properties"
                ? "bg-surface text-primary shadow-xs border border-border"
                : "text-muted-text hover:text-text"
            )}
          >
            <Building size={14} />
            <span>Properties</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-primary/10 text-primary text-[11px] font-mono">
              {properties.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("links")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              activeTab === "links"
                ? "bg-surface text-primary shadow-xs border border-border"
                : "text-muted-text hover:text-text"
            )}
          >
            <Globe size={14} />
            <span>Listing Links</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-primary/10 text-primary text-[11px] font-mono">
              {links.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={activeTab === "properties" ? handleAddProperty : handleAddLink}
              className="text-xs h-7 gap-1"
            >
              <Plus size={13} />
              <span>{activeTab === "properties" ? "Add Property" : "Add Link"}</span>
            </Button>
          )}
          
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-muted-text hover:text-text transition-colors rounded-md"
            title={isExpanded ? "Collapse section" : "Expand section"}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3.5 space-y-3">
          {activeTab === "properties" && (
            <div className="space-y-2.5">
              {properties.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-border rounded-xl text-xs text-muted-text space-y-2">
                  <MapPin size={22} className="mx-auto text-muted-text/60" />
                  <p>No registered property addresses yet.</p>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAddProperty}
                      className="text-xs gap-1.5 mt-1"
                    >
                      <Plus size={13} />
                      <span>Add First Property</span>
                    </Button>
                  )}
                </div>
              ) : (
                properties.map((prop, idx) => (
                  <div
                    key={prop.id || idx}
                    className="p-3 rounded-xl bg-background border border-border/80 space-y-2 relative group hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-text">
                          #{idx + 1}
                        </span>
                        {readOnly ? (
                          <span className="text-xs font-semibold text-text">
                            {prop.property_name || `Property ${idx + 1}`}
                          </span>
                        ) : (
                          <input
                            type="text"
                            value={prop.property_name || ""}
                            onChange={(e) => handleUpdateProperty(idx, "property_name", e.target.value)}
                            placeholder={`Property ${idx + 1}`}
                            className="text-xs font-medium bg-transparent border-b border-border/50 focus:border-primary focus:outline-none px-1 py-0.5 text-text flex-1"
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {prop.address && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleCopy(prop.address || "", prop.id || String(idx))}
                              className="p-1 rounded text-muted-text hover:text-text hover:bg-muted/40 transition-colors"
                              title="Copy address"
                            >
                              {copiedId === (prop.id || String(idx)) ? (
                                <Check size={13} className="text-emerald-500" />
                              ) : (
                                <Copy size={13} />
                              )}
                            </button>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(prop.address || "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded text-muted-text hover:text-primary hover:bg-muted/40 transition-colors"
                              title="View on Google Maps"
                            >
                              <ExternalLink size={13} />
                            </a>
                          </>
                        )}

                        {!readOnly && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleMoveProperty(idx, "up")}
                              disabled={idx === 0}
                              className="p-1 rounded text-muted-text hover:text-text disabled:opacity-30"
                              title="Move Up"
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveProperty(idx, "down")}
                              disabled={idx === properties.length - 1}
                              className="p-1 rounded text-muted-text hover:text-text disabled:opacity-30"
                              title="Move Down"
                            >
                              <ArrowDown size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveProperty(idx)}
                              className="p-1 rounded text-muted-text hover:text-rose-500 hover:bg-rose-500/10 transition-colors ml-1"
                              title="Delete Property"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {readOnly ? (
                      <p className="text-xs text-muted-text flex items-center gap-1.5 pl-1">
                        <MapPin size={13} className="text-primary shrink-0" />
                        <span>{prop.address || "No address provided"}</span>
                      </p>
                    ) : (
                      <div className="relative">
                        <Input
                          type="text"
                          value={prop.address || ""}
                          onChange={(e) => handleUpdateProperty(idx, "address", e.target.value)}
                          placeholder="e.g. 124 Ocean Drive, Miami, FL 33139"
                          className="text-xs pl-7"
                        />
                        <MapPin size={13} className="absolute left-2.5 top-2.5 text-muted-text pointer-events-none" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "links" && (
            <div className="space-y-2.5">
              {links.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-border rounded-xl text-xs text-muted-text space-y-2">
                  <Globe size={22} className="mx-auto text-muted-text/60" />
                  <p>No advertisement, MLS, or listing links registered.</p>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAddLink}
                      className="text-xs gap-1.5 mt-1"
                    >
                      <Plus size={13} />
                      <span>Add First Link</span>
                    </Button>
                  )}
                </div>
              ) : (
                links.map((lnk, idx) => {
                  const linkId = lnk.id || String(idx);
                  const err = urlErrors[linkId];
                  return (
                    <div
                      key={linkId}
                      className="p-3 rounded-xl bg-background border border-border/80 space-y-2 relative group hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-text">
                            #{idx + 1}
                          </span>
                          {readOnly ? (
                            <span className="text-xs font-semibold text-text">
                              {lnk.label || `Listing Link ${idx + 1}`}
                            </span>
                          ) : (
                            <input
                              type="text"
                              value={lnk.label || ""}
                              onChange={(e) => handleUpdateLink(idx, "label", e.target.value)}
                              placeholder={`Listing Link ${idx + 1}`}
                              className="text-xs font-medium bg-transparent border-b border-border/50 focus:border-primary focus:outline-none px-1 py-0.5 text-text flex-1"
                            />
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {lnk.url && isValidUrl(lnk.url) && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCopy(lnk.url || "", linkId)}
                                className="p-1 rounded text-muted-text hover:text-text hover:bg-muted/40 transition-colors"
                                title="Copy link"
                              >
                                {copiedId === linkId ? (
                                  <Check size={13} className="text-emerald-500" />
                                ) : (
                                  <Copy size={13} />
                                )}
                              </button>
                              <a
                                href={lnk.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded text-primary hover:bg-muted/40 transition-colors flex items-center gap-0.5 text-xs font-medium"
                                title="Test link in new tab"
                              >
                                <ExternalLink size={13} />
                              </a>
                            </>
                          )}

                          {!readOnly && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleMoveLink(idx, "up")}
                                disabled={idx === 0}
                                className="p-1 rounded text-muted-text hover:text-text disabled:opacity-30"
                                title="Move Up"
                              >
                                <ArrowUp size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveLink(idx, "down")}
                                disabled={idx === links.length - 1}
                                className="p-1 rounded text-muted-text hover:text-text disabled:opacity-30"
                                title="Move Down"
                              >
                                <ArrowDown size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveLink(idx)}
                                className="p-1 rounded text-muted-text hover:text-rose-500 hover:bg-rose-500/10 transition-colors ml-1"
                                title="Delete Link"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {readOnly ? (
                        <p className="text-xs text-primary truncate flex items-center gap-1.5 pl-1">
                          <Link2 size={13} className="text-muted-text shrink-0" />
                          <a href={lnk.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {lnk.url}
                          </a>
                        </p>
                      ) : (
                        <div>
                          <div className="relative">
                            <Input
                              type="url"
                              value={lnk.url || ""}
                              onChange={(e) => handleUpdateLink(idx, "url", e.target.value)}
                              placeholder="https://realtor.com/listing/124-ocean-dr"
                              className={cn("text-xs pl-7", err && "border-rose-500 focus:ring-rose-500")}
                            />
                            <Link2 size={13} className="absolute left-2.5 top-2.5 text-muted-text pointer-events-none" />
                          </div>
                          {err && (
                            <p className="text-[11px] text-rose-500 flex items-center gap-1 mt-1 pl-1">
                              <AlertCircle size={11} />
                              <span>{err}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
