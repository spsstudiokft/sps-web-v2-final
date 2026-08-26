import { useLanguage } from "../../../contexts/LanguageContext";
import React, { useEffect, useState } from "react";
import { FolderCog, Pencil, Plus, Save, Trash2, X } from "lucide-react";

export interface PaymentRequestCategoryOption {
  id: string;
  name: string;
  sort_order?: number;
}

interface Props {
  isOpen: boolean;
  token: string | null;
  categories: PaymentRequestCategoryOption[];
  onClose: () => void;
  onChanged: () => Promise<void> | void;
  showToast: (message: string, type?: "success" | "error") => void;
}

export function PaymentRequestCategoriesModal({ isOpen, token, categories, onClose, onChanged, showToast }: Props) {
  const { tUi } = useLanguage();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setNewName("");
      setEditingId(null);
      setEditingName("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const request = async (url: string, method: string, body?: unknown) => {
    if (!token) throw new Error("Authentication required");
    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Category operation failed");
    return data;
  };

  const createCategory = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await request("/api/admin/payment-requests/categories", "POST", { name: newName.trim() });
      setNewName("");
      await onChanged();
      showToast("Category created successfully");
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const updateCategory = async () => {
    if (!editingId || !editingName.trim()) return;
    setBusy(true);
    try {
      await request(`/api/admin/payment-requests/categories/${editingId}`, "PUT", { name: editingName.trim() });
      setEditingId(null);
      setEditingName("");
      await onChanged();
      showToast("Category updated successfully");
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const deleteCategory = async (category: PaymentRequestCategoryOption) => {
    if (!confirm(`Delete category “${category.name}”?`)) return;
    setBusy(true);
    try {
      await request(`/api/admin/payment-requests/categories/${category.id}`, "DELETE");
      await onChanged();
      showToast("Category deleted successfully");
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="aero-frost-modal w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><FolderCog className="w-5 h-5" /></div>
            <div><h3 className="text-base font-bold text-text">Payment Request Categories</h3><p className="text-xs text-muted-text">Create, rename, or remove unused categories.</p></div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-muted-text hover:text-text hover:bg-surface-hover"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createCategory()} placeholder="New category name" className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-text text-sm" />
            <button disabled={busy || !newName.trim()} onClick={createCategory} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"><Plus className="w-4 h-4" /> {tUi("admin.pricing.btn_add")}</button>
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center gap-2 p-3 rounded-xl border border-border bg-background/60">
                {editingId === category.id ? (
                  <input autoFocus value={editingName} onChange={(e) => setEditingName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && updateCategory()} className="flex-1 px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text text-sm" />
                ) : (
                  <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-text truncate">{category.name}</div><div className="text-[10px] text-muted-text font-mono">{category.id}</div></div>
                )}
                {editingId === category.id ? (
                  <button disabled={busy} onClick={updateCategory} className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg"><Save className="w-4 h-4" /></button>
                ) : (
                  <button onClick={() => { setEditingId(category.id); setEditingName(category.name); }} className="p-2 text-muted-text hover:text-primary hover:bg-primary/10 rounded-lg"><Pencil className="w-4 h-4" /></button>
                )}
                <button disabled={busy} onClick={() => deleteCategory(category)} className="p-2 text-muted-text hover:text-rose-500 hover:bg-rose-500/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
