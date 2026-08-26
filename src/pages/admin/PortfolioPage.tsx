import { useState, useEffect, useMemo } from "react";
import { PortfolioItem, Category } from "../../lib/types";
import { PageHeader } from "../../components/admin/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { PortfolioModal } from "../../components/admin/PortfolioModal";
import { PortfolioCategoryModal } from "../../components/admin/PortfolioCategoryModal";
import { AdminGridSkeleton } from "../../components/admin/AdminSkeleton";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useApi } from "../../hooks/useApi";
import { useLanguage } from "../../contexts/LanguageContext";
import { PortfolioGallery } from "../../components/admin/portfolio/PortfolioGallery";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  FolderTree, 
  Layers, 
  Search, 
  FolderPlus,
  Hash,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

function parseCategoryName(val?: string, fallback = "Untitled category"): string {
  if (!val) return fallback;
  try {
    const parsed = JSON.parse(val);
    if (typeof parsed === "object" && parsed !== null) {
      return (
        parsed["en"] ||
        (Object.values(parsed).find((v) => typeof v === "string" && v.trim() !== "") as string) ||
        val
      );
    }
  } catch {}
  return val;
}

export default function PortfolioPage() {
  const { currentLanguage, tUi } = useLanguage();
  usePageTitle(tUi("admin.portfolio.title", currentLanguage));
  const { fetchApi } = useApi();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [activeTab, setActiveTab] = useState<"items" | "categories">("items");
  
  // Portfolio Item Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  
  // Portfolio Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [bannerMessage, setBannerMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [loading, setLoading] = useState(true);
  const [siteLanguages, setSiteLanguages] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, cRes, sRes] = await Promise.all([
        fetchApi("/api/admin/portfolio"),
        fetchApi("/api/admin/categories"),
        fetchApi("/api/admin/settings")
      ]);
      
      if (!pRes.ok) throw new Error(tUi("admin.portfolio.page.fetch_items_failed"));
      if (!cRes.ok) throw new Error(tUi("admin.portfolio.page.fetch_categories_failed"));
      if (!sRes.ok) throw new Error(tUi("admin.portfolio.page.fetch_settings_failed"));
      
      setItems(await pRes.json());
      setCategories(await cRes.json());
      const settings = await sRes.json();
      setSiteLanguages(settings.site_languages || "");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    const q = categorySearch.toLowerCase();
    return categories.filter((c) => {
      const name = parseCategoryName(c.name, tUi("admin.portfolio.untitled_category")).toLowerCase();
      const slug = (c.slug || "").toLowerCase();
      const desc = (c.description || "").toLowerCase();
      return name.includes(q) || slug.includes(q) || desc.includes(q);
    });
  }, [categories, categorySearch]);

  if (loading && items.length === 0) {
    return <AdminGridSkeleton title={tUi("admin.portfolio.title", currentLanguage)} />;
  }

  const handleEditClick = (item: PortfolioItem) => {
    setEditingItem(item);
    setIsItemModalOpen(true);
  };

  const openNewItemModal = () => {
    setEditingItem(null);
    setIsItemModalOpen(true);
  };

  const openNewCategoryModal = () => {
    setEditingCategory(null);
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (cat: Category) => {
    setEditingCategory(cat);
    setIsCategoryModalOpen(true);
  };

  const handleSaveItem = async (formData: any) => {
    const method = editingItem ? "PUT" : "POST";
    const url = editingItem ? `/api/admin/portfolio/${editingItem.id}` : "/api/admin/portfolio";
    
    let processedImages = formData.image_urls;
    if (typeof processedImages === "string") {
      try {
        processedImages = JSON.parse(processedImages);
      } catch {
        processedImages = [];
      }
    }

    const res = await fetchApi(url, {
      method,
      headers: { 
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...formData,
        image_urls: processedImages
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || tUi("admin.portfolio.page.save_item_failed"));
    }

    setIsItemModalOpen(false);
    setEditingItem(null);
    await fetchData();
  };

  const deleteItem = async (id: string) => {
    if (!confirm(tUi("admin.portfolio.confirm_delete_item", currentLanguage))) return;
    try {
      await fetchApi(`/api/admin/portfolio/${id}`, { method: "DELETE" });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReorder = async (reorderedItems: { id: string; sort_order: number }[]) => {
    try {
      await fetchApi("/api/admin/portfolio/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: reorderedItems })
      });
      // Update local state without fetching to avoid flicker
      setItems(prevItems => {
        const itemMap = new Map(prevItems.map(i => [i.id, i]));
        reorderedItems.forEach(ri => {
          if (itemMap.has(ri.id)) {
            itemMap.get(ri.id)!.sort_order = ri.sort_order;
          }
        });
        return [...prevItems].sort((a, b) => a.sort_order - b.sort_order);
      });
    } catch (e) {
      console.error(e);
      fetchData(); // Reset on error
    }
  };

  const handleBulkAction = async (action: string, ids: string[], value?: any) => {
    if (action === "delete" && !confirm(tUi("admin.portfolio.confirm_bulk_delete", currentLanguage, { count: ids.length }))) return;
    
    try {
      await fetchApi("/api/admin/portfolio/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action, value })
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuickSave = async (updatedItem: PortfolioItem) => {
    try {
      let processedImages = updatedItem.image_urls;
      if (typeof processedImages === "string") {
        try {
          processedImages = JSON.parse(processedImages);
        } catch {
          processedImages = [];
        }
      }

      await fetchApi(`/api/admin/portfolio/${updatedItem.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...updatedItem,
          image_urls: processedImages
        })
      });
      // Update local state for immediate feedback
      setItems(prevItems => prevItems.map(i => i.id === updatedItem.id ? updatedItem : i));
    } catch (e) {
      console.error(e);
      fetchData(); // reset on error
    }
  };

  // Category Save Handler for Modal
  const handleSaveCategory = async (categoryData: Partial<Category>) => {
    const isEdit = Boolean(categoryData.id);
    const method = isEdit ? "PUT" : "POST";
    const url = isEdit ? `/api/admin/categories/${categoryData.id}` : "/api/admin/categories";

    const res = await fetchApi(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(categoryData)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || tUi("admin.portfolio.page.save_category_failed"));
    }

    setBannerMessage({
      text: isEdit 
        ? tUi("admin.portfolio.category_saved_success", currentLanguage) 
        : tUi("admin.portfolio.category_created_success", currentLanguage),
      type: "success"
    });
    setTimeout(() => setBannerMessage(null), 4000);

    // Refresh categories & portfolio list
    await fetchData();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm(tUi("admin.portfolio.confirm_delete_category", currentLanguage))) return;
    try {
      const res = await fetchApi(`/api/admin/categories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error(tUi("admin.portfolio.page.delete_category_failed"));
      }
      setBannerMessage({ text: tUi("admin.portfolio.category_deleted_success", currentLanguage), type: "success" });
      setTimeout(() => setBannerMessage(null), 4000);
      fetchData();
    } catch (e) {
      console.error(e);
      setBannerMessage({ text: tUi("admin.portfolio.category_delete_failed", currentLanguage), type: "error" });
      setTimeout(() => setBannerMessage(null), 4000);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader 
        title={tUi("admin.portfolio.title", currentLanguage)} 
        action={
          activeTab === "items" ? (
            <Button onClick={openNewItemModal} id="add-portfolio-item-btn" className="gap-2 shadow-xs">
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>{tUi("admin.portfolio.add_item", currentLanguage)}</span>
            </Button>
          ) : (
            <Button onClick={openNewCategoryModal} id="add-category-btn" className="gap-2 shadow-xs">
              <FolderPlus className="w-4 h-4" aria-hidden="true" />
              <span>{tUi("admin.portfolio.add_category", currentLanguage)}</span>
            </Button>
          )
        }
      />

      {bannerMessage && (
        <div 
          className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2.5 animate-in fade-in duration-150 ${
            bannerMessage.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400"
          }`}
          role="status"
        >
          {bannerMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
          )}
          <span>{bannerMessage.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border space-x-6">
        <button
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "items" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-text hover:text-text hover:border-border"
          }`}
          onClick={() => setActiveTab("items")}
        >
          <span>{tUi("admin.portfolio.tab_items", currentLanguage)}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-surface border border-border text-muted-text font-normal">
            {items.length}
          </span>
        </button>
        <button
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "categories" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-text hover:text-text hover:border-border"
          }`}
          onClick={() => setActiveTab("categories")}
        >
          <span>{tUi("admin.portfolio.tab_categories", currentLanguage)}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-surface border border-border text-muted-text font-normal">
            {categories.length}
          </span>
        </button>
      </div>

      {activeTab === "items" && (
        <>
          <PortfolioGallery 
            items={items}
            categories={categories}
            onEdit={handleEditClick}
            onDelete={deleteItem}
            onReorder={handleReorder}
            onBulkAction={handleBulkAction}
            onQuickSave={handleQuickSave}
          />

          {/* Portfolio Item Modal for Add and Edit */}
          <PortfolioModal
            isOpen={isItemModalOpen}
            item={editingItem}
            categories={categories}
            siteLanguages={siteLanguages}
            onClose={() => {
              setIsItemModalOpen(false);
              setEditingItem(null);
            }}
            onSave={handleSaveItem}
          />
        </>
      )}

      {activeTab === "categories" && (
        <Card className="border-border">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-primary" aria-hidden="true" />
                <span>{tUi("admin.portfolio.categories_title", currentLanguage)}</span>
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {tUi("admin.portfolio.categories_desc", currentLanguage)}
              </CardDescription>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-text" aria-hidden="true" />
                <Input
                  placeholder={tUi("admin.portfolio.search_categories", currentLanguage)}
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <Button
                id="header-add-cat-btn"
                onClick={openNewCategoryModal}
                size="sm"
                className="gap-1.5 shrink-0 shadow-xs"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">{tUi("admin.portfolio.add_category", currentLanguage)}</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {categories.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <FolderPlus className="w-6 h-6" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-text">{tUi("admin.portfolio.no_categories_yet", currentLanguage)}</h3>
                  <p className="text-xs text-muted-text max-w-sm mx-auto">
                    {tUi("admin.portfolio.no_categories_desc", currentLanguage)}
                  </p>
                </div>
                <Button onClick={openNewCategoryModal} size="sm" className="gap-2 shadow-xs">
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>{tUi("admin.portfolio.create_category", currentLanguage)}</span>
                </Button>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="text-center py-10 px-4 text-xs text-muted-text">
                {tUi("admin.portfolio.no_categories_match", currentLanguage, { query: categorySearch })}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface/50 border-y border-border text-xs text-muted-text uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">{tUi("admin.portfolio.th_category_name", currentLanguage)}</th>
                      <th className="py-3 px-4 hidden md:table-cell">{tUi("admin.portfolio.th_slug", currentLanguage)}</th>
                      <th className="py-3 px-4 hidden sm:table-cell">{tUi("admin.portfolio.th_parent", currentLanguage)}</th>
                      <th className="py-3 px-4 text-center">{tUi("admin.portfolio.th_items", currentLanguage)}</th>
                      <th className="py-3 px-4 text-center">{tUi("admin.portfolio.th_sort_order", currentLanguage)}</th>
                      <th className="py-3 px-4 text-right">{tUi("admin.portfolio.th_actions", currentLanguage)}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredCategories.map((cat) => (
                      <tr 
                        key={cat.id} 
                        className="hover:bg-surface/40 transition-colors group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <FolderTree className="w-4 h-4" aria-hidden="true" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-text truncate max-w-[200px] sm:max-w-xs">
                                {parseCategoryName(cat.name, tUi("admin.portfolio.untitled_category"))}
                              </div>
                              {cat.description && (
                                <div className="text-xs text-muted-text truncate max-w-[200px] sm:max-w-xs">
                                  {parseCategoryName(cat.description, tUi("admin.portfolio.untitled_category"))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 hidden md:table-cell text-xs font-mono text-muted-text">
                          <span className="flex items-center gap-1">
                            <LinkIcon className="w-3 h-3 text-muted-text" aria-hidden="true" />
                            {cat.slug || "—"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 hidden sm:table-cell text-xs">
                          {cat.parent_name ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface border border-border text-text font-medium">
                              <Layers className="w-3 h-3 text-primary" aria-hidden="true" />
                              {parseCategoryName(cat.parent_name, tUi("admin.portfolio.untitled_category"))}
                            </span>
                          ) : (
                            <span className="text-muted-text">{tUi("admin.faq_categories.top_level")}</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-surface border border-border text-text">
                            {cat.item_count !== undefined ? cat.item_count : "—"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center text-xs font-mono text-muted-text">
                          <span className="inline-flex items-center gap-0.5">
                            <Hash className="w-3 h-3 text-muted-text" aria-hidden="true" />
                            {cat.sort_order ?? 0}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openEditCategoryModal(cat)}
                              className="h-8 px-2.5 text-xs gap-1.5"
                              title={tUi("common.edit", currentLanguage)}
                            >
                              <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span className="hidden sm:inline">{tUi("common.edit", currentLanguage)}</span>
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => deleteCategory(cat.id)}
                              className="h-8 px-2 text-xs"
                              title={tUi("common.delete", currentLanguage)}
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Portfolio Category Modal for Add / Edit */}
      <PortfolioCategoryModal
        isOpen={isCategoryModalOpen}
        category={editingCategory}
        siteLanguages={siteLanguages}
        allCategories={categories}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        onSave={handleSaveCategory}
      />
    </div>
  );
}
