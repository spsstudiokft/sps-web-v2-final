export type ThemeColorMode = {
  background: string;
  surface: string;
  surfaceHover: string;
  text: string;
  mutedText: string;
  inverseText: string;
  border: string;
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
};

export type ThemeTypography = {
  headingFont: string; // e.g. 'Playfair Display', 'Plus Jakarta Sans', 'Cinzel', 'Outfit', 'Montserrat', 'Syne', 'Space Grotesk', 'Merriweather', 'Inter', 'System Sans', 'System Serif'
  bodyFont: string;    // e.g. 'Plus Jakarta Sans', 'Inter', 'Outfit', 'Roboto', 'Merriweather', 'System Sans'
  fontSizeScale: "compact" | "normal" | "comfortable" | "spacious";
  headingWeight: "normal" | "medium" | "semibold" | "bold" | "extrabold";
  letterSpacing: "tight" | "normal" | "wide";
};

export type ThemeUIStyle = {
  borderRadius: "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  shadows: "none" | "subtle" | "medium" | "prominent" | "glow";
  spacing: "compact" | "normal" | "relaxed";
};

export type ThemeConfig = {
  id: string;
  name: string;
  description?: string;
  target: "public" | "admin" | "both";
  isPreset?: boolean;
  colors: {
    light: ThemeColorMode;
    dark: ThemeColorMode;
  };
  typography: ThemeTypography;
  uiStyle: ThemeUIStyle;
};

export type ContrastEvaluation = {
  ratio: number;
  score: "AAA" | "AA" | "AA-Large" | "Fail";
  passAA: boolean;
  passAAA: boolean;
  passAALarge: boolean;
};

