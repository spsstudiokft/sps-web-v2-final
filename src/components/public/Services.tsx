import React, { useState, useEffect } from "react";
import { SiteSettings, Service } from "../../lib/types";
import { useLanguage } from "../../contexts/LanguageContext";
import { t, tUi } from "../../lib/i18n";
import { ServiceIcon } from "../common/ServiceIcon";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

export function Services({ 
  settings, 
  initialServices 
}: { 
  settings?: SiteSettings;
  initialServices?: Service[];
}) {
  const { currentLang, defaultLang } = useLanguage();
  const [services, setServices] = useState<Service[] | Partial<Service>[]>(
    initialServices || []
  );

  useEffect(() => {
    if (initialServices !== undefined) return;
    let isMounted = true;
    fetch("/api/public/services")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (isMounted && Array.isArray(data)) setServices(data);
      })
      .catch((err) => {
        console.error("Failed to load public services:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [initialServices]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariant = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  const resolveText = (val: string | null | undefined, fallbackKey = ""): string => {
    if (!val) return fallbackKey ? tUi(fallbackKey, currentLang) : "";
    const translated = t(val, currentLang, defaultLang);
    return translated || (fallbackKey ? tUi(fallbackKey, currentLang) : val);
  };

  if (services.length === 0) return null;

  return (
    <section id="services" className="aero-section aero-services aero-image-section scroll-mt-20 py-24 md:py-32 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="aero-section-heading text-center mb-16 max-w-4xl mx-auto"
      >
        <h2 className="text-4xl font-bold tracking-tight text-text mb-4">
          {t(settings?.services_headline, currentLang, defaultLang) || tUi("Our Services", currentLang)}
        </h2>
        <p className="text-lg text-muted-text max-w-2xl mx-auto">
          {t(settings?.services_description, currentLang, defaultLang) ||
            tUi(
              "Comprehensive visual solutions designed to elevate your property listings and attract more buyers.",
              currentLang
            )}
        </p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-50px" }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto"
      >
        {services.map((service, index) => {
          const serviceTitle = resolveText(service.title, service.title);
          const serviceDesc = resolveText(service.description, service.description || "");
          const linkText = resolveText(service.link_text, "Learn More");

          const CardContent = (
            <div className="h-full flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6 shrink-0 transition-transform group-hover:scale-105">
                  <ServiceIcon
                    icon={service.icon}
                    imageUrl={service.image_url}
                    className="w-6 h-6"
                  />
                </div>
                <h3 className="text-xl font-semibold text-text mb-3">{serviceTitle}</h3>
                <p className="text-muted-text leading-relaxed">{serviceDesc}</p>
              </div>

              {service.link_url && (
                <div className="mt-6 pt-4 border-t border-border/50 flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:underline">
                  <span>{linkText}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              )}
            </div>
          );

          if (service.link_url) {
            const isInternalAnchor = service.link_url.startsWith("#");
            return (
              <motion.a
                key={service.id || index}
                variants={itemVariant}
                href={service.link_url}
                target={isInternalAnchor ? undefined : "_blank"}
                rel={isInternalAnchor ? undefined : "noopener noreferrer"}
                className="aero-card group block p-8 rounded-3xl transition-all duration-300 cursor-pointer"
              >
                {CardContent}
              </motion.a>
            );
          }

          return (
            <motion.div
              key={service.id || index}
              variants={itemVariant}
              className="aero-card group p-8 rounded-3xl transition-all duration-300"
            >
              {CardContent}
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
