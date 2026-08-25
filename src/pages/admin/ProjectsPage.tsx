import { useState, useEffect } from "react";
import { useApi } from "../../hooks/useApi";
import { Project, PortfolioItem } from "../../lib/types";
import { PageHeader } from "../../components/admin/PageHeader";
import { AdminListSkeleton } from "../../components/admin/AdminSkeleton";
import { AdminPagination, AdminPaginationMeta } from "../../components/admin/AdminPagination";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ProjectModal } from "../../components/admin/ProjectModal";
import { ProjectTimelineModal } from "../../components/admin/ProjectTimelineModal";
import { useLanguage } from "../../contexts/LanguageContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { cn } from "../../lib/utils";
import { Search, Plus, Trash2, Edit2, FolderKanban, Link as LinkIcon, User, Milestone } from "lucide-react";

export default function ProjectsPage() {
  const { currentLanguage, tUi } = useLanguage();
  usePageTitle(tUi("admin.projects.title", currentLanguage));
  const { fetchApi } = useApi();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<{id: string, email: string}[]>([]);
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Partial<Project> & { portfolio_ids?: string[] } | null>(null);
  const [timelineProject, setTimelineProject] = useState<Project | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<AdminPaginationMeta>({ page: 1, page_size: 25, total: 0, total_pages: 1 });

  useEffect(() => {
    fetchData();
  }, [search, statusFilter, page]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projRes, cliRes, portRes] = await Promise.all([
        fetchApi(`/api/admin/projects?${new URLSearchParams({ search, status: statusFilter, page: String(page), page_size: "25" })}`),
        fetchApi("/api/admin/clients"),
        fetchApi("/api/admin/portfolio")
      ]);
      
      if (projRes.ok) { const body = await projRes.json(); setProjects(body.items || []); setPagination(body.pagination); }
      if (cliRes.ok) setClients(await cliRes.json());
      if (portRes.ok) setPortfolios(await portRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProject = async (projectData: Partial<Project> & { portfolio_ids?: string[] }) => {
    let res;
    if (projectData.id) {
      res = await fetchApi(`/api/admin/projects/${projectData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectData),
      });
    } else {
      res = await fetchApi(`/api/admin/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...projectData, status: projectData.status || "active" }),
      });
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to save project.");
    }

    await fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(tUi("admin.projects.confirm_delete", currentLanguage))) return;
    try {
      await fetchApi(`/api/admin/projects/${id}`, { method: "DELETE" });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
      case 'completed': return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20";
      case 'archived': return "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20";
      default: return "bg-surface text-muted-text border border-border";
    }
  };

  if (loading && projects.length === 0) return <AdminListSkeleton title={tUi("admin.projects.title", currentLanguage)} />;

  const filteredProjects = projects;

  const parsePortfolioDisplay = (titleVal?: string) => {
    if (!titleVal) return "Untitled";
    try {
      const p = JSON.parse(titleVal);
      if (typeof p === "object" && p !== null) {
        return p.en || Object.values(p)[0] || titleVal;
      }
    } catch {}
    return titleVal;
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader title={tUi("admin.projects.title", currentLanguage)} />
        <Button 
          id="new-project-btn"
          onClick={() => { 
            setEditingProject(null); 
            setIsModalOpen(true); 
          }} 
          className="gap-2 shadow-xs"
        >
          <Plus size={16} aria-hidden="true" /> 
          <span>{tUi("admin.projects.new_project", currentLanguage)}</span>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-surface p-4 rounded-xl border border-border">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-text" />
          <Input 
            placeholder={tUi("admin.projects.search_placeholder", currentLanguage)} 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-sm font-medium text-muted-text whitespace-nowrap">{tUi("admin.projects.status_filter_label", currentLanguage)}</label>
          <select 
            className="w-full sm:w-40 h-[38px] px-3 bg-background border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">{tUi("admin.projects.status_all", currentLanguage)}</option>
            <option value="active">{tUi("admin.projects.status_active", currentLanguage)}</option>
            <option value="completed">{tUi("admin.projects.status_completed", currentLanguage)}</option>
            <option value="archived">{tUi("admin.projects.status_archived", currentLanguage)}</option>
          </select>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider">{tUi("admin.projects.th_project", currentLanguage)}</th>
                <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider">{tUi("admin.projects.th_status", currentLanguage)}</th>
                <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider">{tUi("admin.projects.th_client", currentLanguage)}</th>
                <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider">{tUi("admin.projects.th_linked_portfolios", currentLanguage)}</th>
                <th className="p-4 text-xs font-semibold text-muted-text uppercase tracking-wider text-right">{tUi("admin.projects.th_actions", currentLanguage)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProjects.map((project) => (
                <tr key={project.id} className="hover:bg-background/50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-text flex items-center gap-2">
                      <FolderKanban size={16} className="text-primary" />
                      {project.name}
                    </div>
                    {project.description && (
                      <div className="text-sm text-muted-text mt-1 line-clamp-1 max-w-sm">{project.description}</div>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium", getStatusColor(project.status))}>
                      {project.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-sm">
                    {project.client_id ? (
                      <div className="flex items-center gap-2 text-text">
                        <User size={14} className="text-muted-text" />
                        {project.client_email}
                        {project.property_address && <span className="text-xs text-muted-text">· {project.property_address}</span>}
                      </div>
                    ) : (
                      <span className="text-muted-text italic">{tUi("admin.projects.unassigned", currentLanguage)}</span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-muted-text">
                    {project.portfolios && project.portfolios.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {project.portfolios.map(p => (
                          <div key={p.id} className="flex items-center gap-1.5 text-xs bg-background border border-border px-2 py-1 rounded">
                            <LinkIcon size={10} /> {parsePortfolioDisplay(p.title)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                  <td className="p-4 text-right space-x-2 whitespace-nowrap">
                    <Button variant="secondary" size="sm" title="Milestones & project updates" onClick={() => setTimelineProject(project)}>
                      <Milestone size={16} />
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => { 
                      setEditingProject({ ...project, portfolio_ids: project.portfolios?.map(p => p.id) || [] }); 
                      setIsModalOpen(true); 
                    }}>
                      <Edit2 size={16} />
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(project.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-text">
                    {tUi("admin.projects.no_projects_found", currentLanguage)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination meta={pagination} onPageChange={setPage} />
      </div>

      {/* Standard Admin Project Editor Modal */}
      <ProjectModal
        isOpen={isModalOpen}
        project={editingProject}
        clients={clients}
        portfolios={portfolios}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
      />
      <ProjectTimelineModal project={timelineProject} onClose={() => setTimelineProject(null)} />
    </div>
  );
}
