import { useState } from "react";
import { SiteSettings, PageSeoMeta } from "../../lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/Card";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { KeywordTagInput } from "./KeywordTagInput";
import { useLanguage } from "../../contexts/LanguageContext";
import { Globe, FileText, Sparkles } from "lucide-react";

interface SeoSettingsManagerProps {
  settings: SiteSettings;
  onChange: (key: keyof SiteSettings, value: string) => void;
}

export function SeoSettingsManager({ settings, onChange }: SeoSettingsManagerProps) {
  const { tUi } = useLanguage();
  const [selectedPageKey, setSelectedPageKey] = useState<string>("home");

  const SITE_PAGES = [
    { key: "home", label: tUi("nav.home", undefined, "Home Page"), defaultTitle: "Home | Premier Real Estate Media", defaultDesc: "Welcome to SPS Studio. Leading real estate photography & video tours." },
    { key: "portfolio", label: tUi("nav.portfolio", undefined, "Portfolio Page"), defaultTitle: "Portfolio | Real Estate Showcases", defaultDesc: "Explore our photography portfolio showcasing stunning residential and commercial properties." },
    { key: "about", label: tUi("nav.about", undefined, "About Page"), defaultTitle: "About Us | Professional Photographers", defaultDesc: "Learn about SPS Studio and our team of expert photographers and video producers." },
    { key: "services", label: tUi("nav.services", undefined, "Services Page"), defaultTitle: "Services | Photography & Media Solutions", defaultDesc: "Discover our comprehensive range of property photography, 3D tours, and aerial drone services." },
    { key: "contact", label: tUi("nav.contact", undefined, "Contact Page"), defaultTitle: "Contact Us | Book a Session", defaultDesc: "Get in touch with SPS Studio to schedule your next property shoot or request a quote." },
    { key: "faq", label: tUi("nav.faq", undefined, "FAQ Page"), defaultTitle: "Frequently Asked Questions", defaultDesc: "Find answers to common questions about booking, deliverables, turnaround times, and pricing." },
  ];

  // Parse page-specific SEO meta
  const getPagesMetaMap = (): Record<string, PageSeoMeta> => {
    if (!settings.seo_pages_meta) return {};
    try {
      return JSON.parse(settings.seo_pages_meta);
    } catch (e) {
      return {};
    }
  };

  const pagesMap = getPagesMetaMap();
  const currentPageMeta = pagesMap[selectedPageKey] || {};

  const handlePageMetaChange = (field: keyof PageSeoMeta, value: string) => {
    const updatedMap = {
      ...pagesMap,
      [selectedPageKey]: {
        ...pagesMap[selectedPageKey],
        [field]: value
      }
    };
    onChange("seo_pages_meta", JSON.stringify(updatedMap));
  };

  return (
    <div className="space-y-8">
      {/* Global Default SEO Card */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="border-b border-border bg-surface/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Globe size={20} />
            </div>
            <div>
              <CardTitle className="text-xl">
                {tUi("admin.seo.global_title", undefined, "Global Site SEO Defaults")}
              </CardTitle>
              <CardDescription>
                {tUi("admin.seo.global_desc", undefined, "Default meta tags and global fallback keywords used across the entire website.")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div>
            <Label className="font-medium text-text">
              {tUi("admin.seo.default_title", undefined, "Default Site Title")}
            </Label>
            <Input
              value={settings.seo_default_title || ""}
              onChange={(e) => onChange("seo_default_title", e.target.value)}
              placeholder="E.g. SPS Studio - Premier Real Estate Photography & Media"
              className="mt-1"
            />
            <p className="text-xs text-muted-text mt-1">
              {tUi("admin.seo.default_title_hint", undefined, "Shown in browser tab and search engine results if page title is omitted.")}
            </p>
          </div>

          <div>
            <Label className="font-medium text-text">
              {tUi("admin.seo.default_meta_desc", undefined, "Default Meta Description")}
            </Label>
            <textarea
              value={settings.seo_default_description || ""}
              onChange={(e) => onChange("seo_default_description", e.target.value)}
              placeholder="E.g. Elevating property presentations with high-end real estate photography, 3D virtual tours, and aerial drone imagery."
              rows={3}
              className="mt-1 w-full px-3 py-2 border border-border bg-surface text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm transition-shadow"
            />
            <p className="text-xs text-muted-text mt-1">
              {tUi("admin.seo.default_meta_desc_hint", undefined, "Recommended length: 150-160 characters for search snippet optimization.")}
            </p>
          </div>

          <KeywordTagInput
            label={tUi("admin.seo.default_keywords", undefined, "Global Default Keywords")}
            description={tUi("admin.seo.default_keywords_desc", undefined, "Default keyword tags appended or used when page-specific keywords are not set.")}
            keywords={settings.seo_default_keywords || ""}
            onChange={(val) => onChange("seo_default_keywords", val)}
            placeholder="Add default site keyword (e.g., real estate photography, drone photos)..."
          />
        </CardContent>
      </Card>

      {/* Individual Pages SEO Card */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="border-b border-border bg-surface/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <FileText size={20} />
            </div>
            <div>
              <CardTitle className="text-xl">
                {tUi("admin.seo.page_specific_title", undefined, "Individual Page SEO Settings")}
              </CardTitle>
              <CardDescription>
                {tUi("admin.seo.page_specific_desc", undefined, "Customize titles, descriptions, and specific SEO keywords for each individual section of your site.")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Page selector buttons */}
          <div className="flex flex-wrap gap-2 pb-2 border-b border-border">
            {SITE_PAGES.map((page) => {
              const isSelected = selectedPageKey === page.key;
              const hasCustomKw = Boolean(pagesMap[page.key]?.keywords);
              return (
                <button
                  key={page.key}
                  type="button"
                  onClick={() => setSelectedPageKey(page.key)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-surface hover:bg-surface/80 text-muted-text hover:text-text border border-border"
                  }`}
                >
                  <span>{page.label}</span>
                  {hasCustomKw && (
                    <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-white" : "bg-primary"}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Form for selected page */}
          {(() => {
            const pageConfig = SITE_PAGES.find(p => p.key === selectedPageKey)!;
            return (
              <div className="space-y-6 bg-surface/30 p-5 rounded-xl border border-border">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-text flex items-center gap-2">
                    <Sparkles size={16} className="text-primary" />
                    SEO for {pageConfig.label}
                  </h4>
                  <span className="text-xs text-muted-text font-mono uppercase bg-surface px-2.5 py-1 rounded border border-border">
                    Page Key: {pageConfig.key}
                  </span>
                </div>

                <div>
                  <Label className="text-xs font-medium text-text">
                    {tUi("admin.seo.page_title", undefined, "Page Title Tag")}
                  </Label>
                  <Input
                    value={currentPageMeta.title || ""}
                    onChange={(e) => handlePageMetaChange("title", e.target.value)}
                    placeholder={pageConfig.defaultTitle}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium text-text">
                    {tUi("admin.seo.page_desc", undefined, "Page Meta Description")}
                  </Label>
                  <textarea
                    value={currentPageMeta.description || ""}
                    onChange={(e) => handlePageMetaChange("description", e.target.value)}
                    placeholder={pageConfig.defaultDesc}
                    rows={2}
                    className="mt-1 w-full px-3 py-2 border border-border bg-surface text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-xs transition-shadow"
                  />
                </div>

                <KeywordTagInput
                  label={`${pageConfig.label} ${tUi("admin.seo.page_keywords", undefined, "Keywords")}`}
                  description={`Keywords tailored specifically for the ${pageConfig.label.toLowerCase()}.`}
                  keywords={currentPageMeta.keywords || ""}
                  onChange={(val) => handlePageMetaChange("keywords", val)}
                  placeholder={`Add keyword for ${pageConfig.label.toLowerCase()}...`}
                />
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
