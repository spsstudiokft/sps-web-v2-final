import React, { useState, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faTag, faLayerGroup } from "@fortawesome/free-solid-svg-icons";
import { cn } from "../../lib/utils";
import { useLanguage } from "../../contexts/LanguageContext";
import { tUi, t } from "../../lib/i18n";
import { SiteSettings, FAQItem, FAQCategory } from "../../lib/types";
import { motion, AnimatePresence } from "motion/react";

export function FAQ({ 
  settings, 
  initialFaqs,
  initialCategories,
}: { 
  settings?: SiteSettings;
  initialFaqs?: FAQItem[];
  initialCategories?: FAQCategory[];
}) {
  const [faqs, setFaqs] = useState<Array<FAQItem | Partial<FAQItem>>>(
    initialFaqs || []
  );
  const [dbCategories, setDbCategories] = useState<FAQCategory[]>(initialCategories || []);
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { currentLang, defaultLang } = useLanguage();

  useEffect(() => {
    if (initialFaqs !== undefined && initialCategories !== undefined) return;
    let isMounted = true;
    Promise.all([
      fetch("/api/public/faqs").then((res) => (res.ok ? res.json() : [])),
      fetch("/api/public/faq-categories").then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([faqsData, catsData]) => {
        if (isMounted) {
          if (Array.isArray(faqsData)) setFaqs(faqsData);
          if (Array.isArray(catsData)) {
            setDbCategories(catsData);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load public faqs or categories:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [initialFaqs, initialCategories]);

  const resolveText = (val: string | null | undefined, fallbackKey = ""): string => {
    if (!val) return fallbackKey ? tUi(fallbackKey, currentLang) : "";
    const translated = t(val, currentLang, defaultLang);
    return translated || (fallbackKey ? tUi(fallbackKey, currentLang) : val);
  };

  // Build sorted category tabs from database categories or unique FAQ categories
  const categoriesList = useMemo(() => {
    if (dbCategories.length > 0) {
      // Return DB categories that have FAQs or are published
      return dbCategories.map((c) => ({
        id: c.id,
        name: resolveText(c.name, c.name),
        slug: c.slug,
        description: resolveText(c.description, ""),
      }));
    }

    const uniqueCats = new Set<string>();
    faqs.forEach((f) => {
      if (f.category && f.category.trim() && f.category.trim().toLowerCase() !== "general") {
        uniqueCats.add(f.category.trim());
      }
    });

    return Array.from(uniqueCats).map((catName) => ({
      id: catName,
      name: resolveText(catName, catName),
      slug: catName.toLowerCase().replace(/\s+/g, "-"),
      description: "",
    }));
  }, [dbCategories, faqs, currentLang, defaultLang]);

  // Selected category info
  const currentCategoryInfo = useMemo(() => {
    if (selectedCategory === "all") return null;
    return categoriesList.find(
      (c) => c.name === selectedCategory || c.id === selectedCategory || c.slug === selectedCategory
    );
  }, [selectedCategory, categoriesList]);

  // Filtered faqs
  const visibleFaqs = useMemo(() => {
    if (selectedCategory === "all") return faqs;
    return faqs.filter((f) => {
      const catName = f.category || "General";
      const catId = f.category_id;
      return (
        catName === selectedCategory ||
        catId === selectedCategory ||
        resolveText(f.category_name, catName) === selectedCategory
      );
    });
  }, [faqs, selectedCategory, currentLang, defaultLang]);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  if (faqs.length === 0) return null;

  return (
    <section 
      id="faq" 
      className="aero-faq aero-image-section scroll-mt-20 py-24 md:py-32 px-6"
    >
      <motion.div
        initial={{ y: 20 }}
        whileInView={{ y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-3xl mx-auto"
      >
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold tracking-tight text-text mb-4">
            {t(settings?.faq_headline, currentLang, defaultLang) || tUi("Frequently Asked Questions", currentLang)}
          </h2>
          <p className="text-lg text-muted-text max-w-2xl mx-auto">
            {t(settings?.faq_description, currentLang, defaultLang) ||
              tUi("Everything you need to know about our services, process, and deliverables.", currentLang)}
          </p>
        </div>

        {/* Category Filter Pills */}
        {categoriesList.length > 0 && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-4 mb-4 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("all");
                setOpenIndex(null);
              }}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer",
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground shadow-sm scale-105"
                  : "bg-background text-muted-text hover:text-text border border-border"
              )}
            >
              {tUi("All", currentLang) || "All"}
            </button>
            {categoriesList.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.name);
                  setOpenIndex(null);
                }}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer",
                  selectedCategory === cat.name
                    ? "bg-primary text-primary-foreground shadow-sm scale-105"
                    : "bg-background text-muted-text hover:text-text border border-border"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Optional Category Description Banner */}
        {currentCategoryInfo && currentCategoryInfo.description && (
          <div className="text-center text-sm text-muted-text max-w-xl mx-auto mb-8 bg-background/60 border border-border px-4 py-2.5 rounded-xl">
            {currentCategoryInfo.description}
          </div>
        )}

        {/* Questions Accordion */}
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {visibleFaqs.map((faq, index) => {
              const isOpen = openIndex === index;
              const question = resolveText(faq.question, faq.question || "");
              const answer = resolveText(faq.answer, faq.answer || "");
              const categorySource = faq.category_name || faq.category || "";
              const category = categorySource && categorySource !== "General"
                ? resolveText(categorySource, "")
                : null;

              return (
                <motion.div 
                  key={faq.id || index}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25 }}
                  className="bg-background border border-border rounded-2xl overflow-hidden transition-all duration-200 ease-in-out shadow-xs hover:border-primary/30"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => toggleFaq(index)}
                    className="w-full flex items-center justify-between p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                  >
                    <div className="pr-6">
                      {category && selectedCategory === "all" && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-semibold mb-1.5">
                          <FontAwesomeIcon icon={faTag} className="text-[9px]" />
                          <span>{category}</span>
                        </div>
                      )}
                      <div className="text-lg font-semibold text-text leading-snug">
                        {question}
                      </div>
                    </div>
                    <div className={cn(
                      "w-8 h-8 rounded-full bg-surface border border-border/50 flex items-center justify-center text-muted-text transition-transform duration-300 shrink-0",
                      isOpen && "transform rotate-180 bg-primary/10 text-primary border-primary/20"
                    )}>
                      <FontAwesomeIcon icon={faChevronDown} aria-hidden="true" />
                    </div>
                  </button>
                  <div 
                    className={cn(
                      "px-6 pb-6 text-muted-text leading-relaxed",
                      !isOpen && "hidden"
                    )}
                  >
                    <div className="pt-3 border-t border-border/70 text-[15px]">
                      {answer}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>
    </section>
  );
}
