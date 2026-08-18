import { Variants, Transition } from "motion/react";

/**
 * Standard Easing Curves & Timing Tokens
 */
export const EASING = {
  easeOut: [0.21, 0.47, 0.32, 0.98] as const,
  easeInOut: [0.4, 0, 0.2, 1] as const,
  spring: { type: "spring", stiffness: 350, damping: 28 } as const,
  gentleSpring: { type: "spring", stiffness: 260, damping: 24 } as const,
  snappySpring: { type: "spring", stiffness: 450, damping: 32 } as const,
};

/**
 * Common Viewport trigger setting for Scroll-In-View animations
 * Trigger once, slightly before fully reaching the viewport center
 */
export const VIEWPORT_CONFIG = {
  once: true,
  margin: "-40px",
  amount: 0.15,
} as const;

/**
 * Stagger Container Variants
 */
export const staggerContainer = (staggerChildren = 0.08, delayChildren = 0): Variants => ({
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});

export const fastStaggerContainer = staggerContainer(0.05, 0.02);
export const relaxedStaggerContainer = staggerContainer(0.12, 0.05);

/**
 * Fade In with subtle Upward translation (GPU accelerated transform & opacity)
 */
export const fadeInUp: Variants = {
  hidden: {
    opacity: 0,
    y: 18,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.21, 0.47, 0.32, 0.98],
    },
  },
};

/**
 * Fade In with Downward translation (e.g. headers, eyebrows)
 */
export const fadeInDown: Variants = {
  hidden: {
    opacity: 0,
    y: -14,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.21, 0.47, 0.32, 0.98],
    },
  },
};

/**
 * Fade In with subtle scale (Cards, Modals, Images)
 */
export const fadeInScale: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
    y: 10,
  },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.21, 0.47, 0.32, 0.98],
    },
  },
};

/**
 * Slide in from Left (Info columns, list items)
 */
export const fadeInLeft: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.5,
      ease: [0.21, 0.47, 0.32, 0.98],
    },
  },
};

/**
 * Slide in from Right (Forms, visual panels)
 */
export const fadeInRight: Variants = {
  hidden: {
    opacity: 0,
    x: 20,
  },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.5,
      ease: [0.21, 0.47, 0.32, 0.98],
    },
  },
};

/**
 * Simple Opacity Fade (Ambient backdrops, dividers)
 */
export const fadeIn: Variants = {
  hidden: {
    opacity: 0,
  },
  show: {
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

/**
 * Badge Pop In Variant
 */
export const badgePop: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.85,
  },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
};

/**
 * Interactive Button Hover & Tap motion props
 */
export const buttonMotionProps = {
  whileHover: { scale: 1.02, transition: { duration: 0.15 } },
  whileTap: { scale: 0.98, transition: { duration: 0.1 } },
};

/**
 * Card Lift Motion Props
 */
export const cardHoverProps = {
  whileHover: { 
    y: -3,
    transition: { duration: 0.2, ease: "easeOut" } 
  },
};
