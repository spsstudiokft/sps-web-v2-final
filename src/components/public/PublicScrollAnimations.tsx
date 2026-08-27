import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function PublicScrollAnimations({ disabled, contentReady }: { disabled: boolean; contentReady: boolean }) {
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("section[data-gsap-reveal]"));
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (disabled || prefersReducedMotion) {
      gsap.set(sections, { clearProps: "opacity,transform,visibility" });
      return;
    }

    const context = gsap.context(() => {
      sections.forEach((section) => {
        gsap.set(section, { autoAlpha: 0, y: 24 });
        ScrollTrigger.create({
          trigger: section,
          start: "top 86%",
          once: true,
          onEnter: () => gsap.to(section, {
            autoAlpha: 1,
            y: 0,
            duration: 0.58,
            ease: "power2.out",
            overwrite: "auto",
          }),
        });
      });
    });

    return () => context.revert();
  }, [contentReady, disabled]);

  return null;
}
