import React, { useState } from "react";
import { SocialTreeNode } from "../../lib/types";
import { useLanguage } from "../../contexts/LanguageContext";
import { Button } from "../ui/Button";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface DeleteSocialNodeModalProps {
  isOpen: boolean;
  node: SocialTreeNode | null;
  onClose: () => void;
  onConfirm: (nodeId: string, deleteChildren: boolean) => Promise<void>;
}

export function DeleteSocialNodeModal({
  isOpen,
  node,
  onClose,
  onConfirm,
}: DeleteSocialNodeModalProps) {
  const { currentLanguage, tUi } = useLanguage();
  const [deleteChildren, setDeleteChildren] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !node) return null;

  const hasChildren = Number(node.child_count || 0) > 0;

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      await onConfirm(node.id, deleteChildren);
      onClose();
    } catch (e) {
      console.error("Delete failed:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-background border border-border rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h3 className="text-lg font-bold text-text mb-2">
            {node.type === "group" 
              ? tUi("admin.social.modal_delete_group_title", currentLanguage) || "Delete Group"
              : tUi("admin.social.modal_delete_link_title", currentLanguage) || "Delete Social Link"}
          </h3>

          <p className="text-sm text-muted-text mb-4">
            {tUi("admin.social.modal_delete_desc", { name: node.title }, currentLanguage) || `Are you sure you want to delete "${node.title}"? This action cannot be undone.`}
          </p>

          {hasChildren && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-4 space-y-2">
              <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {tUi("admin.social.group_has_children_warning", { count: node.child_count || 0 }, currentLanguage) || `This group contains ${node.child_count} nested link(s).`}
                </span>
              </div>
              <div className="space-y-1.5 pt-1">
                <label className="flex items-center gap-2 text-xs text-text cursor-pointer">
                  <input
                    type="radio"
                    name="deleteChoice"
                    checked={deleteChildren}
                    onChange={() => setDeleteChildren(true)}
                    className="text-primary accent-primary"
                  />
                  <span>{tUi("admin.social.delete_all_children", currentLanguage) || "Delete group and all its nested links"}</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-text cursor-pointer">
                  <input
                    type="radio"
                    name="deleteChoice"
                    checked={!deleteChildren}
                    onChange={() => setDeleteChildren(false)}
                    className="text-primary accent-primary"
                  />
                  <span>{tUi("admin.social.move_children_to_root", currentLanguage) || "Keep links and move them to root level"}</span>
                </label>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isDeleting}
              className="rounded-2xl"
            >
              {tUi("common.cancel", currentLanguage) || "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="rounded-2xl bg-red-600 hover:bg-red-700 text-white min-w-28"
            >
              {isDeleting ? tUi("common.deleting", currentLanguage) || "Deleting..." : tUi("common.delete", currentLanguage) || "Delete"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