// Curated Theme Presets
export const THEME_PRESETS: ThemeConfig[] = [
  {
    id: "preset-modern-cinematic",
    name: "Modern Cinematic",
    description: "Deep obsidian dark palette, warm tungsten amber accents, crisp off-white text, and high-contrast editorial typography.",
    target: "both",
    isPreset: true,
    colors: {
      light: {
        background: "#f8fafc",
        surface: "#f1f5f9",
        surfaceHover: "#e2e8f0",
        text: "#090d16",
        mutedText: "#475569",
        inverseText: "#ffffff",
        border: "#cbd5e1",
        primary: "#b45309",
        primaryForeground: "#ffffff",
        accent: "#0284c7",
        accentForeground: "#ffffff"
      },
      dark: {
        background: "#07090e",
        surface: "#10141d",
        surfaceHover: "#181d2a",
        text: "#f8fafc",
        mutedText: "#94a3b8",
        inverseText: "#07090e",
        border: "#1e2638",
        primary: "#f59e0b",
        primaryForeground: "#07090e",
        accent: "#38bdf8",
        accentForeground: "#07090e"
      }
    },
    typography: {
      headingFont: "Playfair Display",
      bodyFont: "Plus Jakarta Sans",
      fontSizeScale: "comfortable",
      headingWeight: "bold",
      letterSpacing: "normal"
    },
    uiStyle: {
      borderRadius: "xl",
      shadows: "glow",
      spacing: "relaxed"
    }
  },
  {
    id: "preset-modern-minimal",
    name: "Modern Minimal",
    description: "Clean slate architecture with balanced contrast, neutral tones, and crisp typography.",
    target: "both",
    isPreset: true,
    colors: {
      light: {
        background: "#ffffff",
        surface: "#f8fafc",
        surfaceHover: "#f1f5f9",
        text: "#0f172a",
        mutedText: "#64748b",
        inverseText: "#ffffff",
        border: "#e2e8f0",
        primary: "#0f172a",
        primaryForeground: "#ffffff",
        accent: "#3b82f6",
        accentForeground: "#ffffff"
      },
      dark: {
        background: "#0b0f17",
        surface: "#131b2e",
        surfaceHover: "#1e293b",
        text: "#f8fafc",
        mutedText: "#94a3b8",
        inverseText: "#0f172a",
        border: "#1e293b",
        primary: "#f8fafc",
        primaryForeground: "#0f172a",
        accent: "#3b82f6",
        accentForeground: "#ffffff"
      }
    },
    typography: {
      headingFont: "Plus Jakarta Sans",
      bodyFont: "Plus Jakarta Sans",
      fontSizeScale: "normal",
      headingWeight: "bold",
      letterSpacing: "normal"
    },
    uiStyle: {
      borderRadius: "lg",
      shadows: "subtle",
      spacing: "normal"
    }
  },
  {
    id: "preset-sps-studio-cinematic",
    name: "SPS Studio Cinematic",
    description: "The current SPS Studio identity: deep architectural blues, luminous cyan accents, crisp editorial type, and generous cinematic surfaces.",
    target: "public",
    isPreset: true,
    colors: {
      light: {
        background: "#f8fafc",
        surface: "#f1f5f9",
        surfaceHover: "#e2e8f0",
        text: "#0f172a",
        mutedText: "#64748b",
        inverseText: "#ffffff",
        border: "#cbd5e1",
        primary: "#0284c7",
        primaryForeground: "#ffffff",
        accent: "#06b6d4",
        accentForeground: "#ffffff"
      },
      dark: {
        background: "#090d16",
        surface: "#0f172a",
        surfaceHover: "#1e293b",
        text: "#f8fafc",
        mutedText: "#94a3b8",
        inverseText: "#090d16",
        border: "#1e293b",
        primary: "#38bdf8",
        primaryForeground: "#090d16",
        accent: "#22d3ee",
        accentForeground: "#090d16"
      }
    },
    typography: {
      headingFont: "Outfit",
      bodyFont: "Plus Jakarta Sans",
      fontSizeScale: "normal",
      headingWeight: "bold",
      letterSpacing: "tight"
    },
    uiStyle: {
      borderRadius: "xl",
      shadows: "subtle",
      spacing: "normal"
    }
  },
  {
    id: "preset-luxury-editorial",
    name: "Luxury Editorial",
    description: "Serif display elegance, warm champagne accents, and soft paper surfaces for high-end listings.",
    target: "public",
    isPreset: true,
    colors: {
      light: {
        background: "#faf9f6",
        surface: "#f3efe6",
        surfaceHover: "#eae4d8",
        text: "#1c1917",
        mutedText: "#78716c",
        inverseText: "#fafaf9",
        border: "#e7e2d7",
        primary: "#78350f",
        primaryForeground: "#ffffff",
        accent: "#d97706",
        accentForeground: "#ffffff"
      },
      dark: {
        background: "#141210",
        surface: "#1f1c19",
        surfaceHover: "#2b2723",
        text: "#f5f5f4",
        mutedText: "#a8a29e",
        inverseText: "#141210",
        border: "#2e2924",
        primary: "#f59e0b",
        primaryForeground: "#1c1917",
        accent: "#fbbf24",
        accentForeground: "#1c1917"
      }
    },
    typography: {
      headingFont: "Playfair Display",
      bodyFont: "Plus Jakarta Sans",
      fontSizeScale: "comfortable",
      headingWeight: "semibold",
      letterSpacing: "wide"
    },
    uiStyle: {
      borderRadius: "sm",
      shadows: "medium",
      spacing: "relaxed"
    }
  },
  {
    id: "preset-slate-darkroom",
    name: "Slate Darkroom",
    description: "Deep cinematic graphite surfaces and luminous cyan accents, optimized for photo studios.",
    target: "both",
    isPreset: true,
    colors: {
      light: {
        background: "#f8fafc",
        surface: "#f1f5f9",
        surfaceHover: "#e2e8f0",
        text: "#0f172a",
        mutedText: "#64748b",
        inverseText: "#ffffff",
        border: "#cbd5e1",
        primary: "#0284c7",
        primaryForeground: "#ffffff",
        accent: "#06b6d4",
        accentForeground: "#ffffff"
      },
      dark: {
        background: "#090d16",
        surface: "#0f172a",
        surfaceHover: "#1e293b",
        text: "#f8fafc",
        mutedText: "#94a3b8",
        inverseText: "#090d16",
        border: "#1e293b",
        primary: "#38bdf8",
        primaryForeground: "#090d16",
        accent: "#22d3ee",
        accentForeground: "#090d16"
      }
    },
    typography: {
      headingFont: "Outfit",
      bodyFont: "Plus Jakarta Sans",
      fontSizeScale: "normal",
      headingWeight: "bold",
      letterSpacing: "tight"
    },
    uiStyle: {
      borderRadius: "xl",
      shadows: "subtle",
      spacing: "normal"
    }
  },
  {
    id: "preset-emerald-estate",
    name: "Emerald Estate",
    description: "Prestige architectural pine tones with classical typography and subtle jade highlights.",
    target: "both",
    isPreset: true,
    colors: {
      light: {
        background: "#f7faf8",
        surface: "#eef5f0",
        surfaceHover: "#e0ece3",
        text: "#064e3b",
        mutedText: "#047857",
        inverseText: "#ffffff",
        border: "#cfe1d4",
        primary: "#047857",
        primaryForeground: "#ffffff",
        accent: "#10b981",
        accentForeground: "#ffffff"
      },
      dark: {
        background: "#061a14",
        surface: "#0a2820",
        surfaceHover: "#0f3b30",
        text: "#ecfdf5",
        mutedText: "#6ee7b7",
        inverseText: "#061a14",
        border: "#134e3f",
        primary: "#34d399",
        primaryForeground: "#064e3b",
        accent: "#10b981",
        accentForeground: "#ffffff"
      }
    },
    typography: {
      headingFont: "Cinzel",
      bodyFont: "Plus Jakarta Sans",
      fontSizeScale: "normal",
      headingWeight: "semibold",
      letterSpacing: "wide"
    },
    uiStyle: {
      borderRadius: "md",
      shadows: "subtle",
      spacing: "normal"
    }
  },
  {
    id: "preset-nordic-warmth",
    name: "Nordic Warmth",
    description: "Terracotta and warm amber tones inspired by natural sunset lighting and crafted woodwork.",
    target: "public",
    isPreset: true,
    colors: {
      light: {
        background: "#fffaf5",
        surface: "#fef3e8",
        surfaceHover: "#fde6d2",
        text: "#431407",
        mutedText: "#9a3412",
        inverseText: "#ffffff",
        border: "#fed7aa",
        primary: "#c2410c",
        primaryForeground: "#ffffff",
        accent: "#ea580c",
        accentForeground: "#ffffff"
      },
      dark: {
        background: "#180e08",
        surface: "#27170e",
        surfaceHover: "#392214",
        text: "#fff7ed",
        mutedText: "#fdba74",
        inverseText: "#180e08",
        border: "#432412",
        primary: "#fb923c",
        primaryForeground: "#431407",
        accent: "#f97316",
        accentForeground: "#ffffff"
      }
    },
    typography: {
      headingFont: "Montserrat",
      bodyFont: "Plus Jakarta Sans",
      fontSizeScale: "normal",
      headingWeight: "bold",
      letterSpacing: "normal"
    },
    uiStyle: {
      borderRadius: "lg",
      shadows: "subtle",
      spacing: "relaxed"
    }
  },
  {
    id: "preset-midnight-cyber",
    name: "Midnight Cyber",
    description: "Deep galactic indigo with high-voltage violet accents and progressive display typography.",
    target: "both",
    isPreset: true,
    colors: {
      light: {
        background: "#faf5ff",
        surface: "#f3e8ff",
        surfaceHover: "#e9d5ff",
        text: "#3b0764",
        mutedText: "#7e22ce",
        inverseText: "#ffffff",
        border: "#d8b4fe",
        primary: "#7e22ce",
        primaryForeground: "#ffffff",
        accent: "#a855f7",
        accentForeground: "#ffffff"
      },
      dark: {
        background: "#0d0714",
        surface: "#180d26",
        surfaceHover: "#27143f",
        text: "#faf5ff",
        mutedText: "#c084fc",
        inverseText: "#0d0714",
        border: "#3b1d5e",
        primary: "#c084fc",
        primaryForeground: "#3b0764",
        accent: "#d8b4fe",
        accentForeground: "#3b0764"
      }
    },
    typography: {
      headingFont: "Syne",
      bodyFont: "Inter",
      fontSizeScale: "normal",
      headingWeight: "bold",
      letterSpacing: "normal"
    },
    uiStyle: {
      borderRadius: "xl",
      shadows: "glow",
      spacing: "normal"
    }
  },
  {
    id: "preset-monochrome-classic",
    name: "Monochrome Classic",
    description: "Timeless stark black & white gallery aesthetics with geometric typography and razor edges.",
    target: "both",
    isPreset: true,
    colors: {
      light: {
        background: "#ffffff",
        surface: "#f4f4f5",
        surfaceHover: "#e4e4e7",
        text: "#09090b",
        mutedText: "#71717a",
        inverseText: "#ffffff",
        border: "#e4e4e7",
        primary: "#18181b",
        primaryForeground: "#ffffff",
        accent: "#27272a",
        accentForeground: "#ffffff"
      },
      dark: {
        background: "#000000",
        surface: "#121212",
        surfaceHover: "#242424",
        text: "#ffffff",
        mutedText: "#a1a1aa",
        inverseText: "#000000",
        border: "#27272a",
        primary: "#fafafa",
        primaryForeground: "#09090b",
        accent: "#e4e4e7",
        accentForeground: "#09090b"
      }
    },
    typography: {
      headingFont: "Space Grotesk",
      bodyFont: "Inter",
      fontSizeScale: "normal",
      headingWeight: "bold",
      letterSpacing: "tight"
    },
    uiStyle: {
      borderRadius: "none",
      shadows: "none",
      spacing: "compact"
    }
    },
    {
    id: "preset-aero-glass", name: "Aero Glass", description: "The current airy SPS look: frosted blue surfaces, transparent layers and a precise cyan accent.", target: "both", isPreset: true,
    colors: { light: { background: "#f4f9ff", surface: "#ffffff", surfaceHover: "#eaf4ff", text: "#10233d", mutedText: "#5f7189", inverseText: "#ffffff", border: "#cfe1f5", primary: "#1677c8", primaryForeground: "#ffffff", accent: "#14b8d4", accentForeground: "#06243a" }, dark: { background: "#08131f", surface: "#102236", surfaceHover: "#18334f", text: "#eaf6ff", mutedText: "#9bb3c9", inverseText: "#08131f", border: "#294561", primary: "#38bdf8", primaryForeground: "#06243a", accent: "#67e8f9", accentForeground: "#06243a" } },
    typography: { headingFont: "Outfit", bodyFont: "Plus Jakarta Sans", fontSizeScale: "normal", headingWeight: "bold", letterSpacing: "tight" }, uiStyle: { borderRadius: "xl", shadows: "subtle", spacing: "normal" }
  },
  {
    id: "preset-electric-glow", name: "Electric Glow", description: "Dark cinematic canvas with vivid violet and cyan glow for bolder, immersive presentation.", target: "both", isPreset: true,
    colors: { light: { background: "#f8f7ff", surface: "#ffffff", surfaceHover: "#f0edff", text: "#18132d", mutedText: "#625c78", inverseText: "#ffffff", border: "#ddd7f7", primary: "#6d28d9", primaryForeground: "#ffffff", accent: "#0891b2", accentForeground: "#ffffff" }, dark: { background: "#0d0920", surface: "#171036", surfaceHover: "#24184e", text: "#f5f3ff", mutedText: "#b9afdc", inverseText: "#0d0920", border: "#332462", primary: "#a78bfa", primaryForeground: "#170b35", accent: "#22d3ee", accentForeground: "#082f49" } },
    typography: { headingFont: "Space Grotesk", bodyFont: "Plus Jakarta Sans", fontSizeScale: "comfortable", headingWeight: "bold", letterSpacing: "normal" }, uiStyle: { borderRadius: "xl", shadows: "glow", spacing: "relaxed" }
  },
  {
    id: "preset-warm-estate", name: "Warm Estate", description: "Quiet stone, ivory and bronze tones for refined residential and luxury listing stories.", target: "public", isPreset: true,
    colors: { light: { background: "#fbfaf7", surface: "#f5f1ea", surfaceHover: "#ede6da", text: "#282019", mutedText: "#75695e", inverseText: "#ffffff", border: "#e3d8c8", primary: "#8a5429", primaryForeground: "#ffffff", accent: "#b7791f", accentForeground: "#ffffff" }, dark: { background: "#1b1613", surface: "#292019", surfaceHover: "#392b22", text: "#fbf7f2", mutedText: "#c1afa0", inverseText: "#1b1613", border: "#49362a", primary: "#e0a66e", primaryForeground: "#2b170c", accent: "#f0bd73", accentForeground: "#2b170c" } },
    typography: { headingFont: "Playfair Display", bodyFont: "Plus Jakarta Sans", fontSizeScale: "comfortable", headingWeight: "semibold", letterSpacing: "wide" }, uiStyle: { borderRadius: "lg", shadows: "medium", spacing: "relaxed" }
  }
];

