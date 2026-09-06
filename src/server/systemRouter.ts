import { Router } from "express";

const systemRouter = Router();

systemRouter.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Intentionally unlinked Easter egg. The API remains raw JSON; its unlisted
// companion page is discoverable only when its direct URL is already known.
systemRouter.get("/health/lou", (_req, res) => {
  res.type("application/json").json({
    subject: {
      name: "Lou Goossens",
      occupation: "Belgian actor",
      known_for: "Elias Montero in Young Hearts",
      portrait_url: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/seYl91sQH330GajhAbqQEIvUBxR.jpg",
      portrait_source_url: "https://www.themoviedb.org/person/3724154-lou-goossens"
    },
    visual_page: {
      url: "/easter-lg",
      visibility: "unlisted",
      robots: "noindex, nofollow",
      note: "This page is intentionally omitted from navigation, sitemap, and public website content."
    },
    biography: {
      summary: "Lou Goossens is a Belgian actor whose screen work began with the Dutch-language short film Alleen Ik. He gained wider recognition for portraying Elias Montero in Anthony Schatteman's coming-of-age feature Young Hearts.",
      career: [
        "Goossens made his screen debut as Flor in Jasper De Maeseneer's short film Alleen Ik (2022).",
        "He appeared as Dennis in the television series Boomer (2023).",
        "In 2024, he played Elias Montero in Young Hearts, his first leading role in a feature film. The film premiered in the Generation Kplus section of the 74th Berlin International Film Festival.",
        "His 2024 television work includes the role of Young Ben Schotz in Moresnet.",
        "He continued working with director Jasper De Maeseneer in the 2025 short film Shutterspeed, portraying Cas."
      ],
      note: "This entry intentionally contains only publicly documented professional credits and production context."
    },
    name_bitmap: {
      encoding: "monochrome-5x7-glyph-grid",
      foreground: 1,
      background: 0,
      glyphs: {
        "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
        "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
        "U": ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
        "G": ["01110", "10001", "10000", "10111", "10001", "10001", "01110"],
        "S": ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
        "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
        "N": ["10001", "11001", "10101", "10011", "10001", "10001", "10001"]
      },
      text: "LOU GOOSSENS"
    },
    selected_work: [
      { year: 2022, title: "Alleen Ik", medium: "short film", role: "Flor" },
      { year: 2023, title: "Boomer", medium: "television series", role: "Dennis" },
      { year: 2024, title: "Young Hearts", medium: "feature film", role: "Elias Montero" },
      { year: 2024, title: "Moresnet", medium: "television series", role: "Young Ben Schotz" },
      { year: 2025, title: "Shutterspeed", medium: "short film", role: "Cas" }
    ],
    sources: [
      "https://strandreleasing.com/wp-content/uploads/2024/05/young-hearts_press-kit_final_en.pdf",
      "https://www.moviemeter.nl/personen/3724154/lou-goossens/filmografie"
    ]
  });
});

let cachedStatusSummary: any = null;
let lastStatusFetchTime = 0;
const STATUS_CACHE_TTL_MS = 25_000;

systemRouter.get("/status-summary", async (_req, res) => {
  const now = Date.now();
  if (cachedStatusSummary && now - lastStatusFetchTime < STATUS_CACHE_TTL_MS) {
    return res.json(cachedStatusSummary);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6_000);
    const response = await fetch("https://status.spsstudio.hu/api/v1/summary", {
      headers: {
        Accept: "application/json",
        "User-Agent": "SPSStudio-StatusWidget/1.0",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`incident.io API responded with ${response.status}`);

    const data = await response.json();
    cachedStatusSummary = { success: true, data };
    lastStatusFetchTime = now;
    return res.json(cachedStatusSummary);
  } catch (error: any) {
    console.debug("[StatusWidget] Failed to fetch incident.io summary:", error?.message || error);
    if (cachedStatusSummary) return res.json({ ...cachedStatusSummary, stale: true });
    return res.json({
      success: false,
      error: "Status summary unavailable",
      data: {
        summary: {
          status: "operational",
          ongoing_incidents: [],
          in_progress_maintenances: [],
        },
      },
    });
  }
});

export default systemRouter;
