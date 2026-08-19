import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Plus, Save, Trash2 } from "lucide-react";
import { PageHeader } from "../../components/admin/PageHeader";
import { TranslatableInput } from "../../components/admin/TranslatableInput";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { useApi } from "../../hooks/useApi";
import { useLanguage } from "../../contexts/LanguageContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { SiteSettings } from "../../lib/types";
import {
  DEFAULT_VISUAL_IDEAS_DESCRIPTION,
  DEFAULT_VISUAL_IDEAS_TITLE,
  MAX_VISUAL_IDEAS,
  parseVisualIdeas,
  VisualIdeaItem,
} from "../../lib/visualIdeas";

export default function VisualIdeasPage() {
  const { fetchApi } = useApi();
  const { tUi } = useLanguage();
  const [settings, setSettings] = useState<SiteSettings>({});
  const [items, setItems] = useState<VisualIdeaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  usePageTitle(tUi("admin.visual_ideas.title") || "Ingatlanvizuál ötletek", "Admin");

  useEffect(() => {
    fetchApi("/api/admin/settings")
      .then(async (response) => {
        if (!response.ok) throw new Error(`Settings request failed (${response.status})`);
        return response.json();
      })
      .then((data: SiteSettings) => {
        setSettings({
          ...data,
          visual_ideas_title: data.visual_ideas_title || DEFAULT_VISUAL_IDEAS_TITLE,
          visual_ideas_description: data.visual_ideas_description || DEFAULT_VISUAL_IDEAS_DESCRIPTION,
          visual_ideas_enabled: data.visual_ideas_enabled ?? "1",
        });
        setItems(parseVisualIdeas(data.visual_ideas_items));
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Failed to load settings"))
      .finally(() => setLoading(false));
  }, [fetchApi]);

  const updateItem = (index: number, patch: Partial<VisualIdeaItem>) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    setItems((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const addItem = () => {
    if (items.length >= MAX_VISUAL_IDEAS) return;
    setItems((current) => [...current, {
      id: `visual-idea-${Date.now()}`,
      title: "{}",
      description: "{}",
      is_visible: true,
    }]);
  };

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetchApi("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visual_ideas_title: settings.visual_ideas_title || DEFAULT_VISUAL_IDEAS_TITLE,
          visual_ideas_description: settings.visual_ideas_description || DEFAULT_VISUAL_IDEAS_DESCRIPTION,
          visual_ideas_enabled: settings.visual_ideas_enabled === "0" ? "0" : "1",
          visual_ideas_items: JSON.stringify(items.slice(0, MAX_VISUAL_IDEAS)),
        }),
      });
      if (!response.ok) throw new Error(`Save failed (${response.status})`);
      setMessage(tUi("admin.visual_ideas.saved") || "A szekció mentése sikerült.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save section");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex min-h-80 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  const siteLanguages = settings.site_languages || JSON.stringify([{ code: "hu", name: "Magyar" }, { code: "en", name: "English" }]);
  const enabled = settings.visual_ideas_enabled !== "0";

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <PageHeader
        title={tUi("admin.visual_ideas.title") || "Ingatlanvizuál ötletek"}
        description={tUi("admin.visual_ideas.subtitle") || "A publikus, árak előtti szöveges kártyaszekció kezelése. Legfeljebb 15 kártya jelenhet meg."}
        action={<Button onClick={save} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? (tUi("admin.visual_ideas.saving") || "Mentés…") : (tUi("admin.visual_ideas.save") || "Változtatások mentése")}</Button>}
      />

      {message && <div className="mb-6 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-medium text-text">{message}</div>}

      <Card className="mb-6">
        <CardContent className="space-y-6 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-text">{tUi("admin.visual_ideas.section_settings") || "Szekcióbeállítások"}</h2>
              <p className="mt-1 text-sm text-muted-text">{tUi("admin.visual_ideas.section_settings_desc") || "A szekció nem kerül be a publikus navigációba."}</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings((current) => ({ ...current, visual_ideas_enabled: enabled ? "0" : "1" }))}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold ${enabled ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-border bg-surface text-muted-text"}`}
            >
              {enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {enabled ? (tUi("admin.visual_ideas.visible") || "Látható") : (tUi("admin.visual_ideas.hidden") || "Elrejtve")}
            </button>
          </div>
          <TranslatableInput label={tUi("admin.visual_ideas.section_title") || "Szekció címe"} value={settings.visual_ideas_title} onChange={(value) => setSettings((current) => ({ ...current, visual_ideas_title: value }))} siteLanguages={siteLanguages} />
          <TranslatableInput label={tUi("admin.visual_ideas.section_description") || "Szekció bevezetője"} value={settings.visual_ideas_description} onChange={(value) => setSettings((current) => ({ ...current, visual_ideas_description: value }))} siteLanguages={siteLanguages} isTextarea />
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-text">{tUi("admin.visual_ideas.cards") || "Kártyák"}</h2>
          <p className="text-sm text-muted-text">{items.length} / {MAX_VISUAL_IDEAS}</p>
        </div>
        <Button variant="secondary" onClick={addItem} disabled={items.length >= MAX_VISUAL_IDEAS}><Plus className="mr-2 h-4 w-4" />{tUi("admin.visual_ideas.add_card") || "Új kártya"}</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {items.map((item, index) => (
          <Card key={item.id}>
            <CardContent className="space-y-5 p-5">
              <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
                <button
                  type="button"
                  onClick={() => updateItem(index, { is_visible: item.is_visible === false })}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${item.is_visible === false ? "border-border bg-surface text-muted-text" : "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}
                >
                  {item.is_visible === false ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {tUi("admin.visual_ideas.card") || "Kártya"} {index + 1}
                </button>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0} className="rounded-lg p-2 text-muted-text hover:bg-surface hover:text-text disabled:opacity-25" aria-label="Move up"><ChevronUp className="h-4 w-4" /></button>
                  <button type="button" onClick={() => moveItem(index, 1)} disabled={index === items.length - 1} className="rounded-lg p-2 text-muted-text hover:bg-surface hover:text-text disabled:opacity-25" aria-label="Move down"><ChevronDown className="h-4 w-4" /></button>
                  <button type="button" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg p-2 text-red-500 hover:bg-red-500/10" aria-label="Delete card"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <TranslatableInput label={tUi("admin.visual_ideas.card_title") || "Kártya címe"} value={item.title} onChange={(value) => updateItem(index, { title: value })} siteLanguages={siteLanguages} />
              <TranslatableInput label={tUi("admin.visual_ideas.card_description") || "Kártya leírása"} value={item.description} onChange={(value) => updateItem(index, { description: value })} siteLanguages={siteLanguages} isTextarea />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