export const AVAILABLE_FONTS = {
  headings: [
    { name: "Plus Jakarta Sans", category: "Geometric Sans", googleFamily: "Plus+Jakarta+Sans:wght@400;500;600;700;800" },
    { name: "Playfair Display", category: "Editorial Serif", googleFamily: "Playfair+Display:ital,wght@0,400;0,600;0,700;1,400" },
    { name: "Outfit", category: "Contemporary Sans", googleFamily: "Outfit:wght@400;500;600;700;800" },
    { name: "Cinzel", category: "Classical Serif", googleFamily: "Cinzel:wght@400;600;700;800" },
    { name: "Montserrat", category: "Architectural Sans", googleFamily: "Montserrat:wght@400;500;600;700;800" },
    { name: "Syne", category: "Display Bold", googleFamily: "Syne:wght@500;600;700;800" },
    { name: "Space Grotesk", category: "Modern Tech Sans", googleFamily: "Space+Grotesk:wght@400;500;600;700" },
    { name: "Merriweather", category: "Literary Serif", googleFamily: "Merriweather:wght@300;400;700" },
    { name: "Inter", category: "Neutral Functional Sans", googleFamily: "Inter:wght@400;500;600;700" },
    { name: "System Sans", category: "System Native", googleFamily: null },
    { name: "System Serif", category: "System Native Serif", googleFamily: null }
  ],
  body: [
    { name: "Plus Jakarta Sans", category: "Geometric Sans", googleFamily: "Plus+Jakarta+Sans:wght@400;500;600;700" },
    { name: "Inter", category: "Neutral Sans", googleFamily: "Inter:wght@400;500;600;700" },
    { name: "Outfit", category: "Clean Sans", googleFamily: "Outfit:wght@400;500;600" },
    { name: "Roboto", category: "Standard Sans", googleFamily: "Roboto:wght@300;400;500;700" },
    { name: "Merriweather", category: "Serif Body", googleFamily: "Merriweather:wght@300;400;700" },
    { name: "Open Sans", category: "Friendly Sans", googleFamily: "Open+Sans:wght@400;500;600" },
    { name: "System Sans", category: "System Native", googleFamily: null }
  ]
};

