import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function PublicScrollAnimations({ disabled, contentReady }: { disabled: boolean; contentReady: boolean }) {
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("section[data-gsap-reveal]"));
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobileViewport = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;

    // Content must never be hidden while a mobile user is scrolling. Besides
    // saving work on touch devices, this avoids visible blank sections during
    // fast flick scrolling or delayed image decoding.
    if (disabled || prefersReducedMotion || mobileViewport) {
      gsap.set(sections, { clearProps: "opacity,transform,visibility" });
      return;
    }

    const context = gsap.context(() => {
      sections.forEach((section) => {
        // Keep sections readable from the first paint. The prior autoAlpha: 0
        // allowed a fast scroll to expose an empty section before ScrollTrigger
        // processed its enter event.
        gsap.set(section, { y: 18 });
        ScrollTrigger.create({
          trigger: section,
          start: "top 92%",
          once: true,
          onEnter: () => gsap.to(section, {
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
