import { useState, useMemo } from "react";
import { PortfolioItem, Category } from "../../lib/types";
import { Card, CardContent, CardFooter } from "../ui/Card";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Button } from "../ui/Button";
import { TranslatableInput } from "./TranslatableInput";
import { KeywordTagInput } from "./KeywordTagInput";
import { useApi } from "../../hooks/useApi";
import { useLanguage } from "../../contexts/LanguageContext";
import { ImageGalleryManager, GalleryImage } from "./portfolio/ImageGalleryManager";
import { uploadMediaFile } from "../../lib/uploadHelper";
import { useAuth } from "../../contexts/AuthContext";

interface PortfolioFormProps {
  formData: any;
  setFormData: (data: any) => void;
  categories: Category[];
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  siteLanguages: string;
}

export function PortfolioForm({ formData, setFormData, categories, onSubmit, onCancel, siteLanguages }: PortfolioFormProps) {
  const { tUi } = useLanguage();
  const { fetchApi } = useApi();
  const { token } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  
  const parsedImages: GalleryImage[] = useMemo(() => {
    try {
      const parsed = JSON.parse(formData.image_urls || "[]");
      if (Array.isArray(parsed)) {
        return parsed.map((item: any, i: number) => {
          if (typeof item === 'string') {
            return { id: `img-${i}-${Date.now()}`, url: item };
          }
          return { ...item, id: item.id || `img-${i}-${Date.now()}` };
        });
      }
    } catch (e) {
      console.error("Failed to parse image_urls", e);
    }
    return [];
  }, [formData.image_urls]);

  const handleUpload = async (files: FileList) => {
    setIsUploading(true);
    const newImages: GalleryImage[] = [];
    
    const fileArray = Array.from(files);
    
    // Keep gallery uploads sequential. Starting every file at once causes a
    // burst of init/sign/register calls that can trip Vercel/storage limits.
    for (let index = 0; index < fileArray.length; index++) {
      const file = fileArray[index];
      try {
        const result = await uploadMediaFile(file, { token });
        if (result.url) {
          newImages.push({
            id: `new-${Date.now()}-${index}`,
            url: result.url,
            title: file.name
          });
        }
      } catch (err) {
        console.error("Upload failed for", file.name, err);
      }
    }
    
    if (newImages.length > 0) {
      setFormData({
        ...formData,
        image_urls: JSON.stringify([...parsedImages, ...newImages])
      });
    }
    
    setIsUploading(false);
  };
  
  const handleImagesChange = (newImages: GalleryImage[]) => {
    setFormData({
      ...formData,
      image_urls: JSON.stringify(newImages)
    });
  };

  return (
    <form onSubmit={onSubmit} className="mb-8">
      <Card>
        <CardContent className="space-y-8 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <TranslatableInput
                label={tUi("admin.portfolio_form.title", undefined, "Title")}
                value={formData.title}
                onChange={val => setFormData({ ...formData, title: val })}
                siteLanguages={siteLanguages}
              />
              <TranslatableInput
                label={tUi("admin.portfolio_form.description", undefined, "Description")}
                value={formData.description}
                onChange={val => setFormData({ ...formData, description: val })}
                siteLanguages={siteLanguages}
                isTextarea
              />
              <KeywordTagInput
                label={tUi("admin.portfolio_form.seo_keywords", undefined, "SEO Keywords")}
                description={tUi("admin.portfolio_form.seo_keywords_desc", undefined, "Specific keywords for this portfolio item/gallery for search engines.")}
                keywords={formData.keywords || ""}
                onChange={val => setFormData({ ...formData, keywords: val })}
                placeholder="Add keyword (e.g. luxury listing, sunset drone, virtual tour)..."
              />
            </div>
            <div className="space-y-4">
              <div>
                <Label>{tUi("admin.portfolio_form.category", undefined, "Category")}</Label>
                <select
                  className="mt-1 block w-full px-4 py-2 border border-border bg-surface text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none sm:text-sm transition-shadow"
                  value={formData.category_id}
                  onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                >
                  <option value="">None</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              
              <div className="flex flex-col gap-3 pt-2">
                <Label>{tUi("admin.portfolio_form.settings", undefined, "Settings")}</Label>
                <label className="flex items-center text-sm font-medium text-text p-3 border border-border rounded-lg bg-surface">
                  <input
                    type="checkbox"
                    className="mr-3 h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
                    checked={formData.is_featured}
                    onChange={e => setFormData({ ...formData, is_featured: e.target.checked })}
                  />
                  {tUi("admin.portfolio_form.featured", undefined, "Featured Portfolio Item")}
                </label>
                <label className="flex items-center text-sm font-medium text-text p-3 border border-border rounded-lg bg-surface">
                  <input
                    type="checkbox"
                    className="mr-3 h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
                    checked={formData.is_published}
                    onChange={e => setFormData({ ...formData, is_published: e.target.checked })}
                  />
                  {tUi("admin.portfolio_form.published", undefined, "Published (Visible to public)")}
                </label>
              </div>
            </div>
          </div>
          
          <div className="pt-6 border-t border-border">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-text">
                {tUi("admin.portfolio_form.gallery_images", undefined, "Gallery Images")}
              </h3>
              <p className="text-sm text-muted-text">
                {tUi("admin.portfolio_form.gallery_images_desc", undefined, "Upload, reorder, and manage metadata for images in this portfolio item.")}
              </p>
            </div>
            
            <ImageGalleryManager 
              images={parsedImages} 
              onChange={handleImagesChange}
              onUpload={handleUpload}
              isUploading={isUploading}
              portfolioItemId={formData.id}
            />
            
            <div className="mt-4">
              <details className="text-sm">
                <summary className="text-muted-text cursor-pointer hover:text-text">
                  {tUi("admin.portfolio_form.advanced_json", undefined, "Advanced: Raw JSON data")}
                </summary>
                <div className="mt-2">
                  <Input
                    placeholder='[{"url": "https://..."}]'
                    value={formData.image_urls}
                    onChange={e => setFormData({ ...formData, image_urls: e.target.value })}
                  />
                </div>
              </details>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 bg-background border-t border-border rounded-b-lg">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {tUi("admin.portfolio_form.cancel", undefined, "Cancel")}
          </Button>
          <Button type="submit">
            {tUi("admin.portfolio_form.save", undefined, "Save Project")}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