// WCAG 2.1 Contrast Calculator Helper
export function getLuminance(hexColor: string): number {
  let cleanHex = hexColor.replace("#", "").trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split("").map((c) => c + c).join("");
  }
  if (cleanHex.length !== 6) return 0;
  
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function calculateContrastRatio(hex1: string, hex2: string): number {
  try {
    const lum1 = getLuminance(hex1);
    const lum2 = getLuminance(hex2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    const ratio = (brightest + 0.05) / (darkest + 0.05);
    return Math.round(ratio * 10) / 10;
  } catch {
    return 1;
  }
}

export function evaluateContrast(fgHex: string, bgHex: string): ContrastEvaluation {
  const ratio = calculateContrastRatio(fgHex, bgHex);
  const passAAA = ratio >= 7.0;
  const passAA = ratio >= 4.5;
  const passAALarge = ratio >= 3.0;

  let score: "AAA" | "AA" | "AA-Large" | "Fail" = "Fail";
  if (passAAA) score = "AAA";
  else if (passAA) score = "AA";
  else if (passAALarge) score = "AA-Large";

  return {
    ratio,
    score,
    passAA,
    passAAA,
    passAALarge
  };
}

export function getAutoContrastColor(bgHex: string): string {
  const lum = getLuminance(bgHex);
  return lum > 0.4 ? "#0f172a" : "#ffffff";
}
