import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, FileImage, FileVideo, Loader2, UploadCloud, X, XCircle } from "lucide-react";
import { useAuth } from "./AuthContext";
import { uploadMediaFile } from "../lib/uploadHelper";
import { formatItemNumber, GalleryMediaItem, sanitizeNameForFilename } from "../lib/mediaUtils";

type UploadKind = "image" | "video";
type UploadStatus = "queued" | "uploading" | "completed" | "failed";

interface BackgroundUploadTask {
  id: string;
  portfolioId: string;
  portfolioName: string;
  fileName: string;
  kind: UploadKind;
  status: UploadStatus;
  percent: number;
  error?: string;
}

interface EnqueueOptions {
  portfolioId: string;
  portfolioName: string;
  files: File[];
  kind: UploadKind;
  categoryName: string;
  itemType: string;
  startingNumber: number;
}

interface BackgroundUploadContextValue {
  enqueuePortfolioFiles: (options: EnqueueOptions) => Promise<GalleryMediaItem[]>;
  isPortfolioUploading: (portfolioId?: string) => boolean;
}

const BackgroundUploadContext = createContext<BackgroundUploadContextValue | null>(null);

function taskId(): string {
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function BackgroundUploadProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<BackgroundUploadTask[]>([]);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());

  const patchTask = useCallback((id: string, patch: Partial<BackgroundUploadTask>) => {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, ...patch } : task));
  }, []);

  const persistGalleryItem = useCallback(async (portfolioId: string, item: GalleryMediaItem) => {
    const response = await fetch(`/api/admin/portfolio/${encodeURIComponent(portfolioId)}/media`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ item }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || "The uploaded media could not be linked to the gallery.");
    }
  }, [token]);

  const enqueuePortfolioFiles = useCallback((options: EnqueueOptions): Promise<GalleryMediaItem[]> => {
    const queuedTasks = options.files.map((file) => ({
      id: taskId(),
      portfolioId: options.portfolioId,
      portfolioName: options.portfolioName,
      fileName: file.name,
      kind: options.kind,
      status: "queued" as const,
      percent: 0,
    }));
    setTasks((current) => [...current, ...queuedTasks]);

    const runBatch = async (): Promise<GalleryMediaItem[]> => {
      const uploaded: GalleryMediaItem[] = [];
      for (let index = 0; index < options.files.length; index += 1) {
        const file = options.files[index];
        const task = queuedTasks[index];
        const sequence = options.startingNumber + index;
        patchTask(task.id, { status: "uploading", percent: 0 });
        try {
          const result = await uploadMediaFile(file, {
            token,
            projectName: options.portfolioName || "project",
            categoryName: options.categoryName,
            itemNumber: sequence,
            itemType: options.itemType,
            useStructuredName: true,
            onProgress: (percent) => patchTask(task.id, { percent }),
          });
          const item: GalleryMediaItem = options.kind === "video" ? {
            id: `video-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
            url: result.url,
            filename: result.filename,
            thumbnail_url: result.thumbnailUrl || "",
            item_number: formatItemNumber(sequence),
            project_name: sanitizeNameForFilename(options.portfolioName || "project"),
            category_name: options.categoryName,
            item_type: options.itemType as any,
            type: "video",
            title: file.name.replace(/\.[^/.]+$/, ""),
            embed_type: "upload",
          } : {
            id: `img-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
            url: result.url,
            filename: result.filename,
            compressed_url: result.compressedUrl,
            compressed_filename: result.compressedFilename,
            compressed_size: result.compressedSize,
            thumbnail_url: result.thumbnailUrl || result.compressedUrl || "",
            item_number: formatItemNumber(sequence),
            project_name: sanitizeNameForFilename(options.portfolioName || "project"),
            category_name: options.categoryName,
            item_type: options.itemType as any,
            type: "image",
            title: file.name.replace(/\.[^/.]+$/, ""),
          };
          await persistGalleryItem(options.portfolioId, item);
          uploaded.push(item);
          patchTask(task.id, { status: "completed", percent: 100 });
        } catch (error: any) {
          patchTask(task.id, { status: "failed", error: error?.message || "Upload failed" });
          throw error;
        }
      }
      return uploaded;
    };

    const result = queueRef.current.then(runBatch, runBatch);
    queueRef.current = result.catch(() => undefined);
    return result;
  }, [patchTask, persistGalleryItem, token]);

  const activeCount = tasks.filter((task) => task.status === "queued" || task.status === "uploading").length;
  useEffect(() => {
    if (activeCount === 0) return;
    const warnBeforeClose = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeClose);
    return () => window.removeEventListener("beforeunload", warnBeforeClose);
  }, [activeCount]);

  const value = useMemo<BackgroundUploadContextValue>(() => ({
    enqueuePortfolioFiles,
    isPortfolioUploading: (portfolioId) => Boolean(portfolioId) && tasks.some((task) => task.portfolioId === portfolioId && (task.status === "queued" || task.status === "uploading")),
  }), [enqueuePortfolioFiles, tasks]);

  const visibleTasks = tasks.slice(-5);
  return (
    <BackgroundUploadContext.Provider value={value}>
      {children}
      {visibleTasks.length > 0 && (
        <aside className="fixed bottom-4 right-4 z-[100] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-background/95 shadow-2xl backdrop-blur-xl" aria-live="polite">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-bold text-text">
              <UploadCloud className="h-4 w-4 text-primary" />
              Háttérfeltöltések
              {activeCount > 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{activeCount}</span>}
            </div>
            {activeCount === 0 && (
              <button type="button" onClick={() => setTasks([])} className="rounded-lg p-1 text-muted-text hover:bg-surface hover:text-text" aria-label="Feltöltési lista bezárása"><X className="h-4 w-4" /></button>
            )}
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto p-2">
            {visibleTasks.map((task) => (
              <div key={task.id} className="rounded-xl border border-border bg-surface/70 p-3">
                <div className="flex items-center gap-3">
                  {task.status === "uploading" || task.status === "queued" ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" /> : task.status === "completed" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <XCircle className="h-4 w-4 shrink-0 text-red-500" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-text">{task.kind === "video" ? <FileVideo className="h-3.5 w-3.5" /> : <FileImage className="h-3.5 w-3.5" />}<span className="truncate">{task.fileName}</span></div>
                    <div className="mt-0.5 truncate text-[10px] text-muted-text">{task.portfolioName}{task.error ? ` · ${task.error}` : ""}</div>
                  </div>
                  <span className="text-xs font-bold tabular-nums text-primary">{task.status === "queued" ? "Sorban" : `${task.percent}%`}</span>
                </div>
                {(task.status === "uploading" || task.status === "queued") && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-[width]" style={{ width: `${task.percent}%` }} /></div>}
              </div>
            ))}
          </div>
        </aside>
      )}
    </BackgroundUploadContext.Provider>
  );
}

export function useBackgroundUploads(): BackgroundUploadContextValue {
  const context = useContext(BackgroundUploadContext);
  if (!context) throw new Error("useBackgroundUploads must be used inside BackgroundUploadProvider");
  return context;
}
