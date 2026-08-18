import { db } from "../../db.js";

export const LEGAL_DOCUMENT_TYPES = ["privacy", "terms", "cookies", "legal_notice"] as const;
export type LegalDocumentType = (typeof LEGAL_DOCUMENT_TYPES)[number];

export interface LegalDocumentLocaleContent {
  title: string;
  content: string;
  updated_at?: string;
}

const ALLOWED_TAGS = new Set([
  "p", "br", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "b", "em", "i", "u", "s", "strike",
  "ul", "ol", "li", "blockquote", "a", "hr", "div", "span", "font", "pre", "code", "sub", "sup",
  "table", "thead", "tbody", "tr", "th", "td"
]);

function sanitizeHref(value: string): string {
  const clean = value.trim();
  return /^(https?:\/\/|mailto:|tel:|#)/i.test(clean) ? clean.replace(/"/g, "&quot;") : "#";
}

function sanitizeStyle(value: string): string {
  const allowed: string[] = [];
  for (const declaration of value.split(";")) {
    const [rawProperty, ...rawValue] = declaration.split(":");
    const property = rawProperty?.trim().toLowerCase();
    const styleValue = rawValue.join(":").trim();
    if (!property || !styleValue) continue;
    if (property === "text-align" && /^(left|center|right|justify)$/i.test(styleValue)) allowed.push(`${property}:${styleValue}`);
    if ((property === "color" || property === "background-color") && /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]{3,20})$/i.test(styleValue)) allowed.push(`${property}:${styleValue}`);
    if (property === "font-size" && /^(\d+(\.\d+)?)(px|pt|em|rem|%)$/i.test(styleValue)) allowed.push(`${property}:${styleValue}`);
  }
  return allowed.join(";");
}

export function sanitizeLegalHtml(rawHtml: unknown): string {
  if (typeof rawHtml !== "string") return "";
  let html = rawHtml
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?(iframe|object|embed|form|input|button|textarea|select|meta|link|base)\b[^>]*>/gi, "");

  html = html.replace(/<\/?([a-z0-9]+)\b([^>]*)>/gi, (full, rawTag, rawAttrs) => {
    const tag = String(rawTag).toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (full.startsWith("</")) return `</${tag}>`;
    if (tag === "br" || tag === "hr") return `<${tag}>`;

    const attrs: string[] = [];
    const attributePattern = /([a-zA-Z][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
    let match: RegExpExecArray | null;
    while ((match = attributePattern.exec(String(rawAttrs))) !== null) {
      const name = match[1].toLowerCase();
      const value = match[2] ?? match[3] ?? match[4] ?? "";
      if (tag === "a" && name === "href") attrs.push(`href="${sanitizeHref(value)}"`);
      if (tag === "a" && name === "target" && value === "_blank") attrs.push(`target="_blank"`);
      if (name === "style") {
        const safeStyle = sanitizeStyle(value);
        if (safeStyle) attrs.push(`style="${safeStyle}"`);
      }
      if (tag === "font" && name === "color" && /^(#[0-9a-f]{3,8}|[a-z]{3,20})$/i.test(value)) attrs.push(`color="${value}"`);
      if (tag === "font" && name === "size" && /^[1-7]$/.test(value)) attrs.push(`size="${value}"`);
      if (["table", "td", "th"].includes(tag) && ["colspan", "rowspan"].includes(name) && /^\d{1,2}$/.test(value)) attrs.push(`${name}="${value}"`);
    }
    if (tag === "a" && attrs.some((attr) => attr === 'target="_blank"')) attrs.push('rel="noopener noreferrer"');
    return `<${tag}${attrs.length ? ` ${attrs.join(" ")}` : ""}>`;
  });

  return html.trim();
}

function isDocumentType(value: string): value is LegalDocumentType {
  return LEGAL_DOCUMENT_TYPES.includes(value as LegalDocumentType);
}

export async function getAllLegalDocuments(): Promise<Record<LegalDocumentType, Record<string, LegalDocumentLocaleContent>>> {
  const result = {} as Record<LegalDocumentType, Record<string, LegalDocumentLocaleContent>>;
  for (const type of LEGAL_DOCUMENT_TYPES) result[type] = {};
  const rows = await db.execute({
    sql: `SELECT key, value FROM settings WHERE key IN (${LEGAL_DOCUMENT_TYPES.map(() => "?").join(",")})`,
    args: LEGAL_DOCUMENT_TYPES.map((type) => `legal_document_${type}`)
  });
  for (const row of rows.rows) {
    const type = String(row.key).replace("legal_document_", "");
    if (!isDocumentType(type)) continue;
    try {
      const parsed = JSON.parse(String(row.value || "{}"));
      if (parsed && typeof parsed === "object") {
        result[type] = Object.fromEntries(
          Object.entries(parsed).map(([locale, document]) => {
            const entry = document && typeof document === "object"
              ? document as LegalDocumentLocaleContent
              : {} as LegalDocumentLocaleContent;
            return [locale, {
              ...entry,
              title: String(entry.title || ""),
              content: sanitizeLegalHtml(String(entry.content || ""))
            }];
          })
        );
      }
    } catch {}
  }
  return result;
}

export async function saveLegalDocument(type: string, locale: string, title: unknown, content: unknown) {
  if (!isDocumentType(type)) throw new Error("Unknown legal document type");
  const cleanLocale = locale.trim().toLowerCase();
  if (!/^[a-z]{2}(?:-[a-z]{2})?$/.test(cleanLocale)) throw new Error("Invalid locale");
  const cleanTitle = typeof title === "string" ? title.trim().slice(0, 180) : "";
  if (!cleanTitle) throw new Error("Document title is required");
  const cleanContent = sanitizeLegalHtml(content);
  if (!cleanContent) throw new Error("Document content is required");

  const allDocuments = await getAllLegalDocuments();
  allDocuments[type][cleanLocale] = { title: cleanTitle, content: cleanContent, updated_at: new Date().toISOString() };
  await db.execute({
    sql: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    args: [`legal_document_${type}`, JSON.stringify(allDocuments[type])]
  });
  return allDocuments[type][cleanLocale];
}
