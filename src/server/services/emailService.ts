import { Resend } from "resend";
import crypto from "crypto";
import { db } from "../../db.js";
import { EmailTemplate, EmailTemplateToken } from "../../lib/types.js";

// Lazy-loaded Resend client
let resendClient: Resend | null = null;

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey.trim());
  }
  return resendClient;
}

export interface EmailTemplateData {
  recipientName?: string;
  studioName?: string;
  actionUrl?: string;
  actionText?: string;
  headline?: string;
  message?: string;
  magicLinkType?: "signup" | "login";
  expiresInMinutes?: number;
  additionalNotes?: string;
  details?: Record<string, string | number | undefined | null>;
  footerText?: string;
  projectName?: string;
  projectStatus?: string;
  galleryUrl?: string;
  photoCount?: number | string;
  videoCount?: number | string;
  downloadPin?: string;
  userEmail?: string;
  temporaryPassword?: string;
  accountRole?: string;
  inquiryDetails?: {
    name: string;
    email: string;
    phone?: string;
    property_address?: string;
    subject?: string;
    message: string;
  };
  [key: string]: any;
}

export interface SendEmailOptions {
  to: string | string[];
  subject?: string;
  templateId: string;
  templateData?: EmailTemplateData;
  customHtml?: string;
  customText?: string;
  from?: string;
  replyTo?: string;
}

export interface EmailSenderConfig {
  fromEmail: string;
  fromName: string;
  replyToEmail: string;
  adminNotificationEmail: string;
  footerText: string;
  studioName: string;
  brandDisplay: "logo_only" | "logo_and_name" | "name_only";
  logoUrl: string;
  lightLogoUrl: string;
  logoAltText: string;
}

// Fetch sender configuration from database settings or environment variables
export async function getEmailSenderConfig(): Promise<EmailSenderConfig> {
  let studioName = "SPS Studio";
  let fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  let fromName = process.env.RESEND_FROM_NAME || "SPS Studio";
  let replyToEmail = process.env.RESEND_REPLY_TO || "contact@spsstudio.com";
  let adminNotificationEmail = "spsstudiokft@gmail.com";
  let footerText = "SPS Studio · Premium Real Estate Visual Marketing · All rights reserved.";
  let headerBrandDisplay: EmailSenderConfig["brandDisplay"] = "logo_only";
  let emailBrandDisplay = "";
  let darkBackgroundLogoUrl = "";
  let fallbackLogoUrl = "";
  let logoAltText = "";

  try {
    const res = await db.execute("SELECT key, value FROM settings WHERE key LIKE 'resend_%' OR key IN ('studio_name', 'admin_notification_email', 'email_footer_text', 'email_brand_display', 'header_brand_display', 'logo_header_light', 'logo_header_dark', 'logo_alt_text', 'contact_email')");
    for (const row of res.rows) {
      const k = row.key as string;
      const v = row.value as string;
      if (k === "resend_from_email" && v?.trim()) fromEmail = v.trim();
      if (k === "resend_from_name" && v?.trim()) fromName = v.trim();
      if (k === "resend_reply_to" && v?.trim()) replyToEmail = v.trim();
      if (k === "admin_notification_email" && v?.trim()) adminNotificationEmail = v.trim();
      if (k === "email_footer_text" && v?.trim()) footerText = v.trim();
      if (k === "email_brand_display" && v?.trim()) emailBrandDisplay = v.trim();
      if (k === "header_brand_display" && ["logo_only", "logo_and_name", "name_only"].includes(v?.trim())) headerBrandDisplay = v.trim() as EmailSenderConfig["brandDisplay"];
      if (k === "logo_header_dark" && v?.trim()) darkBackgroundLogoUrl = v.trim();
      if (k === "logo_header_light" && v?.trim()) fallbackLogoUrl = v.trim();
      if (k === "logo_alt_text" && v?.trim()) logoAltText = v.trim();
      if (k === "contact_email" && v?.trim() && !replyToEmail) replyToEmail = v.trim();
      if (k === "studio_name" && v?.trim()) {
        try {
          const parsed = JSON.parse(v);
          studioName = parsed.en || Object.values(parsed)[0] || studioName;
        } catch {
          studioName = v;
        }
      }
    }
  } catch (err) {
    console.warn("Could not load email settings from DB, falling back to defaults", err);
  }

  const requestedBrandDisplay = ["logo_only", "logo_and_name", "name_only"].includes(emailBrandDisplay)
    ? emailBrandDisplay as EmailSenderConfig["brandDisplay"]
    : headerBrandDisplay;
  // Email headers use the dark blue brand background, so prefer the logo
  // specifically designed for dark surfaces. The light-surface logo remains
  // a fallback for installations that have not uploaded both variants yet.
  const configuredLogoUrl = darkBackgroundLogoUrl || fallbackLogoUrl;
  const appUrl = String(process.env.APP_URL || "").trim().replace(/\/$/, "");
  const absoluteLogoUrl = configuredLogoUrl.startsWith("/") && appUrl
    ? `${appUrl}${configuredLogoUrl}`
    : configuredLogoUrl;
  const absoluteLightLogoUrl = fallbackLogoUrl.startsWith("/") && appUrl
    ? `${appUrl}${fallbackLogoUrl}`
    : fallbackLogoUrl;

  return {
    fromEmail,
    fromName,
    replyToEmail,
    adminNotificationEmail,
    footerText,
    studioName,
    brandDisplay: requestedBrandDisplay,
    logoUrl: absoluteLogoUrl,
    lightLogoUrl: absoluteLightLogoUrl,
    logoAltText: logoAltText || studioName,
  };
}

/**
 * Default System Email Templates Dictionary (Code Fallbacks)
 */
export const DEFAULT_EMAIL_TEMPLATES: Record<string, {
  template_key: string;
  name: string;
  category: "auth" | "onboarding" | "production" | "billing" | "notifications" | "diagnostics" | "system" | "marketing";
  description: string;
  subject: string;
  body_html: string;
  body_text: string;
  available_tokens: EmailTemplateToken[];
  sample_data: Record<string, any>;
}> = {
  listing_new_property: {
    template_key: "listing_new_property",
    name: "Új ingatlan a kínálatban",
    category: "marketing",
    description: "Kézzel küldhető értesítő egy frissen publikált ingatlanhirdetéshez.",
    subject: "Új ingatlan a kínálatban: {{property_title}}",
    body_html: `<p style="font-size:16px;line-height:1.7;color:#334155">Kedves {{recipient_name}}!</p><p style="font-size:16px;line-height:1.7;color:#334155">Örömmel ajánljuk figyelmedbe legújabb ingatlanunkat:</p><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:24px 0"><div style="font-size:20px;font-weight:800;color:#0f172a">{{property_title}}</div><div style="margin-top:8px;color:#475569">{{property_address}}</div><div style="margin-top:14px;font-size:18px;font-weight:700;color:#0f172a">{{price}}</div><p style="margin:14px 0 0;color:#334155;line-height:1.6">{{property_summary}}</p></div><div style="text-align:center;margin:30px 0"><a href="{{listing_url}}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:14px 30px;border-radius:9px;font-weight:700">{{action_text}}</a></div><p style="font-size:13px;line-height:1.6;color:#64748b">Ha kérdésed van, vagy szeretnéd személyesen is megtekinteni, válaszolj erre az e-mailre.</p>`,
    body_text: `Kedves {{recipient_name}}!\n\nÚj ingatlan a kínálatban: {{property_title}}\n{{property_address}}\nIrányár: {{price}}\n\n{{property_summary}}\n\n{{action_text}}: {{listing_url}}`,
    available_tokens: [
      { token: "{{recipient_name}}", label: "Címzett neve", description: "A megszólításban használt név", example: "Kata" },
      { token: "{{property_title}}", label: "Ingatlan neve", description: "A hirdetés címe", example: "Panorámás penthouse a Rózsadombon" },
      { token: "{{property_address}}", label: "Cím", description: "Az ingatlan címe vagy városrésze", example: "1025 Budapest, Rózsadomb" },
      { token: "{{price}}", label: "Irányár", description: "Megjelenített vételár", example: "249 000 000 Ft" },
      { token: "{{property_summary}}", label: "Rövid leírás", description: "Az ingatlan legfontosabb előnyei", example: "160 m², 4 szoba, nagy terasz és lenyűgöző panoráma." },
      { token: "{{listing_url}}", label: "Hirdetés linkje", description: "A publikus hirdetés URL-je", example: "https://example.com/ingatlan/rozsadomb-penthouse" },
      { token: "{{action_text}}", label: "Gomb szövege", description: "Felhívás a hirdetés megnyitására", example: "Megnézem a hirdetést" },
      { token: "{{studio_name}}", label: "Márkanév", description: "A beállított iroda- vagy stúdiónév", example: "SPS Studio" }
    ],
    sample_data: { recipient_name: "Kata", property_title: "Panorámás penthouse a Rózsadombon", property_address: "1025 Budapest, Rózsadomb", price: "249 000 000 Ft", property_summary: "160 m², 4 szoba, nagy terasz és lenyűgöző panoráma.", listing_url: "https://example.com/ingatlan/rozsadomb-penthouse", action_text: "Megnézem a hirdetést", studio_name: "SPS Studio" }
  },
  listing_price_update: {
    template_key: "listing_price_update", name: "Ingatlan árfrissítés", category: "marketing", description: "Kézzel küldhető értesítő egy ingatlan új áráról vagy kedvezőbb feltételeiről.",
    subject: "Árfrissítés: {{property_title}}", body_html: `<p style="font-size:16px;line-height:1.7;color:#334155">Kedves {{recipient_name}}!</p><p style="font-size:16px;line-height:1.7;color:#334155">A korábban megtekintett ingatlan árát frissítettük.</p><div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:20px;margin:24px 0"><div style="font-size:20px;font-weight:800;color:#065f46">{{property_title}}</div><div style="margin-top:8px;color:#047857">{{property_address}}</div><div style="margin-top:16px;font-size:13px;color:#64748b;text-decoration:line-through">Korábbi ár: {{previous_price}}</div><div style="margin-top:4px;font-size:22px;font-weight:800;color:#065f46">Új ár: {{price}}</div></div><p style="font-size:15px;line-height:1.6;color:#334155">{{message}}</p><div style="text-align:center;margin:30px 0"><a href="{{listing_url}}" style="display:inline-block;background:#047857;color:#fff;text-decoration:none;padding:14px 30px;border-radius:9px;font-weight:700">{{action_text}}</a></div>`, body_text: `Kedves {{recipient_name}}!\n\nÁrfrissítés: {{property_title}}\n{{property_address}}\nKorábbi ár: {{previous_price}}\nÚj ár: {{price}}\n\n{{message}}\n\n{{action_text}}: {{listing_url}}`,
    available_tokens: [
      { token: "{{recipient_name}}", label: "Címzett neve", description: "A megszólításban használt név", example: "Kata" }, { token: "{{property_title}}", label: "Ingatlan neve", description: "A hirdetés címe", example: "Panorámás penthouse a Rózsadombon" }, { token: "{{property_address}}", label: "Cím", description: "Az ingatlan címe vagy városrésze", example: "1025 Budapest, Rózsadomb" }, { token: "{{previous_price}}", label: "Korábbi ár", description: "A frissítés előtti ár", example: "269 000 000 Ft" }, { token: "{{price}}", label: "Új ár", description: "Az új irányár", example: "249 000 000 Ft" }, { token: "{{message}}", label: "Üzenet", description: "Rövid kiegészítő információ", example: "Szívesen egyeztetünk személyes megtekintést is." }, { token: "{{listing_url}}", label: "Hirdetés linkje", description: "A publikus hirdetés URL-je", example: "https://example.com/ingatlan/rozsadomb-penthouse" }, { token: "{{action_text}}", label: "Gomb szövege", description: "Felhívás a hirdetés megnyitására", example: "Megnézem az új árat" }
    ], sample_data: { recipient_name: "Kata", property_title: "Panorámás penthouse a Rózsadombon", property_address: "1025 Budapest, Rózsadomb", previous_price: "269 000 000 Ft", price: "249 000 000 Ft", message: "Szívesen egyeztetünk személyes megtekintést is.", listing_url: "https://example.com/ingatlan/rozsadomb-penthouse", action_text: "Megnézem az új árat" }
  },
  listing_viewing_invitation: {
    template_key: "listing_viewing_invitation", name: "Ingatlanmegtekintési meghívó", category: "marketing", description: "Kézzel küldhető meghívó nyílt naphoz vagy személyes ingatlanmegtekintéshez.",
    subject: "Meghívó megtekintésre: {{property_title}}", body_html: `<p style="font-size:16px;line-height:1.7;color:#334155">Kedves {{recipient_name}}!</p><p style="font-size:16px;line-height:1.7;color:#334155">Szeretettel várunk a következő ingatlan megtekintésére.</p><div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;margin:24px 0"><div style="font-size:20px;font-weight:800;color:#1e3a8a">{{property_title}}</div><div style="margin-top:8px;color:#1d4ed8">{{property_address}}</div><div style="margin-top:16px;color:#334155"><strong>Időpont:</strong> {{viewing_date}}<br/><strong>Találkozó:</strong> {{viewing_details}}</div></div><p style="font-size:15px;line-height:1.6;color:#334155">{{message}}</p><div style="text-align:center;margin:30px 0"><a href="{{listing_url}}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:14px 30px;border-radius:9px;font-weight:700">{{action_text}}</a></div>`, body_text: `Kedves {{recipient_name}}!\n\nMeghívó megtekintésre: {{property_title}}\n{{property_address}}\nIdőpont: {{viewing_date}}\nTalálkozó: {{viewing_details}}\n\n{{message}}\n\n{{action_text}}: {{listing_url}}`,
    available_tokens: [
      { token: "{{recipient_name}}", label: "Címzett neve", description: "A megszólításban használt név", example: "Kata" }, { token: "{{property_title}}", label: "Ingatlan neve", description: "A hirdetés címe", example: "Panorámás penthouse a Rózsadombon" }, { token: "{{property_address}}", label: "Cím", description: "Az ingatlan címe", example: "1025 Budapest, Rózsadomb" }, { token: "{{viewing_date}}", label: "Időpont", description: "A megtekintés dátuma és ideje", example: "2026. szeptember 5., péntek 16:30" }, { token: "{{viewing_details}}", label: "Találkozó részletei", description: "Kapucsengő, kapcsolattartó vagy egyéb tudnivaló", example: "A főbejáratnál várjuk." }, { token: "{{message}}", label: "Üzenet", description: "Kiegészítő meghívó szöveg", example: "Kérjük, jelezd vissza részvételi szándékodat!" }, { token: "{{listing_url}}", label: "Hirdetés linkje", description: "A publikus hirdetés URL-je", example: "https://example.com/ingatlan/rozsadomb-penthouse" }, { token: "{{action_text}}", label: "Gomb szövege", description: "Felhívás a hirdetés megnyitására", example: "Megnézem a részleteket" }
    ], sample_data: { recipient_name: "Kata", property_title: "Panorámás penthouse a Rózsadombon", property_address: "1025 Budapest, Rózsadomb", viewing_date: "2026. szeptember 5., péntek 16:30", viewing_details: "A főbejáratnál várjuk.", message: "Kérjük, jelezd vissza részvételi szándékodat!", listing_url: "https://example.com/ingatlan/rozsadomb-penthouse", action_text: "Megnézem a részleteket" }
  },
  welcome_property_seeker: {
    template_key: "welcome_property_seeker", name: "Welcome – ingatlankereső", category: "marketing", description: "Manuálisan kiküldhető üdvözlő e-mail új érdeklődőknek és ingatlankeresőknek.",
    subject: "Üdvözlünk! Találjuk meg együtt az ideális ingatlant", body_html: `<p style="font-size:16px;line-height:1.7;color:#334155">Kedves {{recipient_name}}!</p><p style="font-size:16px;line-height:1.7;color:#334155">Köszönjük az érdeklődésedet, és üdvözlünk a {{studio_name}} kínálatában.</p><p style="font-size:16px;line-height:1.7;color:#334155">Célunk, hogy a számodra valóban releváns otthonokat és befektetési lehetőségeket mutassuk meg. {{message}}</p><div style="text-align:center;margin:30px 0"><a href="{{action_url}}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:14px 30px;border-radius:9px;font-weight:700">{{action_text}}</a></div><p style="font-size:13px;line-height:1.6;color:#64748b">Válaszolj erre az e-mailre a főbb elképzeléseiddel, és személyre szabott ajánlásokkal jelentkezünk.</p>`, body_text: `Kedves {{recipient_name}}!\n\nKöszönjük az érdeklődésedet, és üdvözlünk a {{studio_name}} kínálatában.\n\n{{message}}\n\n{{action_text}}: {{action_url}}\n\nÍrd meg nekünk a főbb elképzeléseidet, és személyre szabott ajánlásokkal jelentkezünk.`,
    available_tokens: [
      { token: "{{recipient_name}}", label: "Címzett neve", description: "Az érdeklődő neve", example: "Kata" }, { token: "{{message}}", label: "Személyes üzenet", description: "Opcionális rövid személyes kiegészítés", example: "Már dolgozunk a megadott igényeidnek megfelelő ajánlatokon." }, { token: "{{action_url}}", label: "Link", description: "A kínálat vagy kereső URL-je", example: "https://example.com/ingatlanok" }, { token: "{{action_text}}", label: "Gomb szövege", description: "A gomb felirata", example: "Megnézem a kínálatot" }, { token: "{{studio_name}}", label: "Márkanév", description: "A beállított iroda- vagy stúdiónév", example: "SPS Studio" }
    ], sample_data: { recipient_name: "Kata", message: "Már dolgozunk a megadott igényeidnek megfelelő ajánlatokon.", action_url: "https://example.com/ingatlanok", action_text: "Megnézem a kínálatot", studio_name: "SPS Studio" }
  },
  welcome_property_partner: {
    template_key: "welcome_property_partner", name: "Welcome – eladó / partner", category: "marketing", description: "Manuálisan kiküldhető üdvözlő e-mail új eladóknak, tulajdonosoknak és közvetítő partnereknek.",
    subject: "Üdvözlünk a {{studio_name}} partnerei között", body_html: `<p style="font-size:16px;line-height:1.7;color:#334155">Kedves {{recipient_name}}!</p><p style="font-size:16px;line-height:1.7;color:#334155">Köszönjük a bizalmat, örülünk, hogy együtt dolgozhatunk az ingatlanod sikeres bemutatásán.</p><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:24px 0"><div style="font-size:15px;font-weight:800;color:#0f172a">A következő lépések</div><ol style="margin:12px 0 0;padding-left:20px;color:#334155;line-height:1.8"><li>Egyeztetjük az ingatlan és a hirdetés részleteit.</li><li>Elkészítjük a professzionális bemutató anyagokat.</li><li>Elindítjuk a hirdetést és folyamatosan tájékoztatunk.</li></ol></div><p style="font-size:15px;line-height:1.6;color:#334155">{{message}}</p><div style="text-align:center;margin:30px 0"><a href="{{action_url}}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:14px 30px;border-radius:9px;font-weight:700">{{action_text}}</a></div>`, body_text: `Kedves {{recipient_name}}!\n\nKöszönjük a bizalmat, örülünk, hogy együtt dolgozhatunk az ingatlanod sikeres bemutatásán.\n\nA következő lépések: egyeztetjük a részleteket, elkészítjük a bemutató anyagokat, majd elindítjuk a hirdetést.\n\n{{message}}\n\n{{action_text}}: {{action_url}}`,
    available_tokens: [
      { token: "{{recipient_name}}", label: "Címzett neve", description: "A partner vagy tulajdonos neve", example: "Kata" }, { token: "{{message}}", label: "Személyes üzenet", description: "Opcionális rövid személyes kiegészítés", example: "Hamarosan keressük az első egyeztetés időpontjával." }, { token: "{{action_url}}", label: "Link", description: "A portál, feltöltő vagy kapcsolatfelvételi oldal URL-je", example: "https://example.com/kapcsolat" }, { token: "{{action_text}}", label: "Gomb szövege", description: "A gomb felirata", example: "Kapcsolatfelvétel" }, { token: "{{studio_name}}", label: "Márkanév", description: "A beállított iroda- vagy stúdiónév", example: "SPS Studio" }
    ], sample_data: { recipient_name: "Kata", message: "Hamarosan keressük az első egyeztetés időpontjával.", action_url: "https://example.com/kapcsolat", action_text: "Kapcsolatfelvétel", studio_name: "SPS Studio" }
  },
  account_registration_success: {
    template_key: "account_registration_success",
    name: "Sikeres fiókregisztráció",
    category: "onboarding",
    description: "Automatikus visszaigazolás, amely a fiók sikeres létrehozása után érkezik meg.",
    subject: "Sikeres regisztráció · {{studio_name}}",
    body_html: `<p style="color:#1e293b;font-size:15px;line-height:1.65;margin:0 0 16px;">Kedves <strong>{{user.name}}</strong>!</p><p style="color:#1e293b;font-size:15px;line-height:1.65;margin:0 0 20px;">Sikeresen létrehoztuk a fiókodat a(z) <strong>{{studio_name}}</strong> rendszerében.</p><table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:13px;color:#1e293b;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;"><tbody><tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 14px;font-weight:600;color:#64748b;width:42%;">Fiók email-címe</td><td style="padding:10px 14px;font-family:monospace;">{{user.email}}</td></tr><tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:10px 14px;font-weight:600;color:#64748b;">Regisztráció módja</td><td style="padding:10px 14px;">{{registration_method}}</td></tr><tr><td style="padding:10px 14px;font-weight:600;color:#64748b;">Időpont</td><td style="padding:10px 14px;">{{registered_date}}</td></tr></tbody></table><div style="text-align:center;margin:30px 0;"><a href="{{action_url}}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:14px 30px;border-radius:9px;font-weight:700;">{{action_text}}</a></div><p style="color:#64748b;font-size:13px;line-height:1.55;margin:20px 0 0;">Ha nem te hoztad létre ezt a fiókot, kérjük, haladéktalanul válaszolj erre az e-mailre.</p>`,
    body_text: `Kedves {{user.name}}!\n\nSikeresen létrehoztuk a fiókodat a(z) {{studio_name}} rendszerében.\n\nEmail: {{user.email}}\nRegisztráció módja: {{registration_method}}\nIdőpont: {{registered_date}}\n\n{{action_text}}: {{action_url}}\n\nHa nem te hoztad létre ezt a fiókot, kérjük, haladéktalanul válaszolj erre az e-mailre.`,
    available_tokens: [
      { token: "{{user.name}}", label: "Felhasználó neve", description: "Megszólítás", example: "Kata" },
      { token: "{{user.email}}", label: "Fiók email-címe", description: "A regisztrált email-cím", example: "kata@example.com" },
      { token: "{{registration_method}}", label: "Regisztráció módja", description: "A fióklétrehozás módja", example: "Email és jelszó" },
      { token: "{{registered_date}}", label: "Regisztráció időpontja", description: "A sikeres létrehozás dátuma", example: "2026. augusztus 28." },
      { token: "{{action_url}}", label: "Portál linkje", description: "A megfelelő portál URL-je", example: "https://example.com/client" },
      { token: "{{action_text}}", label: "Gomb szövege", description: "A fő művelet felirata", example: "Portál megnyitása" },
      { token: "{{studio_name}}", label: "Márkanév", description: "A beállított stúdiónév", example: "SPS Studio" }
    ],
    sample_data: { "user.name": "Kata", recipient_name: "Kata", "user.email": "kata@example.com", registration_method: "Email és jelszó", registered_date: "2026. augusztus 28.", action_url: "https://example.com/client", action_text: "Portál megnyitása", studio_name: "SPS Studio" }
  },

  two_factor_status_changed: {
    template_key: "two_factor_status_changed",
    name: "Kétfaktoros hitelesítés állapotváltozása",
    category: "auth",
    description: "Biztonsági értesítés a kétfaktoros hitelesítés sikeres be- vagy kikapcsolásáról.",
    subject: "Kétfaktoros hitelesítés {{two_factor_status}} · {{studio_name}}",
    body_html: `<p style="color:#1e293b;font-size:15px;line-height:1.65;margin:0 0 16px;">Kedves <strong>{{user.name}}</strong>!</p><p style="color:#1e293b;font-size:15px;line-height:1.65;margin:0 0 20px;">A(z) <strong>{{studio_name}}</strong> {{account_context_label}} fiókodban a kétfaktoros hitelesítés állapota megváltozott.</p><div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px 18px;margin:22px 0;color:#1e3a8a;font-size:14px;line-height:1.65;"><strong>Állapot:</strong> {{two_factor_status}}<br/><strong>Módszer:</strong> {{two_factor_method}}<br/><strong>Időpont:</strong> {{event_date}}</div><p style="color:#64748b;font-size:13px;line-height:1.55;margin:20px 0;">Ha nem te kezdeményezted ezt a módosítást, azonnal változtasd meg a jelszavadat és vedd fel velünk a kapcsolatot.</p><div style="text-align:center;margin:30px 0;"><a href="{{action_url}}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:14px 30px;border-radius:9px;font-weight:700;">{{action_text}}</a></div>`,
    body_text: `Kedves {{user.name}}!\n\nA {{studio_name}} {{account_context_label}} fiókodban a kétfaktoros hitelesítés állapota megváltozott.\n\nÁllapot: {{two_factor_status}}\nMódszer: {{two_factor_method}}\nIdőpont: {{event_date}}\n\n{{action_text}}: {{action_url}}\n\nHa nem te kezdeményezted ezt a módosítást, azonnal változtasd meg a jelszavadat és vedd fel velünk a kapcsolatot.`,
    available_tokens: [
      { token: "{{user.name}}", label: "Felhasználó neve", description: "Megszólítás", example: "Kata" }, { token: "{{user.email}}", label: "Felhasználó email-címe", description: "Az érintett fiók email-címe", example: "kata@example.com" }, { token: "{{account_context_label}}", label: "Fiók típusa", description: "Ügyfél- vagy adminfiók", example: "ügyfélportál" }, { token: "{{two_factor_status}}", label: "Új állapot", description: "Be- vagy kikapcsolva", example: "bekapcsolva" }, { token: "{{two_factor_method}}", label: "Hitelesítési módszer", description: "Authenticator alkalmazás vagy emailes kód", example: "Authenticator alkalmazás" }, { token: "{{event_date}}", label: "Módosítás időpontja", description: "A sikeres módosítás dátuma", example: "2026. augusztus 28. 14:30" }, { token: "{{action_url}}", label: "Biztonsági beállítások linkje", description: "A fiókbeállítások URL-je", example: "https://example.com/client/settings" }, { token: "{{action_text}}", label: "Gomb szövege", description: "A fő művelet felirata", example: "Biztonsági beállítások" }, { token: "{{studio_name}}", label: "Márkanév", description: "A beállított stúdiónév", example: "SPS Studio" }
    ],
    sample_data: { "user.name": "Kata", recipient_name: "Kata", "user.email": "kata@example.com", account_context_label: "ügyfélportál", two_factor_status: "bekapcsolva", two_factor_method: "Authenticator alkalmazás", event_date: "2026. augusztus 28. 14:30", action_url: "https://example.com/client/settings", action_text: "Biztonsági beállítások", studio_name: "SPS Studio" }
  },

  password_reset_success: {
    template_key: "password_reset_success",
    name: "Sikeres jelszó-visszaállítás",
    category: "auth",
    description: "Biztonsági értesítés, amely akkor érkezik, amikor a jelszó-visszaállítási linkkel új jelszót állítottak be.",
    subject: "A jelszavad sikeresen megváltozott · {{studio_name}}",
    body_html: `<p style="color:#1e293b;font-size:15px;line-height:1.65;margin:0 0 16px;">Kedves <strong>{{user.name}}</strong>!</p><p style="color:#1e293b;font-size:15px;line-height:1.65;margin:0 0 20px;">Sikeresen beállítottak egy új jelszót a(z) <strong>{{studio_name}}</strong> fiókodhoz.</p><div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:16px 18px;margin:22px 0;color:#065f46;font-size:14px;line-height:1.65;"><strong>Fiók:</strong> {{user.email}}<br/><strong>Jelszó megváltoztatva:</strong> {{password_changed_at}}</div><p style="color:#64748b;font-size:13px;line-height:1.55;margin:20px 0;">Ha nem te állítottál be új jelszót, azonnal vedd fel velünk a kapcsolatot.</p><div style="text-align:center;margin:30px 0;"><a href="{{action_url}}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:14px 30px;border-radius:9px;font-weight:700;">{{action_text}}</a></div>`,
    body_text: `Kedves {{user.name}}!\n\nSikeresen beállítottak egy új jelszót a(z) {{studio_name}} fiókodhoz.\n\nFiók: {{user.email}}\nJelszó megváltoztatva: {{password_changed_at}}\n\n{{action_text}}: {{action_url}}\n\nHa nem te állítottál be új jelszót, azonnal vedd fel velünk a kapcsolatot.`,
    available_tokens: [
      { token: "{{user.name}}", label: "Felhasználó neve", description: "Megszólítás", example: "Kata" }, { token: "{{user.email}}", label: "Felhasználó email-címe", description: "Az érintett fiók email-címe", example: "kata@example.com" }, { token: "{{password_changed_at}}", label: "Jelszóváltoztatás időpontja", description: "A sikeres visszaállítás dátuma", example: "2026. augusztus 28. 14:30" }, { token: "{{action_url}}", label: "Bejelentkezési oldal", description: "A belépési oldal URL-je", example: "https://example.com/client/login" }, { token: "{{action_text}}", label: "Gomb szövege", description: "A fő művelet felirata", example: "Bejelentkezés" }, { token: "{{studio_name}}", label: "Márkanév", description: "A beállított stúdiónév", example: "SPS Studio" }
    ],
    sample_data: { "user.name": "Kata", recipient_name: "Kata", "user.email": "kata@example.com", password_changed_at: "2026. augusztus 28. 14:30", action_url: "https://example.com/client/login", action_text: "Bejelentkezés", studio_name: "SPS Studio" }
  },

  password_reset: {
    template_key: "password_reset",
    name: "Password Reset / Recovery",
    category: "auth",
    description: "Dispatched when an administrator or client requests a password recovery link.",
    subject: "Reset your password for {{studio_name}}",
    body_html: `
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
  Hello <strong>{{user.name}}</strong>,
</p>
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
  We received a request to reset the password for your account associated with <strong>{{studio_name}}</strong>. Click the secure button below to choose a new password:
</p>

<div style="text-align: center; margin: 32px 0;">
  <a href="{{reset_link}}" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    {{action_text}}
  </a>
</div>

<div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 14px; margin: 24px 0;">
  <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
    <strong>Security Notice:</strong> This password reset link expires in <strong>{{expiry_minutes}} minutes</strong>. If you did not request a password reset, you can safely ignore this email; your account credentials remain unchanged.
  </p>
</div>

<p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 16px 0 0 0; word-break: break-all;">
  If the button above does not work, copy and paste this URL into your browser:<br/>
  <a href="{{reset_link}}" style="color: #3b82f6;">{{reset_link}}</a>
</p>
    `.trim(),
    body_text: `Hello {{user.name}},\n\nWe received a request to reset your password for {{studio_name}}.\n\nReset Link: {{reset_link}}\n(Expires in {{expiry_minutes}} minutes)\n\nIf you did not request this, please ignore this email.`.trim(),
    available_tokens: [
      { token: "{{user.name}}", label: "User Name", description: "Display name or email username", example: "Marcus Vance" },
      { token: "{{user.email}}", label: "User Email", description: "Recipient email address", example: "marcus@example.com" },
      { token: "{{reset_link}}", label: "Reset Password Link", description: "Secure tokenized reset URL", example: "https://spsstudio.com/client/reset-password?token=sample_token" },
      { token: "{{action_url}}", label: "Action URL", description: "Alias for reset password URL", example: "https://spsstudio.com/client/reset-password?token=sample_token" },
      { token: "{{action_text}}", label: "Action Button Text", description: "Label for the primary CTA button", example: "Reset Password" },
      { token: "{{expiry_minutes}}", label: "Expiration Minutes", description: "Validity duration of the token", example: "60" },
      { token: "{{studio_name}}", label: "Studio Name", description: "Name of the photography studio", example: "SPS Studio" },
      { token: "{{footer_text}}", label: "Footer Text", description: "Copyright & studio address notice", example: "SPS Studio · All rights reserved." }
    ],
    sample_data: {
      "user.name": "Marcus Vance",
      "recipient_name": "Marcus Vance",
      "user.email": "marcus@example.com",
      "reset_link": "https://spsstudio.com/client/reset-password?token=sample_token_123",
      "action_url": "https://spsstudio.com/client/reset-password?token=sample_token_123",
      "action_text": "Reset Password",
      "expiry_minutes": "60",
      "studio_name": "SPS Studio"
    }
  },

  auth_2fa_code: {
    template_key: "auth_2fa_code",
    name: "Kétlépcsős ellenőrzőkód",
    category: "auth",
    description: "Egyszer használatos emailkód belépés, 2FA-bekapcsolás vagy kikapcsolás megerősítéséhez.",
    subject: "Bejelentkezés megerősítése · {{studio_name}}",
    body_html: `
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
  Kedves <strong>{{user.name}}</strong>!
</p>
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
  A(z) <strong>{{studio_name}}</strong> {{account_context_label}} felületén a következő műveletet kezdeményezték: <strong>{{verification_purpose_label}}</strong>.
</p>

<div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 24px 16px; margin: 28px 0; text-align: center;">
  <p style="margin: 0 0 10px 0; color: #1e40af; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;">
    Egyszer használatos ellenőrzőkód
  </p>
  <div style="color: #0f172a; font-family: 'Courier New', Courier, monospace; font-size: 34px; line-height: 1.2; font-weight: 800; letter-spacing: 0.22em; white-space: nowrap;">
    {{verification_code}}
  </div>
</div>

<div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 16px; margin: 24px 0;">
  <p style="margin: 0 0 5px 0; color: #92400e; font-size: 13px; font-weight: 700;">
    Biztonsági tájékoztató
  </p>
  <p style="margin: 0; color: #92400e; font-size: 12px; line-height: 1.6;">
    A kód <strong>{{expiry_minutes}} percig</strong> érvényes, egyszer használható, és munkatársaink soha nem kérik el telefonon vagy üzenetben. Ha nem te kezdeményezted a műveletet, ne add meg senkinek.
  </p>
</div>

<p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 18px 0 0 0;">
  A kérést ekkor rögzítettük: {{request_time}}.
</p>
    `.trim(),
    body_text: `Kedves {{user.name}}!\n\nA(z) {{studio_name}} {{account_context_label}} felületén ezt a műveletet kezdeményezték: {{verification_purpose_label}}.\n\nEgyszer használatos ellenőrzőkód: {{verification_code}}\n\nA kód {{expiry_minutes}} percig érvényes. Ha nem te kezdeményezted a műveletet, ne add meg senkinek.\n\nKérés időpontja: {{request_time}}.`.trim(),
    available_tokens: [
      { token: "{{user.name}}", label: "Felhasználó neve", description: "A címzett megjelenített neve", example: "Kovács Anna" },
      { token: "{{verification_code}}", label: "Ellenőrzőkód", description: "Nyolcjegyű egyszer használatos kód", example: "48273105" },
      { token: "{{verification_purpose_label}}", label: "Művelet", description: "Belépés, bekapcsolás vagy kikapcsolás", example: "bejelentkezés megerősítése" },
      { token: "{{account_context_label}}", label: "Fióktípus", description: "Admin- vagy kliensportál", example: "adminisztrációs" },
      { token: "{{expiry_minutes}}", label: "Lejárat percben", description: "A kód érvényességi ideje", example: "5" },
      { token: "{{request_time}}", label: "Kérés időpontja", description: "A kód létrehozásának helyi időpontja", example: "2026. 08. 27. 10:15" },
      { token: "{{studio_name}}", label: "Stúdiónév", description: "A beállított stúdiónév", example: "SPS Studio" }
    ],
    sample_data: {
      "user.name": "Kovács Anna",
      "recipient_name": "Kovács Anna",
      "verification_code": "48273105",
      "verification_purpose_label": "bejelentkezés megerősítése",
      "account_context_label": "adminisztrációs",
      "expiry_minutes": "5",
      "request_time": "2026. 08. 27. 10:15",
      "studio_name": "SPS Studio",
      "header_subtitle": "Biztonságos fiókhozzáférés"
    }
  },

  magic_link_login: {
    template_key: "magic_link_login",
    name: "Magic Link Sign-in",
    category: "auth",
    description: "Dispatched for passwordless client portal one-click authentication.",
    subject: "Your magic login link · {{studio_name}}",
    body_html: `
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
  Hello <strong>{{user.name}}</strong>,
</p>
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
  Click the button below to instantly sign in to your <strong>{{studio_name}}</strong> client account without typing a password:
</p>

<div style="text-align: center; margin: 32px 0;">
  <a href="{{magic_link}}" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 15px 36px; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    {{action_text}}
  </a>
</div>

<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 24px 0;">
  <p style="margin: 0 0 4px 0; color: #0f172a; font-size: 13px; font-weight: 600;">
    Security & Expiration Notice
  </p>
  <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.5;">
    This single-use magic login link is valid for <strong>{{expiry_minutes}} minutes</strong>. If you did not request this link, you can safely ignore this email.
  </p>
</div>

<p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 20px 0 0 0; word-break: break-all;">
  If the button above does not work, copy and paste this URL into your browser:<br/>
  <a href="{{magic_link}}" style="color: #3b82f6;">{{magic_link}}</a>
</p>
    `.trim(),
    body_text: `Hello {{user.name}},\n\nHere is your single-use magic login link for {{studio_name}}:\n\n{{magic_link}}\n\nValid for {{expiry_minutes}} minutes. If you did not request this link, please ignore this email.`.trim(),
    available_tokens: [
      { token: "{{user.name}}", label: "User Name", description: "Display name or email prefix", example: "Jane Miller" },
      { token: "{{magic_link}}", label: "Magic Link URL", description: "Single-use authorization link", example: "https://spsstudio.com/auth/magic-link?token=sample_magic_token" },
      { token: "{{action_url}}", label: "Action URL", description: "Alias for magic link URL", example: "https://spsstudio.com/auth/magic-link?token=sample_magic_token" },
      { token: "{{action_text}}", label: "Action Button Text", description: "Label for the sign-in button", example: "Sign In to Client Portal" },
      { token: "{{expiry_minutes}}", label: "Expiration Minutes", description: "Validity duration (e.g. 20)", example: "20" },
      { token: "{{studio_name}}", label: "Studio Name", description: "Brand name of the studio", example: "SPS Studio" }
    ],
    sample_data: {
      "user.name": "Jane Miller",
      "recipient_name": "Jane Miller",
      "magic_link": "https://spsstudio.com/auth/magic-link?token=sample_magic_token",
      "action_url": "https://spsstudio.com/auth/magic-link?token=sample_magic_token",
      "action_text": "Sign In to Client Portal",
      "expiry_minutes": "20",
      "studio_name": "SPS Studio"
    }
  },

  magic_link_signup: {
    template_key: "magic_link_signup",
    name: "Magic Link Registration & Sign-up",
    category: "auth",
    description: "Dispatched when a prospective client registers or is invited via magic link.",
    subject: "Complete your registration · {{studio_name}}",
    body_html: `
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
  Hello <strong>{{user.name}}</strong>,
</p>
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
  Welcome to <strong>{{studio_name}}</strong>. Click the button below to complete your client portal registration and access your property media showcases:
</p>

<div style="text-align: center; margin: 32px 0;">
  <a href="{{magic_link}}" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 15px 36px; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    {{action_text}}
  </a>
</div>

{{#if property_address}}
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 20px 0; font-size: 13px; color: #1e293b;">
  <strong>Registered Property:</strong> {{property_address}}
</div>
{{/if}}

<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 24px 0;">
  <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.5;">
    This registration link expires in <strong>{{expiry_minutes}} minutes</strong>. If you did not create an account, you can disregard this email.
  </p>
</div>

<p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 20px 0 0 0; word-break: break-all;">
  Verification Link: <a href="{{magic_link}}" style="color: #3b82f6;">{{magic_link}}</a>
</p>
    `.trim(),
    body_text: `Hello {{user.name}},\n\nComplete your client portal registration for {{studio_name}}:\n\n{{magic_link}}\n\nThis link is valid for {{expiry_minutes}} minutes.`.trim(),
    available_tokens: [
      { token: "{{user.name}}", label: "User Name", description: "Display name or email handle", example: "David Clark" },
      { token: "{{magic_link}}", label: "Magic Link URL", description: "Registration confirmation link", example: "https://spsstudio.com/auth/magic-link?token=sample_signup_token" },
      { token: "{{property_address}}", label: "Property Address", description: "Associated property location", example: "452 Harbor View Drive" },
      { token: "{{advertisement_link}}", label: "Listing Link", description: "External real estate advertisement link", example: "https://realestate.com/listing/452" },
      { token: "{{action_text}}", label: "Action Button Text", description: "Button text", example: "Complete Registration & Sign In" },
      { token: "{{expiry_minutes}}", label: "Expiration Minutes", description: "Validity window in minutes", example: "20" },
      { token: "{{studio_name}}", label: "Studio Name", description: "Studio brand name", example: "SPS Studio" }
    ],
    sample_data: {
      "user.name": "David Clark",
      "recipient_name": "David Clark",
      "magic_link": "https://spsstudio.com/auth/magic-link?token=sample_signup_token",
      "property_address": "452 Harbor View Drive, San Francisco",
      "action_url": "https://spsstudio.com/auth/magic-link?token=sample_signup_token",
      "action_text": "Complete Registration & Sign In",
      "expiry_minutes": "20",
      "studio_name": "SPS Studio"
    }
  },

  portal_invitation: {
    template_key: "portal_invitation",
    name: "Client Portal Invitation & Activation",
    category: "onboarding",
    description: "Personalized invitation sent to customers to create and activate their client portal account for private access to photo galleries, project milestones, and downloads.",
    subject: "Create your client portal account · {{studio_name}}",
    body_html: `
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
  Dear <strong>{{user.name}}</strong>,
</p>
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
  You are invited to access your dedicated <strong>{{studio_name}}</strong> Client Portal.
</p>

<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
  <h4 style="margin: 0 0 10px 0; color: #0f172a; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
    What You Can Do in Your Portal:
  </h4>
  <ul style="margin: 0; padding-left: 20px; color: #334155; font-size: 14px; line-height: 1.7;">
    <li>View private high-resolution photography galleries & video showcases</li>
    <li>Download uncompressed HDR stills, social reels, and aerial media assets</li>
    <li>Track real-time photoshoot milestones & production progress</li>
    <li>Manage your property listings and visual marketing assets in one central hub</li>
  </ul>
</div>

{{#if property_address}}
<div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px 16px; margin: 20px 0; font-size: 13px; color: #1e40af;">
  <strong>Associated Listing:</strong> {{property_address}}
</div>
{{/if}}

<div style="text-align: center; margin: 32px 0;">
  <a href="{{invitation_link}}" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 15px 36px; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    {{action_text}}
  </a>
</div>

<div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 14px; margin: 24px 0;">
  <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
    <strong>Security Notice:</strong> This single-use invitation link is secure and valid for <strong>{{expiry_hours}} hours</strong>. Click the button above to activate your account and get started immediately.
  </p>
</div>

<p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 20px 0 0 0; word-break: break-all;">
  If the button above does not work, copy and paste this link into your web browser:<br/>
  <a href="{{invitation_link}}" style="color: #3b82f6;">{{invitation_link}}</a>
</p>
    `.trim(),
    body_text: `Dear {{user.name}},\n\nYou are invited to activate your client portal account on {{studio_name}}.\n\nWith your client portal, you can view photo galleries, download high-res assets, and track production milestones.\n\nActivate your account here:\n{{invitation_link}}\n\n(This secure link is valid for {{expiry_hours}} hours)`.trim(),
    available_tokens: [
      { token: "{{user.name}}", label: "Customer Name", description: "Customer full name or greeting", example: "Alexander Sterling" },
      { token: "{{user.email}}", label: "Customer Email", description: "Customer registered email address", example: "alexander@sterlingestates.com" },
      { token: "{{invitation_link}}", label: "Invitation Link", description: "Secure single-use portal activation link", example: "https://spsstudio.com/auth/magic-link?token=sample_invite_token" },
      { token: "{{action_url}}", label: "Action URL", description: "Alias for invitation URL", example: "https://spsstudio.com/auth/magic-link?token=sample_invite_token" },
      { token: "{{action_text}}", label: "Button Label", description: "Call-to-action button text", example: "Activate Client Portal Account" },
      { token: "{{property_address}}", label: "Property Address", description: "Associated property location", example: "880 Ocean Drive, Miami Beach, FL" },
      { token: "{{advertisement_link}}", label: "Listing Link", description: "External real estate advertisement link", example: "https://realestate.com/listing/880" },
      { token: "{{expiry_hours}}", label: "Expiration Hours", description: "Validity duration of the invitation link", example: "48" },
      { token: "{{studio_name}}", label: "Studio Name", description: "Studio brand name", example: "SPS Studio" },
      { token: "{{footer_text}}", label: "Footer Notice", description: "Copyright and footer notice", example: "SPS Studio · All rights reserved." }
    ],
    sample_data: {
      "user.name": "Alexander Sterling",
      "recipient_name": "Alexander Sterling",
      "user.email": "alexander@sterlingestates.com",
      "invitation_link": "https://spsstudio.com/auth/magic-link?token=sample_portal_invite_token",
      "action_url": "https://spsstudio.com/auth/magic-link?token=sample_portal_invite_token",
      "action_text": "Activate Client Portal Account",
      "property_address": "880 Ocean Drive, Miami Beach, FL",
      "advertisement_link": "https://realestate.com/listing/880",
      "expiry_hours": "48",
      "studio_name": "SPS Studio"
    }
  },

  portal_coupon_invitation: {
    template_key: "portal_coupon_invitation",
    name: "Client Portal Invitation with Coupon Code",
    category: "onboarding",
    description: "Client portal activation invitation that includes an administrator-provided coupon or invitation code. The code is also securely attached to the registration link.",
    subject: "Your client portal invitation and code · {{studio_name}}",
    body_html: `
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Dear <strong>{{user.name}}</strong>,</p>
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">You are invited to activate your dedicated <strong>{{studio_name}}</strong> Client Portal.</p>
<div style="background-color: #eff6ff; border: 1px solid #93c5fd; border-radius: 8px; padding: 18px; margin: 20px 0; text-align: center;">
  <div style="color: #1e3a8a; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;">Your coupon / invitation code</div>
  <div style="margin-top: 8px; color: #0f172a; font-family: monospace; font-size: 22px; font-weight: 800; letter-spacing: .08em;">{{coupon_code}}</div>
</div>
<p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">The code will be carried over automatically when you use the secure activation link below. You can also enter it manually during registration if needed.</p>
<div style="text-align: center; margin: 32px 0;"><a href="{{invitation_link}}" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 15px 36px; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block;">{{action_text}}</a></div>
<p style="color: #92400e; font-size: 13px; line-height: 1.5;">This single-use activation link is valid for <strong>{{expiry_hours}} hours</strong>.</p>
<p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 20px 0 0; word-break: break-all;">If the button does not work, copy this link into your browser:<br/><a href="{{invitation_link}}" style="color: #3b82f6;">{{invitation_link}}</a></p>`.trim(),
    body_text: `Dear {{user.name}},\n\nYou are invited to activate your {{studio_name}} Client Portal.\n\nYour coupon / invitation code: {{coupon_code}}\n\nActivate your account here:\n{{invitation_link}}\n\nThis secure link is valid for {{expiry_hours}} hours.`.trim(),
    available_tokens: [
      { token: "{{user.name}}", label: "Customer Name", description: "Customer full name or greeting", example: "Alexander Sterling" },
      { token: "{{user.email}}", label: "Customer Email", description: "Customer registered email address", example: "alexander@sterlingestates.com" },
      { token: "{{coupon_code}}", label: "Coupon Code", description: "Coupon or invitation code assigned by the administrator", example: "WELCOME-2026" },
      { token: "{{invitation_link}}", label: "Invitation Link", description: "Secure single-use portal activation link", example: "https://spsstudio.com/auth/magic-link?token=sample_invite_token" },
      { token: "{{action_url}}", label: "Action URL", description: "Alias for invitation URL", example: "https://spsstudio.com/auth/magic-link?token=sample_invite_token" },
      { token: "{{action_text}}", label: "Button Label", description: "Call-to-action button text", example: "Activate Client Portal Account" },
      { token: "{{expiry_hours}}", label: "Expiration Hours", description: "Validity duration of the invitation link", example: "48" },
      { token: "{{studio_name}}", label: "Studio Name", description: "Studio brand name", example: "SPS Studio" }
    ],
    sample_data: { "user.name": "Alexander Sterling", "user.email": "alexander@sterlingestates.com", "coupon_code": "WELCOME-2026", "invitation_link": "https://spsstudio.com/auth/magic-link?token=sample_portal_invite_token", "action_url": "https://spsstudio.com/auth/magic-link?token=sample_portal_invite_token", "action_text": "Activate Client Portal Account", "expiry_hours": "48", "studio_name": "SPS Studio" }
  },

  portal_invitation_reminder: {
    template_key: "portal_invitation_reminder",
    name: "Client Portal Invitation Expiry Reminder",
    category: "onboarding",
    description: "Automatically sent about 36 hours after a still-unused client portal invitation, shortly before its 48-hour activation link expires.",
    subject: "Reminder: only a few hours left to activate your portal · {{studio_name}}",
    body_html: `<p style="color:#1e293b;font-size:15px;line-height:1.6;">Hello <strong>{{user.name}}</strong>,</p><p style="color:#1e293b;font-size:15px;line-height:1.6;">Your secure <strong>{{studio_name}}</strong> Client Portal invitation is still waiting for you, but it will expire in approximately <strong>{{remaining_hours}} hours</strong>.</p><p style="text-align:center;margin:30px 0;"><a href="{{invitation_link}}" style="background:#0f172a;color:#fff;text-decoration:none;padding:14px 30px;border-radius:8px;font-weight:700;display:inline-block;">{{action_text}}</a></p><p style="color:#64748b;font-size:12px;line-height:1.5;word-break:break-all;">If the button does not work, copy this link: <a href="{{invitation_link}}" style="color:#3b82f6">{{invitation_link}}</a></p>`,
    body_text: `Hello {{user.name}},\n\nYour {{studio_name}} Client Portal invitation expires in approximately {{remaining_hours}} hours. Activate it here:\n{{invitation_link}}`.trim(),
    available_tokens: [
      { token: "{{user.name}}", label: "Customer Name", description: "Customer greeting", example: "Alexander Sterling" },
      { token: "{{invitation_link}}", label: "Invitation Link", description: "Original single-use activation link", example: "https://spsstudio.com/auth/magic-link?token=example" },
      { token: "{{remaining_hours}}", label: "Remaining Hours", description: "Approximate time before expiry", example: "24" },
      { token: "{{action_text}}", label: "Button Label", description: "Activation button label", example: "Activate Client Portal" },
      { token: "{{studio_name}}", label: "Studio Name", description: "Studio brand name", example: "SPS Studio" }
    ],
    sample_data: { "user.name": "Alexander Sterling", "invitation_link": "https://spsstudio.com/auth/magic-link?token=sample", "remaining_hours": "24", "action_text": "Activate Client Portal", "studio_name": "SPS Studio" }
  },

  vip_manual_coupon_assigned: {
    template_key: "vip_manual_coupon_assigned",
    name: "VIP Coupon Assigned by Admin",
    category: "vip",
    description: "Sent automatically when an administrator manually assigns a VIP coupon or reward to a client account.",
    subject: "A VIP benefit was added to your account · {{studio_name}}",
    body_html: `<p style="color:#1e293b;font-size:15px;line-height:1.6;">Hello <strong>{{user.name}}</strong>,</p><p style="color:#1e293b;font-size:15px;line-height:1.6;">We have added a VIP benefit to your SPS Studio client account.</p><div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:10px;padding:18px;margin:22px 0;"><div style="font-size:12px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#1e3a8a;">{{reward_title}}</div><div style="margin-top:8px;font-size:21px;font-weight:800;color:#0f172a;">{{reward_value_label}}</div><div style="margin-top:12px;font-family:monospace;font-weight:800;letter-spacing:.07em;color:#0369a1;">{{voucher_code}}</div></div><p style="color:#475569;font-size:14px;line-height:1.6;">{{reward_description}}</p><p style="color:#92400e;font-size:13px;line-height:1.5;">Valid until: <strong>{{expires_at}}</strong>.</p><p style="text-align:center;margin:28px 0;"><a href="{{action_url}}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:700;">{{action_text}}</a></p>`,
    body_text: `Hello {{user.name}},\n\nA VIP benefit was added to your SPS Studio account.\n\n{{reward_title}}: {{reward_value_label}}\nCoupon code: {{voucher_code}}\n{{reward_description}}\nValid until: {{expires_at}}\n\nView your VIP benefits: {{action_url}}`.trim(),
    available_tokens: [
      { token: "{{user.name}}", label: "Customer Name", description: "Customer greeting", example: "Alexander Sterling" },
      { token: "{{reward_title}}", label: "Reward Title", description: "Admin-provided coupon title", example: "Welcome benefit" },
      { token: "{{reward_value_label}}", label: "Reward Value", description: "Formatted discount or credit", example: "15% discount" },
      { token: "{{voucher_code}}", label: "Coupon Code", description: "Unique redeemable voucher", example: "BONUS-A1B2C3D4" },
      { token: "{{reward_description}}", label: "Reward Description", description: "Admin-provided conditions", example: "Valid for your next booking." },
      { token: "{{expires_at}}", label: "Expiry Date", description: "Voucher expiry", example: "2026. 09. 30." },
      { token: "{{action_url}}", label: "VIP Portal URL", description: "Link to VIP benefits", example: "https://spsstudio.com/client/referrals" },
      { token: "{{action_text}}", label: "Button Label", description: "CTA label", example: "View VIP Benefits" },
      { token: "{{studio_name}}", label: "Studio Name", description: "Studio brand name", example: "SPS Studio" }
    ],
    sample_data: { "user.name": "Alexander Sterling", "reward_title": "Welcome benefit", "reward_value_label": "15% discount", "voucher_code": "BONUS-A1B2C3D4", "reward_description": "Valid for your next booking.", "expires_at": "2026. 09. 30.", "action_url": "https://spsstudio.com/client/referrals", "action_text": "View VIP Benefits", "studio_name": "SPS Studio" }
  },

  admin_invitation: {
    template_key: "admin_invitation",
    name: "Admin & Team Member Invitation",
    category: "onboarding",
    description: "Personalized invitation sent to new team members and administrators to join the studio workspace with designated role permissions.",
    subject: "You've been invited to {{studio_name}} as {{role}}",
    body_html: `
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
  Hello <strong>{{recipient_name}}</strong>,
</p>
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
  <strong>{{inviter_name}}</strong> has invited you to join the <strong>{{studio_name}}</strong> management portal as <strong style="color: #0284c7; text-transform: uppercase;">{{role}}</strong>.
</p>

{{#if custom_message}}
<div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 4px; padding: 14px 18px; margin: 20px 0;">
  <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 6px;">Message from {{inviter_name}}:</div>
  <div style="font-size: 14px; color: #1e293b; line-height: 1.5; font-style: italic;">
    "{{custom_message}}"
  </div>
</div>
{{/if}}

<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
  <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 8px;">
    Assigned Role & Access:
  </div>
  <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #1e293b;">
    <tbody>
      <tr>
        <td style="padding: 6px 0; font-weight: 600; color: #475569; width: 110px;">Role:</td>
        <td style="padding: 6px 0;"><span style="background-color: #e0f2fe; color: #0369a1; font-weight: 700; padding: 3px 10px; border-radius: 9999px; font-size: 12px; display: inline-block;">{{role}}</span></td>
      </tr>
      {{#if workspace}}
      <tr>
        <td style="padding: 6px 0; font-weight: 600; color: #475569;">Workspace:</td>
        <td style="padding: 6px 0; font-weight: 600;">{{workspace}}</td>
      </tr>
      {{/if}}
      <tr>
        <td style="padding: 6px 0; font-weight: 600; color: #475569;">Permissions:</td>
        <td style="padding: 6px 0; color: #334155;">{{role_description}}</td>
      </tr>
    </tbody>
  </table>
</div>

<div style="text-align: center; margin: 32px 0;">
  <a href="{{accept_link}}" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 15px 36px; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    Accept Invitation & Set Up Account
  </a>
</div>

<div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 14px; margin: 24px 0;">
  <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
    <strong>Security Notice:</strong> This single-use invitation is secure and expires in <strong>{{expiration_days}} days</strong>. Once activated, you will set your secure password and gain immediate access to the workspace.
  </p>
</div>

<p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 20px 0 0 0; word-break: break-all;">
  If the button above does not work, copy and paste this link into your browser:<br/>
  <a href="{{accept_link}}" style="color: #3b82f6;">{{accept_link}}</a>
</p>

<p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 16px 0 0 0;">
  Need assistance or believe this invitation was sent in error? Contact <a href="mailto:{{support_email}}" style="color: #3b82f6;">{{support_email}}</a>.
</p>
    `.trim(),
    body_text: `Hello {{recipient_name}},\n\n{{inviter_name}} has invited you to join {{studio_name}} as {{role}} ({{workspace}}).\n\nPermissions: {{role_description}}\n\nAccept your invitation and set up your account here:\n{{accept_link}}\n\n(This invitation expires in {{expiration_days}} days).\n\nSupport: {{support_email}}`.trim(),
    available_tokens: [
      { token: "{{recipient_name}}", label: "Recipient Name", description: "Invitee name or email prefix", example: "Sarah Jenkins" },
      { token: "{{recipient_email}}", label: "Recipient Email", description: "Invitee email address", example: "sarah@spsstudio.hu" },
      { token: "{{inviter_name}}", label: "Inviter Name", description: "Name of the admin who sent the invite", example: "Alexander Sterling" },
      { token: "{{role}}", label: "Assigned Role", description: "Role (Admin, Editor, Viewer)", example: "Editor" },
      { token: "{{role_description}}", label: "Role Description", description: "Summary of role permissions", example: "Access to manage photo galleries, project milestones, services, FAQs, and client submissions." },
      { token: "{{workspace}}", label: "Workspace / Team", description: "Workspace team assignment", example: "Main Studio" },
      { token: "{{custom_message}}", label: "Custom Message", description: "Optional personal note from inviter", example: "Welcome to the SPS production crew! Excited to have you on board." },
      { token: "{{accept_link}}", label: "Accept Invitation Link", description: "Secure single-use tokenized link to account creation", example: "https://spsstudio.com/invite/accept?token=sample_invite_token" },
      { token: "{{expiration_days}}", label: "Expiration Days", description: "Number of days until the token expires", example: "7" },
      { token: "{{support_email}}", label: "Support Email", description: "Contact email for support inquiries", example: "contact@spsstudio.com" },
      { token: "{{studio_name}}", label: "Studio Name", description: "Studio brand name", example: "SPS Studio" },
      { token: "{{footer_text}}", label: "Footer Notice", description: "Copyright & studio address notice", example: "SPS Studio · All rights reserved." }
    ],
    sample_data: {
      "recipient_name": "Sarah Jenkins",
      "recipient_email": "sarah@spsstudio.hu",
      "inviter_name": "Alexander Sterling",
      "role": "Editor",
      "role_description": "Access to manage photo galleries, project milestones, services, FAQs, and client submissions.",
      "workspace": "Main Studio",
      "custom_message": "Welcome to the SPS production crew! Excited to have you on board.",
      "accept_link": "https://spsstudio.com/invite/accept?token=sample_admin_invite_token_123",
      "action_url": "https://spsstudio.com/invite/accept?token=sample_admin_invite_token_123",
      "expiration_days": "7",
      "support_email": "contact@spsstudio.com",
      "studio_name": "SPS Studio"
    }
  },

  account_verification: {
    template_key: "account_verification",
    name: "Account Creation & Client Welcome",
    category: "onboarding",
    description: "Welcome email sent when an admin creates a client account or when email verification is required.",
    subject: "Welcome to {{studio_name}} · Verify your account",
    body_html: `
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
  Welcome <strong>{{user.name}}</strong>!
</p>
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
  Your client portal account for <strong>{{studio_name}}</strong> has been activated. Through your dedicated portal, you can view your photo galleries, track media production milestones, download high-resolution assets, and access invoice records.
</p>

<div style="text-align: center; margin: 30px 0;">
  <a href="{{action_url}}" style="background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);">
    {{action_text}}
  </a>
</div>

<table style="width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 13px; color: #1e293b; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
  <tbody>
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 14px; font-weight: 600; color: #64748b; width: 140px;">Registered Email</td>
      <td style="padding: 10px 14px; font-family: monospace;">{{user.email}}</td>
    </tr>
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 14px; font-weight: 600; color: #64748b;">Account Role</td>
      <td style="padding: 10px 14px;">{{account_role}}</td>
    </tr>
  </tbody>
</table>

<p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 16px 0 0 0;">
  If you have any questions or need assistance accessing your property photos, feel free to reply directly to this email.
</p>
    `.trim(),
    body_text: `Welcome to {{studio_name}}!\n\nYour client account ({{user.email}}) has been created.\n\nAccess your portal here:\n{{action_url}}`.trim(),
    available_tokens: [
      { token: "{{user.name}}", label: "User Name", description: "Display name or client name", example: "Eleanor Rigby" },
      { token: "{{user.email}}", label: "User Email", description: "User email address", example: "eleanor@example.com" },
      { token: "{{verification_link}}", label: "Verification Link", description: "Account activation link", example: "https://spsstudio.com/client/login" },
      { token: "{{action_url}}", label: "Portal URL", description: "Client portal login URL", example: "https://spsstudio.com/client/login" },
      { token: "{{action_text}}", label: "Button Label", description: "Primary CTA text", example: "Activate & Access Portal" },
      { token: "{{account_role}}", label: "Account Role", description: "Role designation (e.g. Active Client)", example: "Active Client" },
      { token: "{{temporary_password}}", label: "Temporary Password", description: "Auto-generated temp password (if applicable)", example: "Pass#2026" },
      { token: "{{studio_name}}", label: "Studio Name", description: "Studio brand name", example: "SPS Studio" }
    ],
    sample_data: {
      "user.name": "Eleanor Rigby",
      "recipient_name": "Eleanor Rigby",
      "user.email": "eleanor@example.com",
      "action_url": "https://spsstudio.com/client/login",
      "verification_link": "https://spsstudio.com/client/login",
      "account_role": "Active Client",
      "action_text": "Activate & Access Portal",
      "studio_name": "SPS Studio"
    }
  },

  client_password_registration: {
    template_key: "client_password_registration",
    name: "Client Password Registration Welcome",
    category: "onboarding",
    description: "Sent after a client successfully creates an active portal account using an email address and password.",
    subject: "Your {{studio_name}} client account is ready",
    body_html: `
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
  Welcome <strong>{{user.name}}</strong>!
</p>
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
  Your password-protected client account at <strong>{{studio_name}}</strong> has been created successfully and is ready to use.
</p>

<div style="text-align: center; margin: 30px 0;">
  <a href="{{action_url}}" style="background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);">
    {{action_text}}
  </a>
</div>

<table style="width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 13px; color: #1e293b; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
  <tbody>
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 14px; font-weight: 600; color: #64748b; width: 150px;">Registered Email</td>
      <td style="padding: 10px 14px; font-family: monospace;">{{user.email}}</td>
    </tr>
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 14px; font-weight: 600; color: #64748b;">Registration Method</td>
      <td style="padding: 10px 14px;">{{registration_method}}</td>
    </tr>
    <tr>
      <td style="padding: 10px 14px; font-weight: 600; color: #64748b;">Registration Date</td>
      <td style="padding: 10px 14px;">{{registered_date}}</td>
    </tr>
  </tbody>
</table>

<p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 16px 0 0 0;">
  You can now follow project milestones, receive studio updates, access delivered galleries, and download available media from your client portal. If you did not create this account, please reply to this email immediately.
</p>
    `.trim(),
    body_text: `Welcome to {{studio_name}}!\n\nYour password-protected client account for {{user.email}} was created successfully on {{registered_date}}.\n\nOpen your client portal:\n{{action_url}}\n\nIf you did not create this account, please reply to this email immediately.`.trim(),
    available_tokens: [
      { token: "{{user.name}}", label: "Client Name", description: "Email username used as the initial display name", example: "Eleanor" },
      { token: "{{user.email}}", label: "Registered Email", description: "The new client account email address", example: "eleanor@example.com" },
      { token: "{{registration_method}}", label: "Registration Method", description: "How the client created the account", example: "Email and password" },
      { token: "{{registered_date}}", label: "Registration Date", description: "Date when the account was created", example: "August 19, 2026" },
      { token: "{{action_url}}", label: "Client Portal URL", description: "Direct link to the client portal", example: "https://spsstudio.com/client" },
      { token: "{{action_text}}", label: "Button Label", description: "Primary call-to-action text", example: "Open Client Portal" },
      { token: "{{studio_name}}", label: "Studio Name", description: "Configured studio brand name", example: "SPS Studio" },
      { token: "{{support_email}}", label: "Support Email", description: "Configured reply-to address", example: "contact@spsstudio.com" }
    ],
    sample_data: {
      "user.name": "Eleanor",
      "recipient_name": "Eleanor",
      "user.email": "eleanor@example.com",
      "registration_method": "Email and password",
      "registered_date": "August 19, 2026",
      "action_url": "https://spsstudio.com/client",
      "action_text": "Open Client Portal",
      "studio_name": "SPS Studio",
      "support_email": "contact@spsstudio.com"
    }
  },

  client_portal_welcome: {
    template_key: "client_portal_welcome",
    name: "Client Portal Welcome",
    category: "onboarding",
    description: "Editable welcome email sent after a client completes first-time magic-link registration, when client welcome emails are enabled.",
    subject: "Üdvözlünk a {{studio_name}} ügyfélportálján",
    body_html: `<p style="color:#1e293b;font-size:15px;line-height:1.65;margin:0 0 16px;">Kedves <strong>{{user.name}}</strong>!</p><p style="color:#1e293b;font-size:15px;line-height:1.65;margin:0 0 20px;">Sikeresen létrehoztuk az ügyfélportálos hozzáférésedet. Itt egy helyen követheted projektjeidet, megtekintheted galériáidat és eléred a neked szóló anyagokat.</p>{{#if property_address}}<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:20px 0;color:#334155;font-size:14px;"><strong>Kapcsolódó ingatlan:</strong> {{property_address}}</div>{{/if}}<div style="text-align:center;margin:30px 0;"><a href="{{action_url}}" style="background:#0f172a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:9px;font-weight:700;display:inline-block;">{{action_text}}</a></div><p style="color:#64748b;font-size:13px;line-height:1.55;margin:22px 0 0;">Kérdés esetén egyszerűen válaszolj erre az e-mailre.</p>`,
    body_text: `Kedves {{user.name}}!\n\nSikeresen létrehoztuk az ügyfélportálos hozzáférésedet. Itt követheted projektjeidet, megtekintheted galériáidat és eléred a neked szóló anyagokat.\n\nKapcsolódó ingatlan: {{property_address}}\n\n{{action_text}}: {{action_url}}`,
    available_tokens: [
      { token: "{{user.name}}", label: "Client Name", description: "Client display name or email prefix", example: "Kata" },
      { token: "{{user.email}}", label: "Client Email", description: "Registered client email address", example: "kata@example.com" },
      { token: "{{property_address}}", label: "Property Address", description: "Optional associated property", example: "1025 Budapest, Rózsadomb" },
      { token: "{{action_url}}", label: "Client Portal URL", description: "Direct link to the client portal", example: "https://spsstudio.com/client" },
      { token: "{{action_text}}", label: "Button Label", description: "Primary call-to-action text", example: "Ügyfélportál megnyitása" },
      { token: "{{studio_name}}", label: "Studio Name", description: "Configured studio brand name", example: "SPS Studio" }
    ],
    sample_data: { "user.name": "Kata", recipient_name: "Kata", "user.email": "kata@example.com", property_address: "1025 Budapest, Rózsadomb", action_url: "https://spsstudio.com/client", action_text: "Ügyfélportál megnyitása", studio_name: "SPS Studio" }
  },

  client_account_changed: {
    template_key: "client_account_changed",
    name: "Client Account Details Changed",
    category: "auth",
    description: "Security notification sent after a client changes their display name, changes their password, or adds password sign-in to a magic-link account.",
    subject: "Your {{studio_name}} account details were changed",
    body_html: `
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hello <strong>{{user.name}}</strong>,</p>
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">This is a security notification confirming that your <strong>{{studio_name}}</strong> client account details were updated.</p>
<table style="width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 13px; color: #1e293b; background-color: #f8fafc; border: 1px solid #e2e8f0;">
  <tbody>
    <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 11px 14px; font-weight: 600; color: #64748b; width: 145px;">Change</td><td style="padding: 11px 14px;">{{change_type}}</td></tr>
    <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 11px 14px; font-weight: 600; color: #64748b;">Details</td><td style="padding: 11px 14px;">{{change_details}}</td></tr>
    <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 11px 14px; font-weight: 600; color: #64748b;">Time</td><td style="padding: 11px 14px;">{{changed_at}}</td></tr>
    <tr><td style="padding: 11px 14px; font-weight: 600; color: #64748b;">IP address</td><td style="padding: 11px 14px; font-family: monospace;">{{ip_address}}</td></tr>
  </tbody>
</table>
<div style="text-align: center; margin: 30px 0;"><a href="{{action_url}}" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">{{action_text}}</a></div>
<div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 14px; margin: 24px 0; color: #9a3412; font-size: 13px; line-height: 1.5;">If you did not make this change, contact us immediately by replying to this email and secure your account.</div>
    `.trim(),
    body_text: `Hello {{user.name}},\n\nYour {{studio_name}} client account details were changed.\n\nChange: {{change_type}}\nDetails: {{change_details}}\nTime: {{changed_at}}\nIP address: {{ip_address}}\n\nReview your account settings: {{action_url}}\n\nIf you did not make this change, reply to this email immediately.`.trim(),
    available_tokens: [
      { token: "{{user.name}}", label: "Client Name", description: "Current client display name", example: "Eleanor Rigby" },
      { token: "{{user.email}}", label: "Client Email", description: "Client account email address", example: "eleanor@example.com" },
      { token: "{{change_type}}", label: "Change Type", description: "Short description of the account change", example: "Password changed" },
      { token: "{{change_details}}", label: "Change Details", description: "Safe summary of what changed; passwords are never included", example: "The password for your client portal account was changed." },
      { token: "{{changed_at}}", label: "Change Time", description: "Local date and time of the change", example: "2026. 08. 19. 18:42:10" },
      { token: "{{ip_address}}", label: "IP Address", description: "IP address associated with the request", example: "192.0.2.10" },
      { token: "{{action_url}}", label: "Account Settings URL", description: "Direct link to client account settings", example: "https://spsstudio.com/client/settings" },
      { token: "{{action_text}}", label: "Button Label", description: "Primary call-to-action text", example: "Review account settings" },
      { token: "{{studio_name}}", label: "Studio Name", description: "Configured studio brand name", example: "SPS Studio" },
      { token: "{{support_email}}", label: "Support Email", description: "Configured reply-to address", example: "contact@spsstudio.com" }
    ],
    sample_data: {
      "user.name": "Eleanor Rigby", "user.email": "eleanor@example.com",
      "change_type": "Password changed", "change_details": "The password for your client portal account was changed.",
      "changed_at": "2026. 08. 19. 18:42:10", "ip_address": "192.0.2.10",
      "action_url": "https://spsstudio.com/client/settings", "action_text": "Review account settings",
      "studio_name": "SPS Studio", "support_email": "contact@spsstudio.com"
    }
  },

  project_update: {
    template_key: "project_update",
    name: "Project Milestone & Media Status Update",
    category: "production",
    description: "Dispatched to clients when photography/videography milestone status is updated.",
    subject: "Update on {{project_name}} · {{studio_name}}",
    body_html: `
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
  Hello <strong>{{user.name}}</strong>,
</p>
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
  There is an update available on your real estate media project <strong>{{project_name}}</strong>:
</p>

<div style="background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 18px; border-radius: 4px; margin: 24px 0;">
  <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; font-weight: 700; margin-bottom: 4px;">Milestone Status</div>
  <div style="font-size: 18px; font-weight: 700; color: #0f172a;">{{project_status}}</div>
  {{#if additional_notes}}
  <div style="margin-top: 12px; font-size: 14px; color: #334155; line-height: 1.5; padding-top: 10px; border-top: 1px solid #e2e8f0;">
    {{additional_notes}}
  </div>
  {{/if}}
</div>

<div style="text-align: center; margin: 30px 0;">
  <a href="{{action_url}}" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    {{action_text}}
  </a>
</div>
    `.trim(),
    body_text: `Hello {{user.name}},\n\nUpdate on your project {{project_name}}:\nStatus: {{project_status}}\nNotes: {{additional_notes}}\n\nView details in your portal: {{action_url}}`.trim(),
    available_tokens: [
      { token: "{{user.name}}", label: "Client Name", description: "Recipient name", example: "Victoria Stone" },
      { token: "{{project_name}}", label: "Project Title", description: "Name of the photoshoot / listing", example: "Villa Bellavista Estate" },
      { token: "{{project_status}}", label: "Project Status", description: "Current workflow status badge", example: "READY FOR REVIEW" },
      { token: "{{additional_notes}}", label: "Status Notes", description: "Custom update note from production", example: "All 45 HDR interior/exterior photographs and the 4K drone reel have been uploaded." },
      { token: "{{action_url}}", label: "Portal Link", description: "Link to view project in client portal", example: "https://spsstudio.com/client" },
      { token: "{{action_text}}", label: "Button Label", description: "CTA button text", example: "View Project in Portal" },
      { token: "{{studio_name}}", label: "Studio Name", description: "Studio brand name", example: "SPS Studio" }
    ],
    sample_data: {
      "user.name": "Victoria Stone",
      "recipient_name": "Victoria Stone",
      "project_name": "Villa Bellavista Estate",
      "project_status": "HDR COLOR GRADING COMPLETED",
      "additional_notes": "All 45 HDR interior/exterior photographs and the 4K drone reel have been uploaded to your portal gallery.",
      "action_url": "https://spsstudio.com/client",
      "action_text": "View Project in Portal",
      "studio_name": "SPS Studio"
    }
  },

  gallery_ready: {
    template_key: "gallery_ready",
    name: "Client Media Delivery & Gallery Download",
    category: "production",
    description: "Sent when full-resolution photos, HDR sets, or virtual tours are ready to download.",
    subject: "Your media package is ready: {{project_name}} · {{studio_name}}",
    body_html: `
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
  Hello <strong>{{user.name}}</strong>,
</p>
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
  Great news! The final media deliverables for <strong>{{project_name}}</strong> have been fully processed, retouched, and published to your private client gallery.
</p>

<div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 18px; margin: 24px 0;">
  <h3 style="margin: 0 0 6px 0; color: #065f46; font-size: 15px; font-weight: 700;">✓ Deliverables Ready for Download</h3>
  <div style="display: flex; gap: 16px; margin-top: 10px; font-size: 13px; color: #047857;">
    <span>📸 <strong>{{photo_count}}</strong> High-Res Photos</span>
    <span>🎥 <strong>{{video_count}}</strong> Video Tours</span>
  </div>
</div>

<div style="text-align: center; margin: 32px 0;">
  <a href="{{gallery_url}}" style="background-color: #059669; color: #ffffff; text-decoration: none; padding: 15px 36px; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.2);">
    {{action_text}}
  </a>
</div>

{{#if download_pin}}
<div style="text-align: center; font-size: 13px; color: #64748b; margin-top: 12px;">
  Download Security PIN: <strong style="font-family: monospace; font-size: 16px; color: #0f172a; letter-spacing: 2px;">{{download_pin}}</strong>
</div>
{{/if}}

<p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 24px 0 0 0;">
  You can download individual photos or the complete uncompressed archive directly from your gallery.
</p>
    `.trim(),
    body_text: `Hello {{user.name}},\n\nYour media deliverables for {{project_name}} are ready!\n\nPhotos: {{photo_count}}\nVideos: {{video_count}}\nDownload PIN: {{download_pin}}\n\nAccess gallery: {{gallery_url}}`.trim(),
    available_tokens: [
      { token: "{{user.name}}", label: "Client Name", description: "Recipient name", example: "Alexander Sterling" },
      { token: "{{project_name}}", label: "Project Title", description: "Property name / listing", example: "Sunset Boulevard Penthouse" },
      { token: "{{gallery_url}}", label: "Gallery URL", description: "Link to the showcase gallery", example: "https://spsstudio.com/client/gallery/123" },
      { token: "{{photo_count}}", label: "Photo Count", description: "Number of high-res photos", example: "54" },
      { token: "{{video_count}}", label: "Video Count", description: "Number of video reels", example: "2" },
      { token: "{{download_pin}}", label: "Download PIN", description: "Gallery security PIN code", example: "5891" },
      { token: "{{action_text}}", label: "Button Label", description: "CTA button text", example: "Download High-Res Gallery" },
      { token: "{{studio_name}}", label: "Studio Name", description: "Studio brand name", example: "SPS Studio" }
    ],
    sample_data: {
      "user.name": "Alexander Sterling",
      "recipient_name": "Alexander Sterling",
      "project_name": "Sunset Boulevard Penthouse",
      "photo_count": "54",
      "video_count": "2",
      "download_pin": "5891",
      "gallery_url": "https://spsstudio.com/client",
      "action_url": "https://spsstudio.com/client",
      "action_text": "Download High-Res Gallery",
      "studio_name": "SPS Studio"
    }
  },

  gallery_pin_recovery: {
    template_key: "gallery_pin_recovery",
    name: "Gallery Download PIN Recovery",
    category: "production",
    description: "Sent when a client requests a new download PIN for a delivered project gallery.",
    subject: "Your new gallery PIN: {{project_name}} · {{studio_name}}",
    body_html: `
<p style="color:#1e293b;font-size:15px;line-height:1.65;margin:0 0 16px;">Hello <strong>{{user.name}}</strong>,</p>
<p style="color:#1e293b;font-size:15px;line-height:1.65;margin:0 0 20px;">
  You requested a new download PIN for <strong>{{project_name}}</strong>. Your previous PIN has been replaced and can no longer be used.
</p>
<div style="background:#ecfeff;border:1px solid #a5f3fc;border-radius:12px;padding:22px;margin:24px 0;text-align:center;">
  <div style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#0e7490;font-weight:700;margin-bottom:8px;">New download PIN</div>
  <div style="font-family:monospace;font-size:30px;line-height:1;font-weight:800;letter-spacing:8px;color:#0f172a;">{{download_pin}}</div>
</div>
<div style="text-align:center;margin:30px 0;">
  <a href="{{gallery_url}}" style="background:#0891b2;color:#fff;text-decoration:none;padding:14px 32px;border-radius:9px;font-weight:700;font-size:15px;display:inline-block;">{{action_text}}</a>
</div>
<p style="color:#64748b;font-size:12px;line-height:1.5;margin:22px 0 0;">For your security, only the most recently emailed PIN will unlock the original gallery files.</p>
    `.trim(),
    body_text: `Hello {{user.name}},\n\nYour new download PIN for {{project_name}} is: {{download_pin}}\n\nYour previous PIN is no longer valid.\n\nOpen gallery: {{gallery_url}}`.trim(),
    available_tokens: [
      { token: "{{user.name}}", label: "Client Name", description: "Recipient display name", example: "Alexander Sterling" },
      { token: "{{project_name}}", label: "Project Name", description: "Delivered project title", example: "Sunset Boulevard Penthouse" },
      { token: "{{download_pin}}", label: "New Download PIN", description: "Newly generated four-digit gallery PIN", example: "4827" },
      { token: "{{gallery_url}}", label: "Gallery URL", description: "Client portal project gallery link", example: "https://spsstudio.com/client/projects" },
      { token: "{{action_text}}", label: "Button Label", description: "Gallery call-to-action text", example: "Open gallery" },
      { token: "{{studio_name}}", label: "Studio Name", description: "Configured studio brand name", example: "SPS Studio" }
    ],
    sample_data: {
      "user.name": "Alexander Sterling", recipient_name: "Alexander Sterling", project_name: "Sunset Boulevard Penthouse",
      download_pin: "4827", gallery_url: "https://spsstudio.com/client/projects", action_url: "https://spsstudio.com/client/projects",
      action_text: "Open gallery", studio_name: "SPS Studio"
    }
  },

  calendar_reminder: {
    template_key: "calendar_reminder",
    name: "Calendar Reminder",
    category: "notifications",
    description: "Automatically delivered to a team member when an internal calendar reminder becomes due.",
    subject: "Emlékeztető: {{event_title}} · {{studio_name}}",
    body_html: `
<p style="color:#1e293b;font-size:15px;line-height:1.65;margin:0 0 16px;">Szia <strong>{{user.name}}</strong>!</p>
<p style="color:#1e293b;font-size:15px;line-height:1.65;margin:0 0 20px;">A belső naptárban esedékessé vált a következő emlékeztetőd:</p>
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #8b5cf6;border-radius:10px;padding:20px;margin:22px 0;">
  <div style="font-size:18px;font-weight:800;color:#0f172a;margin-bottom:10px;">{{event_title}}</div>
  <div style="font-size:13px;color:#475569;line-height:1.7;"><strong>Kezdés:</strong> {{event_start}}<br/><strong>Befejezés:</strong> {{event_end}}</div>
  <p style="font-size:13px;color:#64748b;line-height:1.6;margin:12px 0 0;">{{event_description}}</p>
</div>
<div style="text-align:center;margin:30px 0;"><a href="{{action_url}}" style="background:#8b5cf6;color:#fff;text-decoration:none;padding:14px 32px;border-radius:9px;font-weight:700;font-size:15px;display:inline-block;">{{action_text}}</a></div>
<p style="color:#94a3b8;font-size:11px;line-height:1.5;margin:20px 0 0;text-align:center;">Ez egy automatikus belső naptárértesítés.</p>`.trim(),
    body_text: `Szia {{user.name}}!\n\nEmlékeztető: {{event_title}}\nKezdés: {{event_start}}\nBefejezés: {{event_end}}\n\n{{event_description}}\n\nNaptár: {{action_url}}`.trim(),
    available_tokens: [
      { token: "{{user.name}}", label: "Recipient Name", description: "Team member display name", example: "Dániel" },
      { token: "{{user.email}}", label: "Recipient Email", description: "Team member email address", example: "daniel@example.com" },
      { token: "{{event_title}}", label: "Event Title", description: "Calendar reminder title", example: "Ügyfél egyeztetés" },
      { token: "{{event_description}}", label: "Event Description", description: "Calendar reminder notes", example: "A látványtervek véglegesítése." },
      { token: "{{event_start}}", label: "Start", description: "Localized occurrence start", example: "2026. augusztus 26. 10:00" },
      { token: "{{event_end}}", label: "End", description: "Localized occurrence end", example: "2026. augusztus 26. 11:00" },
      { token: "{{action_url}}", label: "Calendar URL", description: "Link to the internal calendar", example: "https://spsstudio.hu/admin/calendar" },
      { token: "{{action_text}}", label: "Button Label", description: "Calendar button text", example: "Naptár megnyitása" },
      { token: "{{studio_name}}", label: "Studio Name", description: "Configured studio brand name", example: "SPS Studio" },
    ],
    sample_data: {
      "user.name": "Dániel", "user.email": "daniel@example.com", recipient_name: "Dániel",
      event_title: "Ügyfél egyeztetés", event_description: "A látványtervek véglegesítése.",
      event_start: "2026. augusztus 26. 10:00", event_end: "2026. augusztus 26. 11:00",
      action_url: "https://spsstudio.hu/admin/calendar", action_text: "Naptár megnyitása", studio_name: "SPS Studio",
    },
  },

  google_review_request: {
    template_key: "google_review_request",
    name: "Google Review Request & Reminder",
    category: "production",
    description: "Automatically sent after gallery delivery. Clicking the tracked review button stops every later reminder.",
    subject: "How did we do on {{project_name}}? · {{studio_name}}",
    body_html: `
<p style="color:#1e293b;font-size:15px;line-height:1.65;margin:0 0 16px;">Hello <strong>{{user.name}}</strong>,</p>
<p style="color:#1e293b;font-size:15px;line-height:1.65;margin:0 0 20px;">
  We hope you are enjoying the completed media package for <strong>{{project_name}}</strong>. Your feedback helps future clients choose our studio with confidence.
</p>
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px;margin:22px 0;text-align:center;">
  <div style="font-size:24px;letter-spacing:3px;margin-bottom:8px;">★★★★★</div>
  <p style="color:#475569;font-size:13px;line-height:1.55;margin:0;">It only takes a moment. Once you open the review link, we will stop sending reminders.</p>
</div>
<div style="text-align:center;margin:30px 0;">
  <a href="{{review_url}}" style="background:#2563eb;color:#fff;text-decoration:none;padding:14px 32px;border-radius:9px;font-weight:700;font-size:15px;display:inline-block;">{{action_text}}</a>
</div>
<p style="color:#94a3b8;font-size:11px;line-height:1.5;margin:22px 0 0;text-align:center;">Reminder {{reminder_number}} of {{reminder_total}} · Scheduled {{elapsed_time}} after delivery</p>
    `.trim(),
    body_text: `Hello {{user.name}},\n\nWe hope you are enjoying the completed media package for {{project_name}}. Please share your experience on Google:\n\n{{review_url}}\n\nOnce you open this link, no more review reminders will be sent.\n\nReminder {{reminder_number}} of {{reminder_total}}.`.trim(),
    available_tokens: [
      { token: "{{user.name}}", label: "Client Name", description: "Recipient display name", example: "Alexander Sterling" },
      { token: "{{project_name}}", label: "Project Name", description: "Delivered project title", example: "Sunset Boulevard Penthouse" },
      { token: "{{review_url}}", label: "Tracked Review URL", description: "Required tracked link that stops later reminders before redirecting to Google", example: "https://spsstudio.com/api/public/google-review/example" },
      { token: "{{action_text}}", label: "Button Label", description: "Review call-to-action text", example: "Leave a Google review" },
      { token: "{{reminder_number}}", label: "Reminder Number", description: "Current message position in the sequence", example: "1" },
      { token: "{{reminder_total}}", label: "Reminder Total", description: "Total scheduled messages", example: "5" },
      { token: "{{elapsed_time}}", label: "Elapsed Time", description: "Time elapsed since gallery delivery", example: "1 hour" },
      { token: "{{studio_name}}", label: "Studio Name", description: "Configured studio brand name", example: "SPS Studio" },
    ],
    sample_data: {
      "user.name": "Alexander Sterling",
      recipient_name: "Alexander Sterling",
      project_name: "Sunset Boulevard Penthouse",
      review_url: "https://example.com/api/public/google-review/sample-token",
      action_url: "https://example.com/api/public/google-review/sample-token",
      action_text: "Leave a Google review",
      reminder_number: "1",
      reminder_total: "5",
      elapsed_time: "1 hour",
      studio_name: "SPS Studio",
    },
  },

  inquiry_received: {
    template_key: "inquiry_received",
    name: "Admin Alert: New Contact Inquiry",
    category: "notifications",
    description: "Instant alert sent to studio administrators when a website contact form is submitted.",
    subject: "[New Inquiry] {{client_name}} - {{property_address}}",
    body_html: `
<div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
  <p style="margin: 0; color: #1e40af; font-size: 14px; font-weight: 600;">
    A new contact inquiry has been submitted on the {{studio_name}} website.
  </p>
</div>

<table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
  <tbody>
    <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
      <td style="padding: 10px 14px; font-weight: 600; color: #64748b; width: 140px;">Client Name</td>
      <td style="padding: 10px 14px; font-weight: 600;">{{client_name}}</td>
    </tr>
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 14px; font-weight: 600; color: #64748b;">Email</td>
      <td style="padding: 10px 14px;"><a href="mailto:{{client_email}}" style="color: #3b82f6;">{{client_email}}</a></td>
    </tr>
    {{#if client_phone}}
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 14px; font-weight: 600; color: #64748b;">Phone</td>
      <td style="padding: 10px 14px;"><a href="tel:{{client_phone}}" style="color: #3b82f6;">{{client_phone}}</a></td>
    </tr>
    {{/if}}
    {{#if property_address}}
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 14px; font-weight: 600; color: #64748b;">Property Address</td>
      <td style="padding: 10px 14px;">{{property_address}}</td>
    </tr>
    {{/if}}
    {{#if inquiry_subject}}
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 14px; font-weight: 600; color: #64748b;">Subject</td>
      <td style="padding: 10px 14px;">{{inquiry_subject}}</td>
    </tr>
    {{/if}}
    {{#if availability_window}}
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 14px; font-weight: 600; color: #64748b;">Availability Window</td>
      <td style="padding: 10px 14px; color: #0284c7; font-weight: 600;">{{availability_window}}</td>
    </tr>
    {{/if}}
  </tbody>
</table>

{{#if pricing_plan}}
<div style="background-color:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:16px;margin:20px 0;">
  <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;margin-bottom:10px;">Selected package and estimate</div>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <tr><td style="padding:7px 0;color:#475569;">Package</td><td style="padding:7px 0;text-align:right;font-weight:700;color:#0f172a;">{{pricing_plan}}</td></tr>
    {{#if plan_price}}<tr><td style="padding:7px 0;color:#475569;">Base price</td><td style="padding:7px 0;text-align:right;font-weight:600;color:#0f172a;">{{plan_price}}</td></tr>{{/if}}
    {{#if property_city}}<tr><td style="padding:7px 0;color:#475569;">Property city</td><td style="padding:7px 0;text-align:right;font-weight:600;color:#0f172a;">{{property_city}}</td></tr>{{/if}}
    {{#if travel_distance_round_trip}}<tr><td style="padding:7px 0;color:#475569;">Estimated travel distance</td><td style="padding:7px 0;text-align:right;font-weight:600;color:#0f172a;">{{travel_distance_round_trip}} round trip{{#if travel_distance_one_way}} ({{travel_distance_one_way}} one way){{/if}}</td></tr>{{/if}}
    {{#if estimated_travel_fee}}<tr><td style="padding:7px 0;color:#475569;">Estimated travel fee</td><td style="padding:7px 0;text-align:right;font-weight:600;color:#0f172a;">{{estimated_travel_fee}}</td></tr>{{/if}}
    {{#if selected_items_html}}{{selected_items_html}}{{/if}}
    {{#if fee_details_html}}{{fee_details_html}}{{/if}}
    {{#if estimated_total}}<tr style="border-top:1px solid #cbd5e1;"><td style="padding:11px 0 4px;font-weight:700;color:#0f172a;">Estimated total</td><td style="padding:11px 0 4px;text-align:right;font-size:16px;font-weight:800;color:#2563eb;">{{estimated_total}}</td></tr>{{/if}}
  </table>
</div>
{{/if}}

<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
  <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 6px;">Client Message</div>
  <div style="font-size: 14px; color: #1e293b; line-height: 1.6; white-space: pre-wrap;">{{inquiry_message}}</div>
</div>

<div style="text-align: center; margin: 28px 0;">
  <a href="{{action_url}}" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
    View in Admin Panel
  </a>
</div>
    `.trim(),
    body_text: `New contact inquiry from {{client_name}} ({{client_email}}):\n\nProperty: {{property_address}}\nPhone: {{client_phone}}\nSubject: {{inquiry_subject}}\nAvailability: {{availability_window}}\n\nSelected package: {{pricing_plan}}\nBase price: {{plan_price}}\nProperty city: {{property_city}}\nTravel distance: {{travel_distance_round_trip}} round trip ({{travel_distance_one_way}} one way)\nEstimated travel fee: {{estimated_travel_fee}}\n{{selected_items_text}}\n{{fee_details_text}}\nEstimated total: {{estimated_total}}\n\nMessage:\n{{inquiry_message}}`.trim(),
    available_tokens: [
      { token: "{{client_name}}", label: "Client Name", description: "Name entered in form", example: "Sophia Laurent" },
      { token: "{{client_email}}", label: "Client Email", description: "Email address entered in form", example: "sophia@luxuryestates.com" },
      { token: "{{client_phone}}", label: "Client Phone", description: "Phone number entered in form", example: "+1 (555) 342-9811" },
      { token: "{{property_address}}", label: "Property Address", description: "Address of listing", example: "880 Ocean Drive, Miami Beach" },
      { token: "{{inquiry_subject}}", label: "Inquiry Subject", description: "Selected subject / package", example: "Twilight HDR + Drone Session" },
      { token: "{{availability_window}}", label: "Availability Window", description: "Preferred contact window range", example: "Aug 20, 2026, 10:00 AM – Aug 20, 2026, 2:00 PM" },
      { token: "{{availability_start}}", label: "Availability Start", description: "Start date/time of availability", example: "Aug 20, 2026, 10:00 AM" },
      { token: "{{availability_end}}", label: "Availability End", description: "End date/time of availability", example: "Aug 20, 2026, 2:00 PM" },
      { token: "{{inquiry_message}}", label: "Inquiry Message", description: "Message body text", example: "We have a 6,000 sq ft modern waterfront listing coming onto the market next Tuesday." },
      { token: "{{pricing_plan}}", label: "Selected Package", description: "Package or offer selected in the calculator", example: "Premium Property Package" },
      { token: "{{plan_price}}", label: "Package Base Price", description: "Database-verified base price with currency", example: "120 000 Ft" },
      { token: "{{selected_items_html}}", label: "Selected Items (HTML)", description: "Formatted table rows for selected additional services", example: "2× Drone photography — 40 000 Ft" },
      { token: "{{selected_items_text}}", label: "Selected Items (Text)", description: "Plain-text list of selected additional services", example: "2x Drone photography: 40 000 Ft" },
      { token: "{{fee_details_html}}", label: "Calculated Fees (HTML)", description: "Formatted table rows for travel and other calculated fees", example: "Travel fee — 12 500 Ft" },
      { token: "{{fee_details_text}}", label: "Calculated Fees (Text)", description: "Plain-text list of travel and calculated fees", example: "Travel fee: 12 500 Ft" },
      { token: "{{estimated_total}}", label: "Estimated Total", description: "Final calculated package estimate with currency", example: "172 500 Ft" },
      { token: "{{currency}}", label: "Currency", description: "Configured pricing currency code", example: "HUF" },
      { token: "{{property_city}}", label: "Property City", description: "City used for the travel calculation", example: "Szeged" },
      { token: "{{travel_distance_one_way}}", label: "One-Way Distance", description: "Estimated distance from Hódmezővásárhely to the property city", example: "27 km" },
      { token: "{{travel_distance_round_trip}}", label: "Round-Trip Distance", description: "Estimated return distance used by the fee calculator", example: "54 km" },
      { token: "{{estimated_travel_fee}}", label: "Estimated Travel Fee", description: "Calculated kilometer/travel fee with currency", example: "12 500 Ft" },
      { token: "{{timestamp}}", label: "Timestamp", description: "Date and time received", example: "August 15, 2026 10:30 AM" },
      { token: "{{action_url}}", label: "Admin CRM Link", description: "Link to open inquiry in admin", example: "https://spsstudio.com/admin/contacts" },
      { token: "{{studio_name}}", label: "Studio Name", description: "Studio brand name", example: "SPS Studio" }
    ],
    sample_data: {
      "client_name": "Sophia Laurent",
      "client_email": "sophia@luxuryestates.com",
      "client_phone": "+1 (555) 342-9811",
      "property_address": "880 Ocean Drive, Miami Beach",
      "inquiry_subject": "Twilight HDR + Drone Session",
      "availability_window": "Aug 20, 2026, 10:00 AM – Aug 20, 2026, 2:00 PM",
      "availability_start": "Aug 20, 2026, 10:00 AM",
      "availability_end": "Aug 20, 2026, 2:00 PM",
      "inquiry_message": "We have a 6,000 sq ft modern waterfront listing coming onto the market next Tuesday. We would love full HDR stills and a sunset drone reel.",
      "pricing_plan": "Premium Property Package",
      "plan_price": "120 000 Ft",
      "selected_items_html": "<tr><td>2× Drone photography</td><td style=\"text-align:right\">40 000 Ft</td></tr>",
      "selected_items_text": "2x Drone photography: 40 000 Ft",
      "fee_details_html": "<tr><td>Travel fee</td><td style=\"text-align:right\">12 500 Ft</td></tr>",
      "fee_details_text": "Travel fee: 12 500 Ft",
      "estimated_total": "172 500 Ft",
      "currency": "HUF",
      "property_city": "Szeged",
      "travel_distance_one_way": "27 km",
      "travel_distance_round_trip": "54 km",
      "estimated_travel_fee": "12 500 Ft",
      "timestamp": "August 15, 2026 10:30 AM",
      "action_url": "https://spsstudio.com/admin/contacts",
      "studio_name": "SPS Studio"
    }
  },

  inquiry_confirmation: {
    template_key: "inquiry_confirmation",
    name: "Client Auto-Reply: Inquiry Confirmation",
    category: "notifications",
    description: "Branded thank-you receipt sent automatically to prospective clients after submitting an inquiry.",
    subject: "Thank you for contacting {{studio_name}}",
    body_html: `
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
  Dear <strong>{{client_name}}</strong>,
</p>
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
  Thank you for reaching out to <strong>{{studio_name}}</strong>. We have received your inquiry and our production team will review the details and respond to you promptly (typically within 1 business day).
</p>

{{#if pricing_plan}}
<div style="background-color:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:16px;margin:24px 0;">
  <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;margin-bottom:10px;">Your selected package and estimate</div>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <tr><td style="padding:7px 0;color:#475569;">Package</td><td style="padding:7px 0;text-align:right;font-weight:700;color:#0f172a;">{{pricing_plan}}</td></tr>
    {{#if plan_price}}<tr><td style="padding:7px 0;color:#475569;">Base price</td><td style="padding:7px 0;text-align:right;font-weight:600;color:#0f172a;">{{plan_price}}</td></tr>{{/if}}
    {{#if property_city}}<tr><td style="padding:7px 0;color:#475569;">Property city</td><td style="padding:7px 0;text-align:right;font-weight:600;color:#0f172a;">{{property_city}}</td></tr>{{/if}}
    {{#if travel_distance_round_trip}}<tr><td style="padding:7px 0;color:#475569;">Estimated travel distance</td><td style="padding:7px 0;text-align:right;font-weight:600;color:#0f172a;">{{travel_distance_round_trip}} round trip{{#if travel_distance_one_way}} ({{travel_distance_one_way}} one way){{/if}}</td></tr>{{/if}}
    {{#if estimated_travel_fee}}<tr><td style="padding:7px 0;color:#475569;">Estimated travel fee</td><td style="padding:7px 0;text-align:right;font-weight:600;color:#0f172a;">{{estimated_travel_fee}}</td></tr>{{/if}}
    {{#if selected_items_html}}{{selected_items_html}}{{/if}}
    {{#if fee_details_html}}{{fee_details_html}}{{/if}}
    {{#if estimated_total}}<tr style="border-top:1px solid #cbd5e1;"><td style="padding:11px 0 4px;font-weight:700;color:#0f172a;">Estimated total</td><td style="padding:11px 0 4px;text-align:right;font-size:16px;font-weight:800;color:#2563eb;">{{estimated_total}}</td></tr>{{/if}}
  </table>
</div>
{{/if}}

{{#if inquiry_message}}
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 24px 0;">
  <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">Summary of your message:</div>
  <div style="font-size: 14px; color: #1e293b; line-height: 1.5; font-style: italic;">
    "{{inquiry_message}}"
  </div>
</div>
{{/if}}

<p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
  If your photoshoot request is urgent, you can also reach us directly at <a href="mailto:{{contact_email}}" style="color: #3b82f6;">{{contact_email}}</a>.
</p>
    `.trim(),
    body_text: `Dear {{client_name}},\n\nThank you for reaching out to {{studio_name}}. We have received your inquiry and will be in touch shortly.\n\nSelected package: {{pricing_plan}}\nBase price: {{plan_price}}\nProperty city: {{property_city}}\nTravel distance: {{travel_distance_round_trip}} round trip ({{travel_distance_one_way}} one way)\nEstimated travel fee: {{estimated_travel_fee}}\n{{selected_items_text}}\n{{fee_details_text}}\nEstimated total: {{estimated_total}}\n\nYour message:\n{{inquiry_message}}\n\nDirect contact: {{contact_email}}`.trim(),
    available_tokens: [
      { token: "{{client_name}}", label: "Client Name", description: "Prospect name", example: "Sophia Laurent" },
      { token: "{{inquiry_message}}", label: "Message Summary", description: "Echo of the submitted message", example: "We have a 6,000 sq ft listing coming up." },
      { token: "{{pricing_plan}}", label: "Selected Package", description: "Package or offer selected by the customer", example: "Premium Property Package" },
      { token: "{{plan_price}}", label: "Package Base Price", description: "Database-verified base price with currency", example: "120 000 Ft" },
      { token: "{{selected_items_html}}", label: "Selected Items (HTML)", description: "Formatted table rows for selected additional services", example: "2× Drone photography — 40 000 Ft" },
      { token: "{{selected_items_text}}", label: "Selected Items (Text)", description: "Plain-text list of selected additional services", example: "2x Drone photography: 40 000 Ft" },
      { token: "{{fee_details_html}}", label: "Calculated Fees (HTML)", description: "Formatted table rows for travel and calculated fees", example: "Travel fee — 12 500 Ft" },
      { token: "{{fee_details_text}}", label: "Calculated Fees (Text)", description: "Plain-text list of travel and calculated fees", example: "Travel fee: 12 500 Ft" },
      { token: "{{estimated_total}}", label: "Estimated Total", description: "Final calculated estimate with currency", example: "172 500 Ft" },
      { token: "{{currency}}", label: "Currency", description: "Configured pricing currency code", example: "HUF" },
      { token: "{{property_city}}", label: "Property City", description: "City used for the travel calculation", example: "Szeged" },
      { token: "{{travel_distance_one_way}}", label: "One-Way Distance", description: "Estimated distance from Hódmezővásárhely to the property city", example: "27 km" },
      { token: "{{travel_distance_round_trip}}", label: "Round-Trip Distance", description: "Estimated return distance used by the fee calculator", example: "54 km" },
      { token: "{{estimated_travel_fee}}", label: "Estimated Travel Fee", description: "Calculated kilometer/travel fee with currency", example: "12 500 Ft" },
      { token: "{{contact_email}}", label: "Studio Email", description: "Direct studio contact email", example: "contact@spsstudio.com" },
      { token: "{{contact_phone}}", label: "Studio Phone", description: "Direct studio telephone number", example: "+1 (555) 019-2834" },
      { token: "{{studio_name}}", label: "Studio Name", description: "Studio brand name", example: "SPS Studio" },
      { token: "{{footer_text}}", label: "Footer Text", description: "Copyright & address notice", example: "SPS Studio · All rights reserved." }
    ],
    sample_data: {
      "client_name": "Sophia Laurent",
      "recipient_name": "Sophia Laurent",
      "inquiry_message": "We have a 6,000 sq ft modern waterfront listing coming onto the market next Tuesday.",
      "pricing_plan": "Premium Property Package",
      "plan_price": "120 000 Ft",
      "selected_items_html": "<tr><td>2× Drone photography</td><td style=\"text-align:right\">40 000 Ft</td></tr>",
      "selected_items_text": "2x Drone photography: 40 000 Ft",
      "fee_details_html": "<tr><td>Travel fee</td><td style=\"text-align:right\">12 500 Ft</td></tr>",
      "fee_details_text": "Travel fee: 12 500 Ft",
      "estimated_total": "172 500 Ft",
      "currency": "HUF",
      "property_city": "Szeged",
      "travel_distance_one_way": "27 km",
      "travel_distance_round_trip": "54 km",
      "estimated_travel_fee": "12 500 Ft",
      "contact_email": "contact@spsstudio.com",
      "contact_phone": "+1 (555) 019-2834",
      "studio_name": "SPS Studio"
    }
  },

  admin_account_verification_code: {
    template_key: "admin_account_verification_code",
    name: "Admin Account Verification Code",
    category: "auth",
    description: "Sent to a prospective admin-panel team member when direct password account creation requires email verification.",
    subject: "Your {{studio_name}} admin account verification code",
    body_html: `
<p style="color:#1e293b;font-size:15px;line-height:1.6;margin:0 0 16px">
  Hello <strong>{{recipient_name}}</strong>,
</p>
<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 20px">
  An administrator has started creating a direct password account for you in the <strong>{{studio_name}}</strong> management portal.
</p>
<div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:12px;padding:22px;margin:24px 0;text-align:center">
  <div style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#64748b;font-weight:700;margin-bottom:10px">One-time verification code</div>
  <div style="font-size:34px;line-height:1;font-weight:800;letter-spacing:9px;color:#0f172a;font-family:monospace">{{verification_code}}</div>
</div>
<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 18px">
  Give this code only to the administrator completing your account registration. It expires in <strong>{{expires_in_minutes}} minutes</strong> and can be used once.
</p>
<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px;margin-top:20px;color:#9a3412;font-size:13px;line-height:1.5">
  <strong>Security notice:</strong> If you did not expect this invitation, do not share the code. No account can be created through this flow without it.
</div>`.trim(),
    body_text: `Hello {{recipient_name}},\n\nYour {{studio_name}} admin account verification code is: {{verification_code}}\n\nIt expires in {{expires_in_minutes}} minutes and can be used once. If you did not expect this invitation, do not share the code.`.trim(),
    available_tokens: [
      { token: "{{recipient_name}}", label: "Recipient Name", description: "Name inferred from the recipient email", example: "Alex" },
      { token: "{{verification_code}}", label: "Verification Code", description: "Random one-time six-digit security code", example: "482731" },
      { token: "{{expires_in_minutes}}", label: "Expiration Minutes", description: "Number of minutes before the code expires", example: "15" },
      { token: "{{studio_name}}", label: "Studio Name", description: "Configured studio or brand name", example: "SPS Studio" }
    ],
    sample_data: { recipient_name: "Alex", verification_code: "482731", expires_in_minutes: "15", studio_name: "SPS Studio" }
  },

  test_email: {
    template_key: "test_email",
    name: "Deliverability & Integration Test",
    category: "diagnostics",
    description: "Diagnostic email used to verify Resend API key, DKIM/SPF domain settings, and SMTP pipeline.",
    subject: "[Test] Deliverability & Integration Test · {{studio_name}}",
    body_html: `
<div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
  <h3 style="margin: 0 0 6px 0; color: #065f46; font-size: 16px; font-weight: 600;">✓ Resend Integration Active</h3>
  <p style="margin: 0; color: #047857; font-size: 14px; line-height: 1.5;">
    Your Resend transactional email service is operational for <strong>{{studio_name}}</strong>. All transactional emails will be dispatched with these responsive branded templates.
  </p>
</div>

<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
  This test message confirms that your email provider, API credentials, and SMTP deliverability pipeline are working properly.
</p>

<table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; color: #1e293b; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">
  <tbody>
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 14px; font-weight: 600; color: #64748b; width: 140px;">Sender Address</td>
      <td style="padding: 10px 14px; font-family: monospace;">{{from_name}} &lt;{{from_email}}&gt;</td>
    </tr>
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 14px; font-weight: 600; color: #64748b;">Reply-To</td>
      <td style="padding: 10px 14px; font-family: monospace;">{{reply_to}}</td>
    </tr>
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 14px; font-weight: 600; color: #64748b;">Timestamp</td>
      <td style="padding: 10px 14px;">{{timestamp}}</td>
    </tr>
    <tr>
      <td style="padding: 10px 14px; font-weight: 600; color: #64748b;">Domain Status</td>
      <td style="padding: 10px 14px; color: #059669; font-weight: 600;">DKIM & SPF Verified</td>
    </tr>
  </tbody>
</table>

<div style="text-align: center; margin: 28px 0;">
  <a href="{{action_url}}" style="background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 9999px; font-weight: 600; font-size: 14px; display: inline-block;">
    {{action_text}}
  </a>
</div>
    `.trim(),
    body_text: `Resend Email Integration Test from {{studio_name}}\n\nYour Resend email service is operational.\nTimestamp: {{timestamp}}\nSender: {{from_name}} <{{from_email}}>`.trim(),
    available_tokens: [
      { token: "{{recipient_name}}", label: "Recipient Name", description: "Target recipient name", example: "Admin Tester" },
      { token: "{{from_name}}", label: "Sender Name", description: "Outgoing sender name", example: "SPS Studio" },
      { token: "{{from_email}}", label: "Sender Email", description: "Outgoing sender address", example: "onboarding@resend.dev" },
      { token: "{{reply_to}}", label: "Reply-To Email", description: "Reply-to address", example: "contact@spsstudio.com" },
      { token: "{{timestamp}}", label: "Timestamp", description: "Dispatch timestamp", example: "August 15, 2026 09:15 UTC" },
      { token: "{{action_url}}", label: "Dashboard Link", description: "Admin dashboard URL", example: "https://spsstudio.com/admin/settings" },
      { token: "{{action_text}}", label: "Button Label", description: "CTA button text", example: "Open Admin Dashboard" },
      { token: "{{studio_name}}", label: "Studio Name", description: "Studio brand name", example: "SPS Studio" }
    ],
    sample_data: {
      "recipient_name": "Admin Tester",
      "from_name": "SPS Studio",
      "from_email": "onboarding@resend.dev",
      "reply_to": "contact@spsstudio.com",
      "timestamp": new Date().toUTCString(),
      "action_url": "https://spsstudio.com/admin/settings",
      "action_text": "Open Admin Dashboard",
      "studio_name": "SPS Studio"
    }
  },

  invoice_payment_request: {
    template_key: "invoice_payment_request",
    name: "Invoice & Payment Request",
    category: "billing",
    description: "Sent to clients when an invoice is issued or a payment request is dispatched.",
    subject: "Invoice {{invoice_number}} from {{studio_name}} · {{amount_due}} due {{due_date}}",
    body_html: `
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
  Dear <strong>{{client_name}}</strong>,
</p>
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
  Please find attached invoice <strong>#{{invoice_number}}</strong> for visual media and photography services. A summary of this payment request is detailed below.
</p>

<!-- Invoice Summary Box -->
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; border-collapse: collapse; border-bottom: 1px solid #e2e8f0; margin-bottom: 12px;">
    <tr>
      <td class="invoice-summary-cell" valign="top" style="padding: 0 8px 12px 0;">
      <span style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.05em;">Invoice Number</span>
      <div style="font-size: 18px; font-weight: 800; color: #0f172a; font-family: monospace;">{{invoice_number}}</div>
      </td>
      <td class="invoice-summary-cell invoice-summary-amount" valign="top" align="right" style="padding: 0 0 12px 8px; text-align: right;">
      <span style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.05em;">Amount Due</span>
      <div style="font-size: 22px; line-height: 1.2; font-weight: 800; color: #0f172a; white-space: nowrap;">{{amount_due}}</div>
      </td>
    </tr>
  </table>

  <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155;">
    <tbody>
      <tr>
        <td style="padding: 4px 0; color: #64748b; width: 120px;">Issue Date:</td>
        <td style="padding: 4px 0; font-weight: 600;">{{issue_date}}</td>
        <td style="padding: 4px 0; color: #64748b; width: 100px; text-align: right;">Due Date:</td>
        <td style="padding: 4px 0; font-weight: 700; color: #dc2626; text-align: right;">{{due_date}}</td>
      </tr>
      {{#if property_address}}
      <tr>
        <td style="padding: 4px 0; color: #64748b;">Property Ref:</td>
        <td colspan="3" style="padding: 4px 0; font-weight: 600; color: #0f172a;">{{property_address}}</td>
      </tr>
      {{/if}}
    </tbody>
  </table>
</div>

<!-- Itemized Line Items (if provided) -->
{{#if line_items_html}}
<div style="margin: 24px 0;">
  <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin-bottom: 8px;">Line Items & Breakdown</div>
  {{line_items_html}}
</div>
{{/if}}

<!-- Payment Instructions / Bank Info -->
{{#if payment_method_instructions}}
<div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 20px 0;">
  <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #1e40af; margin-bottom: 6px;">Payment Instructions & Bank Transfer Details</div>
  <div style="font-size: 13px; color: #1e3a8a; line-height: 1.6; white-space: pre-wrap;">{{payment_method_instructions}}</div>
</div>
{{/if}}

{{#if notes}}
<div style="background-color: #fafaf9; border-left: 3px solid #cbd5e1; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #475569; font-style: italic;">
  "{{notes}}"
</div>
{{/if}}

<!-- Primary CTA Button -->
<div style="text-align: center; margin: 32px 0;">
  <a href="{{action_url}}" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15);">
    {{action_text}}
  </a>
</div>

{{#if payment_link}}
<p style="text-align: center; font-size: 12px; color: #64748b; margin-top: -16px; margin-bottom: 24px;">
  Direct card payment link: <a href="{{payment_link}}" style="color: #2563eb; text-decoration: underline;">Pay Online Securely</a>
</p>
{{/if}}

<p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 20px 0 0 0; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px;">
  {{payment_terms}}
</p>
    `.trim(),
    body_text: `Invoice {{invoice_number}} from {{studio_name}}\n\nClient: {{client_name}}\nAmount Due: {{amount_due}}\nDue Date: {{due_date}}\n\nView & Pay Online:\n{{action_url}}\n\n{{payment_terms}}`.trim(),
    available_tokens: [
      { token: "{{client_name}}", label: "Client Name", description: "Name of the client/recipient", example: "Jonathan Archer" },
      { token: "{{invoice_number}}", label: "Invoice Number", description: "Unique sequential invoice #", example: "INV-2026-0042" },
      { token: "{{amount_due}}", label: "Amount Due", description: "Formatted outstanding balance", example: "$1,850.00" },
      { token: "{{total_amount}}", label: "Total Amount", description: "Total invoice gross amount", example: "$1,850.00" },
      { token: "{{currency}}", label: "Currency Code", description: "ISO Currency code", example: "USD" },
      { token: "{{issue_date}}", label: "Issue Date", description: "Invoice date of emission", example: "2026-08-17" },
      { token: "{{due_date}}", label: "Due Date", description: "Invoice payment deadline", example: "2026-08-31" },
      { token: "{{property_address}}", label: "Property Address", description: "Associated real estate listing address", example: "742 Evergreen Terrace" },
      { token: "{{payment_link}}", label: "Payment Link", description: "Direct payment gateway link", example: "https://spsstudio.com/invoice/pay/123" },
      { token: "{{action_url}}", label: "Portal/Invoice URL", description: "Invoice view & print URL", example: "https://spsstudio.com/invoice/123" },
      { token: "{{action_text}}", label: "Button Label", description: "Primary CTA text", example: "Review & Pay Invoice" },
      { token: "{{line_items_html}}", label: "Invoice Line Items", description: "Rendered invoice items table generated by the billing system", example: "Itemized services table" },
      { token: "{{payment_method_instructions}}", label: "Bank Transfer Details", description: "Wire/ACH/IBAN transfer guidelines", example: "Wire transfer: SPS Media Group, IBAN: US89..." },
      { token: "{{payment_terms}}", label: "Payment Terms", description: "Standard terms and conditions", example: "Net 14 days" },
      { token: "{{notes}}", label: "Invoice Notes", description: "Additional invoice notes", example: "Thank you for your business!" },
      { token: "{{studio_name}}", label: "Studio Name", description: "Studio brand name", example: "SPS Studio" }
    ],
    sample_data: {
      "client_name": "Jonathan Archer",
      "recipient_name": "Jonathan Archer",
      "user.name": "Jonathan Archer",
      "invoice_number": "INV-2026-0042",
      "amount_due": "$1,850.00",
      "total_amount": "$1,850.00",
      "currency": "USD",
      "issue_date": "2026-08-17",
      "due_date": "2026-08-31",
      "property_address": "742 Evergreen Terrace, Beverly Hills, CA",
      "payment_link": "https://spsstudio.com/invoice/123",
      "action_url": "https://spsstudio.com/invoice/123",
      "action_text": "Review & Pay Invoice",
      "line_items_html": "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"width:100%;border-collapse:collapse;border:1px solid #e2e8f0\"><tr><td style=\"padding:10px 12px;color:#1e293b\">Real Estate Photography</td><td style=\"padding:10px 12px;text-align:center;color:#64748b\">1</td><td style=\"padding:10px 12px;text-align:right;font-weight:700;color:#0f172a\">$1,850.00</td></tr></table>",
      "payment_method_instructions": "Direct Bank Deposit / Wire Transfer:\nBank: First Premier Commercial Bank\nAccount: 9876543210\nRouting / SWIFT: FPCB091\nReference: INV-2026-0042",
      "payment_terms": "Payment due within 14 days of invoice date.",
      "notes": "Includes full HDR interior photography, 4K twilight drone capture, and interactive 3D virtual tour.",
      "studio_name": "SPS Studio"
    }
  },

  invoice_payment_receipt: {
    template_key: "invoice_payment_receipt",
    name: "Payment Receipt Confirmation",
    category: "billing",
    description: "Sent automatically to client upon recording payment for an invoice.",
    subject: "Payment Received: Invoice {{invoice_number}} · {{amount_paid}} · {{studio_name}}",
    body_html: `
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
  Dear <strong>{{client_name}}</strong>,
</p>
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
  Thank you! We have received and verified your payment for invoice <strong>#{{invoice_number}}</strong>.
</p>

<div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
    <tr>
      <td width="40" valign="middle" style="width: 40px;">
        <div style="width: 28px; height: 28px; line-height: 28px; background-color: #059669; color: #ffffff; border-radius: 50%; text-align: center; font-size: 16px; font-weight: bold;">✓</div>
      </td>
      <td valign="middle" style="font-size: 16px; font-weight: 700; color: #065f46;">Payment Confirmed</td>
    </tr>
  </table>
  <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #047857;">
    <tbody>
      <tr>
        <td style="padding: 4px 0; width: 140px;">Invoice Number:</td>
        <td style="padding: 4px 0; font-weight: 700;">{{invoice_number}}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0;">Amount Paid:</td>
        <td style="padding: 4px 0; font-weight: 800; font-size: 15px;">{{amount_paid}}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0;">Payment Date:</td>
        <td style="padding: 4px 0; font-weight: 600;">{{payment_date}}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0;">Invoice Status:</td>
        <td style="padding: 4px 0; font-weight: 700;">{{payment_status}}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0;">Balance Remaining:</td>
        <td style="padding: 4px 0; font-weight: 700;">{{balance_due}}</td>
      </tr>
      {{#if transaction_reference}}
      <tr>
        <td style="padding: 4px 0;">Transaction Ref:</td>
        <td style="padding: 4px 0; font-family: monospace;">{{transaction_reference}}</td>
      </tr>
      {{/if}}
    </tbody>
  </table>
</div>

<div style="text-align: center; margin: 30px 0;">
  <a href="{{action_url}}" style="background-color: #059669; color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
    View Updated Invoice & Receipt
  </a>
</div>

<p style="color: #64748b; font-size: 13px; line-height: 1.5; text-align: center; margin: 20px 0 0 0;">
  If you require an official PDF tax receipt or have questions regarding this payment, please reply to this email.
</p>
    `.trim(),
    body_text: `Payment Receipt: Invoice {{invoice_number}}\n\nClient: {{client_name}}\nAmount Paid: {{amount_paid}}\nStatus: {{payment_status}}\nBalance Remaining: {{balance_due}}\nDate: {{payment_date}}\nRef: {{transaction_reference}}\n\nView Receipt: {{action_url}}`.trim(),
    available_tokens: [
      { token: "{{client_name}}", label: "Client Name", description: "Client name", example: "Jonathan Archer" },
      { token: "{{invoice_number}}", label: "Invoice Number", description: "Invoice reference number", example: "INV-2026-0042" },
      { token: "{{amount_paid}}", label: "Amount Paid", description: "Total settled payment amount", example: "$1,850.00" },
      { token: "{{payment_date}}", label: "Payment Date", description: "Date payment was processed", example: "2026-08-17" },
      { token: "{{payment_status}}", label: "Invoice Payment Status", description: "Whether the invoice is fully paid or has a recorded partial payment", example: "Paid in Full" },
      { token: "{{balance_due}}", label: "Balance Remaining", description: "Outstanding invoice balance after this payment", example: "$0.00" },
      { token: "{{transaction_reference}}", label: "Transaction Reference", description: "Bank or Stripe reference code", example: "TXN_9918231" },
      { token: "{{action_url}}", label: "Invoice Receipt Link", description: "URL to view settled invoice", example: "https://spsstudio.com/invoice/123" },
      { token: "{{studio_name}}", label: "Studio Name", description: "Studio brand name", example: "SPS Studio" }
    ],
    sample_data: {
      "client_name": "Jonathan Archer",
      "invoice_number": "INV-2026-0042",
      "amount_paid": "$1,850.00",
      "payment_date": "2026-08-17",
      "payment_status": "Paid in Full",
      "balance_due": "$0.00",
      "transaction_reference": "WIRE-REF-99201",
      "action_url": "https://spsstudio.com/invoice/123",
      "studio_name": "SPS Studio"
    }
  },

  payment_request_approval_needed: {
    template_key: "payment_request_approval_needed",
    name: "Payment Request – Approval Needed",
    category: "billing",
    description: "Dispatched to superadmins when a team member creates a new internal payment request pending approval.",
    subject: "Payment request #{{request_id}} – approval needed",
    body_html: `
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
  Hello <strong>{{superadmin_name}}</strong>,
</p>
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
  A new internal payment request has been submitted by <strong>{{requester_name}}</strong> and requires your review and authorization.
</p>

<!-- Request Summary Card -->
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 20px 0;">
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 14px;">
    <tr>
      <td style="vertical-align: middle;">
        <span style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.05em; display: block; margin-bottom: 2px;">Request ID</span>
        <span style="font-size: 18px; font-weight: 800; color: #0f172a; font-family: monospace;">#{{request_id}}</span>
      </td>
      <td style="text-align: right; vertical-align: middle;">
        <span style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.05em; display: block; margin-bottom: 2px;">Amount Requested</span>
        <span style="font-size: 22px; font-weight: 800; color: #0f172a;">{{amount}} <span style="font-size: 14px; font-weight: 600; color: #64748b;">{{currency}}</span></span>
      </td>
    </tr>
  </table>

  <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155;">
    <tbody>
      <tr>
        <td style="padding: 6px 0; color: #64748b; width: 140px; font-weight: 600;">Requester:</td>
        <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">{{requester_name}} {{#if requester_email}}<span style="color: #64748b; font-weight: normal;">(&lt;{{requester_email}}&gt;)</span>{{/if}}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Subject / Purpose:</td>
        <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">{{title}}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Category:</td>
        <td style="padding: 6px 0;"><span style="background-color: #e2e8f0; color: #334155; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">{{category}}</span></td>
      </tr>
      {{#if due_date}}
      <tr>
        <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Due Date:</td>
        <td style="padding: 6px 0; font-weight: 600; color: #d97706;">{{due_date}}</td>
      </tr>
      {{/if}}
      {{#if beneficiary_name}}
      <tr>
        <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Beneficiary / Payee:</td>
        <td style="padding: 6px 0; font-weight: 600;">{{beneficiary_name}} {{#if beneficiary_account}}<span style="font-family: monospace; color: #64748b; font-size: 12px;">({{beneficiary_account}})</span>{{/if}}</td>
      </tr>
      {{/if}}
      {{#if linked_budget_title}}
      <tr>
        <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Linked Budget:</td>
        <td style="padding: 6px 0; color: #0284c7; font-weight: 600;">{{linked_budget_title}}</td>
      </tr>
      {{/if}}
      {{#if linked_invoice_number}}
      <tr>
        <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Linked Invoice:</td>
        <td style="padding: 6px 0; font-family: monospace; color: #0f172a;">#{{linked_invoice_number}}</td>
      </tr>
      {{/if}}
      <tr>
        <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Submission Date:</td>
        <td style="padding: 6px 0; color: #64748b;">{{created_at}}</td>
      </tr>
    </tbody>
  </table>
</div>

{{#if description}}
<div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #3b82f6; border-radius: 4px; padding: 14px 16px; margin: 18px 0;">
  <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Requester Details & Notes:</div>
  <div style="font-size: 14px; color: #1e293b; line-height: 1.5; white-space: pre-wrap;">{{description}}</div>
</div>
{{/if}}

<!-- Action Buttons -->
<div style="text-align: center; margin: 32px 0;">
  <a href="{{action_url}}" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15);">
    {{action_text}}
  </a>
</div>

<p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 20px 0 0 0; text-align: center;">
  As Superadmin, you can approve, deny, or place this request on hold directly from the studio management portal.
</p>
    `.trim(),
    body_text: `Payment Request – Approval Needed\n\nHello {{superadmin_name}},\n\nA new payment request (#{{request_id}}) has been submitted by {{requester_name}} and is pending your approval.\n\nDetails:\n- Request ID: #{{request_id}}\n- Requester: {{requester_name}} ({{requester_email}})\n- Purpose: {{title}}\n- Amount: {{amount}} {{currency}}\n- Category: {{category}}\n- Submitted: {{created_at}}\n- Description: {{description}}\n\nReview and authorize in the admin portal:\n{{action_url}}`.trim(),
    available_tokens: [
      { token: "{{superadmin_name}}", label: "Superadmin Name", description: "Name of the reviewing superadmin", example: "Alexander Sterling" },
      { token: "{{requester_name}}", label: "Requester Name", description: "Name of the coworker requesting payment", example: "Marcus Vance" },
      { token: "{{requester_email}}", label: "Requester Email", description: "Email address of requester", example: "marcus@spsstudio.hu" },
      { token: "{{request_id}}", label: "Request ID", description: "Unique payment request reference number", example: "REQ-2026-0018" },
      { token: "{{amount}}", label: "Amount", description: "Formatted monetary amount requested", example: "1,450.00" },
      { token: "{{currency}}", label: "Currency", description: "Currency ISO code", example: "USD" },
      { token: "{{title}}", label: "Title / Subject", description: "Subject or short summary of request", example: "Quarterly Drone Fleet Sensor Calibration" },
      { token: "{{reason}}", label: "Reason / Purpose", description: "Alias for request title or purpose", example: "Quarterly Drone Fleet Sensor Calibration" },
      { token: "{{description}}", label: "Description", description: "Full detailed justification or notes", example: "Scheduled inspection and sensor calibration for DJI drones." },
      { token: "{{category}}", label: "Category", description: "Expense classification category", example: "Equipment Maintenance" },
      { token: "{{status}}", label: "Status", description: "Current request status", example: "pending" },
      { token: "{{created_at}}", label: "Created At", description: "Timestamp of submission", example: "Aug 17, 2026, 10:45 AM" },
      { token: "{{due_date}}", label: "Due Date", description: "Payment deadline or due date", example: "2026-08-25" },
      { token: "{{beneficiary_name}}", label: "Beneficiary Name", description: "Payee or vendor company name", example: "AeroTech Pro Services LLC" },
      { token: "{{beneficiary_account}}", label: "Beneficiary Account", description: "Bank account or ACH details", example: "ACH: 9812-4451-9920" },
      { token: "{{linked_budget_title}}", label: "Linked Budget", description: "Title of linked budget entry", example: "Q3 Production Hardware" },
      { token: "{{linked_invoice_number}}", label: "Linked Invoice", description: "Associated invoice number", example: "INV-AERO-7712" },
      { token: "{{action_url}}", label: "Action URL", description: "Direct link to payment request in admin portal", example: "https://spsstudio.com/admin/payment-requests?requestId=req_123" },
      { token: "{{action_text}}", label: "Action Button Text", description: "Label on the review CTA button", example: "Review & Authorize in Admin" },
      { token: "{{studio_name}}", label: "Studio Name", description: "Brand name of the studio", example: "SPS Studio" }
    ],
    sample_data: {
      "superadmin_name": "Alexander Sterling",
      "requester_name": "Marcus Vance",
      "requester_email": "marcus@spsstudio.hu",
      "request_id": "REQ-2026-0018",
      "amount": "1,450.00",
      "currency": "USD",
      "title": "Quarterly Drone Fleet Sensor Calibration & Prop Replacement",
      "reason": "Quarterly Drone Fleet Sensor Calibration & Prop Replacement",
      "description": "Scheduled inspection and optical sensor recalibration for two DJI Inspire 3 drones, plus replacement carbon propeller sets.",
      "category": "Equipment Maintenance",
      "status": "pending",
      "created_at": "Aug 17, 2026, 10:45 AM",
      "due_date": "2026-08-25",
      "beneficiary_name": "AeroTech Pro Services LLC",
      "beneficiary_account": "ACH: 9812-4451-9920",
      "linked_budget_title": "Q3 Production Hardware & Maintenance",
      "linked_invoice_number": "INV-AERO-7712",
      "action_url": "https://spsstudio.com/admin/payment-requests?requestId=sample-123",
      "action_text": "Review & Authorize in Admin",
      "studio_name": "SPS Studio"
    }
  },

  payment_request_approved: {
    template_key: "payment_request_approved",
    name: "Payment Request – Approved",
    category: "billing",
    description: "Dispatched to the requester when their internal payment request has been approved by the superadmin.",
    subject: "Payment request #{{request_id}} – approved",
    body_html: `
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
  Hello <strong>{{requester_name}}</strong>,
</p>
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
  Great news! Your internal payment request <strong>#{{request_id}}</strong> has been reviewed and <strong style="color: #059669;">APPROVED</strong> by Superadmin <strong>{{superadmin_name}}</strong>.
</p>

<!-- Approved Status Banner -->
<div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 20px; margin: 20px 0;">
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; border-bottom: 1px solid #d1fae5; padding-bottom: 12px;">
    <tr>
      <td style="vertical-align: middle;">
        <span style="display: inline-block; width: 22px; height: 22px; background-color: #059669; color: #ffffff; border-radius: 50%; text-align: center; line-height: 22px; font-size: 13px; font-weight: bold; margin-right: 8px;">✓</span>
        <span style="font-size: 16px; font-weight: 700; color: #065f46; vertical-align: middle;">Approved for Payment</span>
      </td>
      <td style="text-align: right; vertical-align: middle;">
        <span style="font-size: 20px; font-weight: 800; color: #065f46;">{{amount}} <span style="font-size: 13px; font-weight: 600; color: #047857;">{{currency}}</span></span>
      </td>
    </tr>
  </table>

  <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #065f46;">
    <tbody>
      <tr>
        <td style="padding: 5px 0; width: 140px; font-weight: 600; color: #047857;">Request ID:</td>
        <td style="padding: 5px 0; font-weight: 700; font-family: monospace;">#{{request_id}}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; font-weight: 600; color: #047857;">Subject / Title:</td>
        <td style="padding: 5px 0; font-weight: 600; color: #065f46;">{{title}}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; font-weight: 600; color: #047857;">Category:</td>
        <td style="padding: 5px 0;">{{category}}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; font-weight: 600; color: #047857;">Approved By:</td>
        <td style="padding: 5px 0; font-weight: 600;">{{superadmin_name}}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; font-weight: 600; color: #047857;">Decision Date:</td>
        <td style="padding: 5px 0;">{{decision_at}}</td>
      </tr>
      {{#if beneficiary_name}}
      <tr>
        <td style="padding: 5px 0; font-weight: 600; color: #047857;">Beneficiary:</td>
        <td style="padding: 5px 0;">{{beneficiary_name}} {{#if beneficiary_account}}({{beneficiary_account}}){{/if}}</td>
      </tr>
      {{/if}}
      {{#if linked_budget_title}}
      <tr>
        <td style="padding: 5px 0; font-weight: 600; color: #047857;">Linked Budget:</td>
        <td style="padding: 5px 0;">{{linked_budget_title}}</td>
      </tr>
      {{/if}}
    </tbody>
  </table>
</div>

{{#if notes}}
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #059669; border-radius: 4px; padding: 14px 16px; margin: 18px 0;">
  <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Superadmin Comments:</div>
  <div style="font-size: 14px; color: #1e293b; line-height: 1.5; white-space: pre-wrap;">{{notes}}</div>
</div>
{{/if}}

<div style="text-align: center; margin: 30px 0;">
  <a href="{{action_url}}" style="background-color: #059669; color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.2);">
    {{action_text}}
  </a>
</div>

<p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 20px 0 0 0; text-align: center;">
  This expense has been recorded in the studio financial ledger and queued for disbursement.
</p>
    `.trim(),
    body_text: `Payment Request – Approved\n\nHello {{requester_name}},\n\nYour payment request (#{{request_id}}) for {{amount}} {{currency}} has been APPROVED by Superadmin {{superadmin_name}}.\n\nDetails:\n- Title: {{title}}\n- Amount: {{amount}} {{currency}}\n- Approved By: {{superadmin_name}}\n- Decision Date: {{decision_at}}\n- Category: {{category}}\n- Notes: {{notes}}\n\nView request details in portal:\n{{action_url}}`.trim(),
    available_tokens: [
      { token: "{{requester_name}}", label: "Requester Name", description: "Name of the team member receiving approval", example: "Marcus Vance" },
      { token: "{{superadmin_name}}", label: "Superadmin Name", description: "Name of the approving superadmin", example: "Alexander Sterling" },
      { token: "{{request_id}}", label: "Request ID", description: "Payment request tracking number", example: "REQ-2026-0018" },
      { token: "{{amount}}", label: "Amount", description: "Formatted monetary amount approved", example: "1,450.00" },
      { token: "{{currency}}", label: "Currency", description: "Currency code", example: "USD" },
      { token: "{{title}}", label: "Title / Purpose", description: "Subject or purpose of request", example: "Quarterly Drone Fleet Sensor Calibration" },
      { token: "{{reason}}", label: "Reason", description: "Alias for request title/purpose", example: "Quarterly Drone Fleet Sensor Calibration" },
      { token: "{{description}}", label: "Description", description: "Requester description", example: "Scheduled inspection and optical sensor recalibration." },
      { token: "{{notes}}", label: "Reviewer Notes", description: "Superadmin approval notes or disbursement schedule", example: "Approved. Expense scheduled for wire disbursement on Friday." },
      { token: "{{status}}", label: "Status", description: "Status label", example: "approved" },
      { token: "{{created_at}}", label: "Created Date", description: "Submission date", example: "Aug 17, 2026" },
      { token: "{{decision_at}}", label: "Decision Date", description: "Approval decision timestamp", example: "Aug 17, 2026, 11:30 AM" },
      { token: "{{category}}", label: "Category", description: "Expense category", example: "Equipment Maintenance" },
      { token: "{{due_date}}", label: "Due Date", description: "Payment deadline", example: "2026-08-25" },
      { token: "{{beneficiary_name}}", label: "Beneficiary Name", description: "Payee company or person", example: "AeroTech Pro Services LLC" },
      { token: "{{beneficiary_account}}", label: "Beneficiary Account", description: "Bank or payment details", example: "ACH: 9812-4451-9920" },
      { token: "{{linked_budget_title}}", label: "Linked Budget", description: "Title of associated budget", example: "Q3 Production Hardware & Maintenance" },
      { token: "{{action_url}}", label: "Action URL", description: "Link to view approved request", example: "https://spsstudio.com/admin/payment-requests?requestId=req_123" },
      { token: "{{action_text}}", label: "Action Button Text", description: "Label for the CTA button", example: "View Request Details" },
      { token: "{{studio_name}}", label: "Studio Name", description: "Brand name of the studio", example: "SPS Studio" }
    ],
    sample_data: {
      "requester_name": "Marcus Vance",
      "superadmin_name": "Alexander Sterling",
      "request_id": "REQ-2026-0018",
      "amount": "1,450.00",
      "currency": "USD",
      "title": "Quarterly Drone Fleet Sensor Calibration & Prop Replacement",
      "reason": "Quarterly Drone Fleet Sensor Calibration & Prop Replacement",
      "description": "Scheduled inspection and optical sensor recalibration for two DJI Inspire 3 drones.",
      "notes": "Approved. Expense has been confirmed and scheduled for wire disbursement on Friday.",
      "status": "approved",
      "created_at": "Aug 17, 2026",
      "decision_at": "Aug 17, 2026, 11:30 AM",
      "category": "Equipment Maintenance",
      "beneficiary_name": "AeroTech Pro Services LLC",
      "beneficiary_account": "ACH: 9812-4451-9920",
      "linked_budget_title": "Q3 Production Hardware & Maintenance",
      "action_url": "https://spsstudio.com/admin/payment-requests?requestId=sample-123",
      "action_text": "View Request Details",
      "studio_name": "SPS Studio"
    }
  },

  payment_request_denied: {
    template_key: "payment_request_denied",
    name: "Payment Request – Denied",
    category: "billing",
    description: "Dispatched to the requester when their payment request has been denied, including specific denial reasoning and resubmission guidance.",
    subject: "Payment request #{{request_id}} – denied",
    body_html: `
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
  Hello <strong>{{requester_name}}</strong>,
</p>
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
  Your internal payment request <strong>#{{request_id}}</strong> for <strong>{{amount}} {{currency}}</strong> has been reviewed by Superadmin <strong>{{superadmin_name}}</strong> and <strong style="color: #dc2626;">DENIED</strong>.
</p>

<!-- Denial Reason Callout Box -->
<div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; border-radius: 8px; padding: 18px; margin: 20px 0;">
  <div style="margin-bottom: 8px;">
    <span style="display: inline-block; width: 20px; height: 20px; background-color: #ef4444; color: #ffffff; border-radius: 50%; text-align: center; line-height: 20px; font-size: 12px; font-weight: bold; margin-right: 6px;">✕</span>
    <span style="font-size: 13px; font-weight: 700; color: #991b1b; text-transform: uppercase; letter-spacing: 0.04em; vertical-align: middle;">Reason for Denial:</span>
  </div>
  <div style="font-size: 14px; color: #7f1d1d; line-height: 1.6; white-space: pre-wrap; font-weight: 500;">
    {{denial_reason}}
  </div>
</div>

<!-- Request Details Summary -->
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
  <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155;">
    <tbody>
      <tr>
        <td style="padding: 5px 0; width: 140px; color: #64748b; font-weight: 600;">Request ID:</td>
        <td style="padding: 5px 0; font-weight: 700; font-family: monospace;">#{{request_id}}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; color: #64748b; font-weight: 600;">Subject / Title:</td>
        <td style="padding: 5px 0; font-weight: 600; color: #0f172a;">{{title}}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; color: #64748b; font-weight: 600;">Amount:</td>
        <td style="padding: 5px 0; font-weight: 700; color: #0f172a;">{{amount}} {{currency}}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; color: #64748b; font-weight: 600;">Category:</td>
        <td style="padding: 5px 0;">{{category}}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; color: #64748b; font-weight: 600;">Reviewed By:</td>
        <td style="padding: 5px 0;">{{superadmin_name}}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; color: #64748b; font-weight: 600;">Decision Date:</td>
        <td style="padding: 5px 0; color: #64748b;">{{decision_at}}</td>
      </tr>
    </tbody>
  </table>
</div>

<p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 16px 0;">
  You can review the feedback above, update your request with the missing documentation or quote, and resubmit it for Superadmin approval.
</p>

<div style="text-align: center; margin: 28px 0;">
  <a href="{{action_url}}" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
    {{action_text}}
  </a>
</div>
    `.trim(),
    body_text: `Payment Request – Denied\n\nHello {{requester_name}},\n\nYour payment request (#{{request_id}}) for {{amount}} {{currency}} has been DENIED by Superadmin {{superadmin_name}}.\n\nReason for Denial:\n{{denial_reason}}\n\nRequest Summary:\n- Title: {{title}}\n- Amount: {{amount}} {{currency}}\n- Category: {{category}}\n- Decision Date: {{decision_at}}\n\nYou can review notes and resubmit this request here:\n{{action_url}}`.trim(),
    available_tokens: [
      { token: "{{requester_name}}", label: "Requester Name", description: "Name of the coworker whose request was denied", example: "Marcus Vance" },
      { token: "{{superadmin_name}}", label: "Superadmin Name", description: "Name of the reviewing superadmin", example: "Alexander Sterling" },
      { token: "{{request_id}}", label: "Request ID", description: "Payment request reference number", example: "REQ-2026-0018" },
      { token: "{{amount}}", label: "Amount", description: "Monetary amount requested", example: "1,450.00" },
      { token: "{{currency}}", label: "Currency", description: "Currency code", example: "USD" },
      { token: "{{title}}", label: "Title / Purpose", description: "Subject of the payment request", example: "Quarterly Drone Fleet Sensor Calibration" },
      { token: "{{reason}}", label: "Reason", description: "Alias for request title/purpose", example: "Quarterly Drone Fleet Sensor Calibration" },
      { token: "{{description}}", label: "Description", description: "Original request description", example: "Scheduled inspection and optical sensor recalibration." },
      { token: "{{denial_reason}}", label: "Denial Reason", description: "Specific justification for the denial", example: "Please attach the official vendor pro-forma invoice showing the tax breakdown." },
      { token: "{{status}}", label: "Status", description: "Status label", example: "denied" },
      { token: "{{created_at}}", label: "Created Date", description: "Original submission date", example: "Aug 17, 2026" },
      { token: "{{decision_at}}", label: "Decision Date", description: "Denial decision timestamp", example: "Aug 17, 2026, 11:30 AM" },
      { token: "{{category}}", label: "Category", description: "Expense category", example: "Equipment Maintenance" },
      { token: "{{action_url}}", label: "Action URL", description: "Direct link to edit and resubmit request", example: "https://spsstudio.com/admin/payment-requests?requestId=req_123" },
      { token: "{{action_text}}", label: "Action Button Text", description: "Label for the CTA button", example: "Review & Resubmit Request" },
      { token: "{{studio_name}}", label: "Studio Name", description: "Brand name of the studio", example: "SPS Studio" }
    ],
    sample_data: {
      "requester_name": "Marcus Vance",
      "superadmin_name": "Alexander Sterling",
      "request_id": "REQ-2026-0018",
      "amount": "1,450.00",
      "currency": "USD",
      "title": "Quarterly Drone Fleet Sensor Calibration & Prop Replacement",
      "reason": "Quarterly Drone Fleet Sensor Calibration & Prop Replacement",
      "description": "Scheduled inspection and optical sensor recalibration for two DJI Inspire 3 drones.",
      "denial_reason": "Please attach the official vendor pro-forma invoice or formal quote from AeroTech showing the tax breakdown before we can approve this disbursement.",
      "status": "denied",
      "created_at": "Aug 17, 2026",
      "decision_at": "Aug 17, 2026, 11:30 AM",
      "category": "Equipment Maintenance",
      "action_url": "https://spsstudio.com/admin/payment-requests?requestId=sample-123",
      "action_text": "Review & Resubmit Request",
      "studio_name": "SPS Studio"
    }
  },

  payment_request_on_hold: {
    template_key: "payment_request_on_hold",
    name: "Payment Request – Placed On Hold",
    category: "billing",
    description: "Dispatched to the requester when their payment request has been placed on hold, detailing required clarification or missing documentation.",
    subject: "Payment request #{{request_id}} – placed on hold",
    body_html: `
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
  Hello <strong>{{requester_name}}</strong>,
</p>
<p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
  Your internal payment request <strong>#{{request_id}}</strong> for <strong>{{amount}} {{currency}}</strong> has been reviewed by Superadmin <strong>{{superadmin_name}}</strong> and has been <strong style="color: #d97706;">PLACED ON HOLD</strong> pending further clarification or documentation.
</p>

<!-- Hold Reason Callout Box -->
<div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 18px; margin: 20px 0;">
  <div style="margin-bottom: 8px;">
    <span style="display: inline-block; width: 20px; height: 20px; background-color: #f59e0b; color: #ffffff; border-radius: 50%; text-align: center; line-height: 20px; font-size: 12px; font-weight: bold; margin-right: 6px;">⏸</span>
    <span style="font-size: 13px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 0.04em; vertical-align: middle;">Reason / Instructions for Hold:</span>
  </div>
  <div style="font-size: 14px; color: #78350f; line-height: 1.6; white-space: pre-wrap; font-weight: 500;">
    {{hold_reason}}
  </div>
</div>

<!-- Request Summary Card -->
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
  <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155;">
    <tbody>
      <tr>
        <td style="padding: 5px 0; width: 140px; color: #64748b; font-weight: 600;">Request ID:</td>
        <td style="padding: 5px 0; font-weight: 700; font-family: monospace;">#{{request_id}}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; color: #64748b; font-weight: 600;">Subject / Title:</td>
        <td style="padding: 5px 0; font-weight: 600; color: #0f172a;">{{title}}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; color: #64748b; font-weight: 600;">Amount:</td>
        <td style="padding: 5px 0; font-weight: 700; color: #0f172a;">{{amount}} {{currency}}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; color: #64748b; font-weight: 600;">Category:</td>
        <td style="padding: 5px 0;">{{category}}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; color: #64748b; font-weight: 600;">Reviewed By:</td>
        <td style="padding: 5px 0;">{{superadmin_name}}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; color: #64748b; font-weight: 600;">Decision Date:</td>
        <td style="padding: 5px 0; color: #64748b;">{{decision_at}}</td>
      </tr>
      {{#if beneficiary_name}}
      <tr>
        <td style="padding: 5px 0; color: #64748b; font-weight: 600;">Beneficiary:</td>
        <td style="padding: 5px 0;">{{beneficiary_name}} {{#if beneficiary_account}}({{beneficiary_account}}){{/if}}</td>
      </tr>
      {{/if}}
      {{#if linked_budget_title}}
      <tr>
        <td style="padding: 5px 0; color: #64748b; font-weight: 600;">Linked Budget:</td>
        <td style="padding: 5px 0;">{{linked_budget_title}}</td>
      </tr>
      {{/if}}
    </tbody>
  </table>
</div>

<p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 16px 0;">
  Please provide the requested information, adjust your request, or upload the required attachments. Once updated, you can resubmit it for review.
</p>

<div style="text-align: center; margin: 28px 0;">
  <a href="{{action_url}}" style="background-color: #d97706; color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(217, 119, 6, 0.2);">
    {{action_text}}
  </a>
</div>
    `.trim(),
    body_text: `Payment Request – Placed On Hold\n\nHello {{requester_name}},\n\nYour payment request (#{{request_id}}) for {{amount}} {{currency}} has been PLACED ON HOLD by Superadmin {{superadmin_name}}.\n\nReason / Instructions for Hold:\n{{hold_reason}}\n\nRequest Summary:\n- Title: {{title}}\n- Amount: {{amount}} {{currency}}\n- Category: {{category}}\n- Decision Date: {{decision_at}}\n\nYou can review notes and update your request here:\n{{action_url}}`.trim(),
    available_tokens: [
      { token: "{{requester_name}}", label: "Requester Name", description: "Name of the coworker whose request was placed on hold", example: "Marcus Vance" },
      { token: "{{superadmin_name}}", label: "Superadmin Name", description: "Name of the reviewing superadmin", example: "Alexander Sterling" },
      { token: "{{request_id}}", label: "Request ID", description: "Payment request tracking number", example: "REQ-2026-0018" },
      { token: "{{amount}}", label: "Amount", description: "Monetary amount requested", example: "1,450.00" },
      { token: "{{currency}}", label: "Currency", description: "Currency code", example: "USD" },
      { token: "{{title}}", label: "Title / Purpose", description: "Subject of the payment request", example: "Quarterly Drone Fleet Sensor Calibration" },
      { token: "{{reason}}", label: "Reason", description: "Alias for request title/purpose", example: "Quarterly Drone Fleet Sensor Calibration" },
      { token: "{{description}}", label: "Description", description: "Original request description", example: "Scheduled inspection and optical sensor recalibration." },
      { token: "{{hold_reason}}", label: "Hold Reason", description: "Instructions or clarification needed", example: "Please attach the second contractor quote for budget comparison." },
      { token: "{{notes}}", label: "Reviewer Notes", description: "Superadmin comments", example: "Please attach the second contractor quote for budget comparison." },
      { token: "{{status}}", label: "Status", description: "Status label", example: "on_hold" },
      { token: "{{created_at}}", label: "Created Date", description: "Original submission date", example: "Aug 17, 2026" },
      { token: "{{decision_at}}", label: "Decision Date", description: "Decision timestamp", example: "Aug 17, 2026, 11:30 AM" },
      { token: "{{category}}", label: "Category", description: "Expense category", example: "Equipment Maintenance" },
      { token: "{{due_date}}", label: "Due Date", description: "Payment deadline", example: "2026-08-25" },
      { token: "{{beneficiary_name}}", label: "Beneficiary Name", description: "Payee company or person", example: "AeroTech Pro Services LLC" },
      { token: "{{beneficiary_account}}", label: "Beneficiary Account", description: "Bank or payment details", example: "ACH: 9812-4451-9920" },
      { token: "{{linked_budget_title}}", label: "Linked Budget", description: "Title of associated budget", example: "Q3 Production Hardware & Maintenance" },
      { token: "{{action_url}}", label: "Action URL", description: "Direct link to edit and update request", example: "https://spsstudio.com/admin/payment-requests?requestId=req_123" },
      { token: "{{action_text}}", label: "Action Button Text", description: "Label for the CTA button", example: "Update & Resubmit Request" },
      { token: "{{studio_name}}", label: "Studio Name", description: "Brand name of the studio", example: "SPS Studio" }
    ],
    sample_data: {
      "requester_name": "Marcus Vance",
      "superadmin_name": "Alexander Sterling",
      "request_id": "REQ-2026-0018",
      "amount": "1,450.00",
      "currency": "USD",
      "title": "Quarterly Drone Fleet Sensor Calibration & Prop Replacement",
      "reason": "Quarterly Drone Fleet Sensor Calibration & Prop Replacement",
      "description": "Scheduled inspection and optical sensor recalibration for two DJI Inspire 3 drones.",
      "hold_reason": "Please attach the second contractor quote or clarification on whether express shipping is included before we approve this disbursement.",
      "notes": "Please attach the second contractor quote or clarification on whether express shipping is included before we approve this disbursement.",
      "status": "on_hold",
      "created_at": "Aug 17, 2026",
      "decision_at": "Aug 17, 2026, 11:30 AM",
      "category": "Equipment Maintenance",
      "beneficiary_name": "AeroTech Pro Services LLC",
      "beneficiary_account": "ACH: 9812-4451-9920",
      "linked_budget_title": "Q3 Production Hardware & Maintenance",
      "action_url": "https://spsstudio.com/admin/payment-requests?requestId=sample-123",
      "action_text": "Update & Resubmit Request",
      "studio_name": "SPS Studio"
    }
  }
};

/**
 * Sanitize HTML to prevent XSS while allowing standard email markup
 */
export function sanitizeEmailHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== "string") return "";
  
  let cleaned = rawHtml;
  // Remove script tags and contents
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  // Remove iframe, object, embed
  cleaned = cleaned.replace(/<\/?(iframe|object|embed|applet|meta|link)\b[^>]*>/gi, "");
  // Remove inline JS event handlers like onclick, onload, onerror
  cleaned = cleaned.replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, "");
  // Remove javascript: pseudo-protocols
  cleaned = cleaned.replace(/href\s*=\s*(?:'javascript:[^']*'|"javascript:[^"]*")/gi, 'href="#"');

  return cleaned;
}

/**
 * Robust Token Interpolator: Replaces {{token}} and conditional blocks {{#if token}}...{{/if}}
 */
export function interpolateTemplateTokens(
  templateStr: string,
  tokens: Record<string, any>,
  config?: Partial<EmailSenderConfig>
): string {
  if (!templateStr || typeof templateStr !== "string") return "";

  // Combine tokens with standard aliases and sender config
  const merged: Record<string, any> = {
    studio_name: config?.studioName || "SPS Studio",
    footer_text: config?.footerText || `${config?.studioName || "SPS Studio"} · All rights reserved.`,
    from_email: config?.fromEmail || "onboarding@resend.dev",
    from_name: config?.fromName || "SPS Studio",
    reply_to: config?.replyToEmail || "contact@spsstudio.com",
    current_year: new Date().getFullYear().toString(),
    timestamp: new Date().toUTCString(),
    ...tokens
  };

  // Flatten nested objects (e.g. user.name -> user.name, inquiryDetails.name -> client_name)
  if (merged.inquiryDetails) {
    if (merged.inquiryDetails.name && !merged.client_name) merged.client_name = merged.inquiryDetails.name;
    if (merged.inquiryDetails.email && !merged.client_email) merged.client_email = merged.inquiryDetails.email;
    if (merged.inquiryDetails.phone && !merged.client_phone) merged.client_phone = merged.inquiryDetails.phone;
    if (merged.inquiryDetails.property_address && !merged.property_address) merged.property_address = merged.inquiryDetails.property_address;
    if (merged.inquiryDetails.subject && !merged.inquiry_subject) merged.inquiry_subject = merged.inquiryDetails.subject;
    if (merged.inquiryDetails.message && !merged.inquiry_message) merged.inquiry_message = merged.inquiryDetails.message;
  }

  // Handle aliases
  if (merged.recipientName && !merged["user.name"]) merged["user.name"] = merged.recipientName;
  if (merged["user.name"] && !merged.recipient_name) merged.recipient_name = merged["user.name"];
  if (merged.recipient_name && !merged["user.name"]) merged["user.name"] = merged.recipient_name;
  if (merged.userEmail && !merged["user.email"]) merged["user.email"] = merged.userEmail;
  if (merged["user.email"] && !merged.userEmail) merged.userEmail = merged["user.email"];
  if (merged.actionUrl && !merged.action_url) merged.action_url = merged.actionUrl;
  if (merged.action_url && !merged.reset_link) merged.reset_link = merged.action_url;
  if (merged.action_url && !merged.magic_link) merged.magic_link = merged.action_url;
  if (merged.action_url && !merged.invitation_link) merged.invitation_link = merged.action_url;
  if (merged.invitation_link && !merged.action_url) merged.action_url = merged.invitation_link;
  if (merged.invitation_link && !merged.magic_link) merged.magic_link = merged.invitation_link;
  if (merged.action_url && !merged.verification_link) merged.verification_link = merged.action_url;
  if (merged.action_url && !merged.gallery_url) merged.gallery_url = merged.action_url;
  if (merged.actionText && !merged.action_text) merged.action_text = merged.actionText;
  if (merged.projectName && !merged.project_name) merged.project_name = merged.projectName;
  if (merged.projectStatus && !merged.project_status) merged.project_status = merged.projectStatus;
  if (merged.additionalNotes && !merged.additional_notes) merged.additional_notes = merged.additionalNotes;
  if (merged.expiresInMinutes && !merged.expiry_minutes) merged.expiry_minutes = merged.expiresInMinutes;
  if (merged.expiresInHours && !merged.expiry_hours) merged.expiry_hours = merged.expiresInHours;
  if (merged.expiry_hours && !merged.expiresInHours) merged.expiresInHours = merged.expiry_hours;
  if (merged.accept_link && !merged.action_url) merged.action_url = merged.accept_link;
  if (merged.action_url && !merged.accept_link) merged.accept_link = merged.action_url;
  if (merged.acceptLink && !merged.accept_link) merged.accept_link = merged.acceptLink;
  if (merged.accept_link && !merged.invitation_link) merged.invitation_link = merged.accept_link;
  if (merged.invitation_link && !merged.accept_link) merged.accept_link = merged.invitation_link;
  if (merged.expiration_days && !merged.expiry_days) merged.expiry_days = merged.expiration_days;
  if (merged.expiry_days && !merged.expiration_days) merged.expiration_days = merged.expiry_days;
  if (merged.expiresInDays && !merged.expiration_days) merged.expiration_days = merged.expiresInDays;
  if (merged.supportEmail && !merged.support_email) merged.support_email = merged.supportEmail;
  if (!merged.support_email) merged.support_email = merged.reply_to || "contact@spsstudio.com";
  if (merged.role_description && !merged.roleDescription) merged.roleDescription = merged.role_description;
  if (merged.custom_message && !merged.customMessage) merged.customMessage = merged.custom_message;
  if (merged.invoiceNumber && !merged.invoice_number) merged.invoice_number = merged.invoiceNumber;
  if (merged.amountDue && !merged.amount_due) merged.amount_due = merged.amountDue;
  if (merged.totalAmount && !merged.total_amount) merged.total_amount = merged.totalAmount;
  if (merged.issueDate && !merged.issue_date) merged.issue_date = merged.issueDate;
  if (merged.dueDate && !merged.due_date) merged.due_date = merged.dueDate;
  if (merged.propertyAddress && !merged.property_address) merged.property_address = merged.propertyAddress;
  if (merged.paymentLink && !merged.payment_link) merged.payment_link = merged.paymentLink;
  if (merged.paymentMethodInstructions && !merged.payment_method_instructions) merged.payment_method_instructions = merged.paymentMethodInstructions;
  if (merged.paymentTerms && !merged.payment_terms) merged.payment_terms = merged.paymentTerms;
  if (merged.clientName && !merged.client_name) merged.client_name = merged.clientName;
  if (merged.amountPaid && !merged.amount_paid) merged.amount_paid = merged.amountPaid;
  if (merged.paymentDate && !merged.payment_date) merged.payment_date = merged.paymentDate;
  if (merged.transactionReference && !merged.transaction_reference) merged.transaction_reference = merged.transactionReference;

  // Payment Request Tokens & Aliases
  if (merged.requesterName && !merged.requester_name) merged.requester_name = merged.requesterName;
  if (merged.requester_name && !merged.requesterName) merged.requesterName = merged.requester_name;
  if (merged.requester_name && !merged["user.name"]) merged["user.name"] = merged.requester_name;
  if (merged.requester_name && !merged.recipient_name) merged.recipient_name = merged.requester_name;
  if (merged.requesterEmail && !merged.requester_email) merged.requester_email = merged.requesterEmail;
  if (merged.requester_email && !merged["user.email"]) merged["user.email"] = merged.requester_email;

  if (merged.superadminName && !merged.superadmin_name) merged.superadmin_name = merged.superadminName;
  if (merged.superadmin_name && !merged.superadminName) merged.superadminName = merged.superadmin_name;
  if (merged.reviewer_name && !merged.superadmin_name) merged.superadmin_name = merged.reviewer_name;
  if (merged.reviewed_by_name && !merged.superadmin_name) merged.superadmin_name = merged.reviewed_by_name;

  if (merged.requestId && !merged.request_id) merged.request_id = merged.requestId;
  if (merged.request_id && !merged.requestId) merged.requestId = merged.request_id;
  if (merged.request_number && !merged.request_id) merged.request_id = merged.request_number;
  if (merged.request_id && !merged.request_number) merged.request_number = merged.request_id;

  if (merged.amount && typeof merged.amount === "number") {
    merged.amount = merged.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (merged.amount && !merged.amount_formatted) merged.amount_formatted = String(merged.amount);

  if (merged.title && !merged.reason) merged.reason = merged.title;
  if (merged.reason && !merged.title) merged.title = merged.reason;
  if (merged.description && !merged.reason) merged.reason = merged.description;

  if (merged.denialReason && !merged.denial_reason) merged.denial_reason = merged.denialReason;
  if (merged.review_notes && !merged.denial_reason) merged.denial_reason = merged.review_notes;
  if (merged.denial_reason && !merged.notes) merged.notes = merged.denial_reason;
  if (merged.review_notes && !merged.notes) merged.notes = merged.review_notes;

  if (merged.holdReason && !merged.hold_reason) merged.hold_reason = merged.holdReason;
  if (merged.review_notes && !merged.hold_reason) merged.hold_reason = merged.review_notes;
  if (merged.notes && !merged.hold_reason) merged.hold_reason = merged.notes;
  if (merged.hold_reason && !merged.notes) merged.notes = merged.hold_reason;

  if (merged.decisionAt && !merged.decision_at) merged.decision_at = merged.decisionAt;
  if (merged.reviewed_at && !merged.decision_at) merged.decision_at = merged.reviewed_at;
  if (merged.createdAt && !merged.created_at) merged.created_at = merged.createdAt;

  if (merged.beneficiaryName && !merged.beneficiary_name) merged.beneficiary_name = merged.beneficiaryName;
  if (merged.beneficiaryAccount && !merged.beneficiary_account) merged.beneficiary_account = merged.beneficiaryAccount;
  if (merged.linkedBudgetTitle && !merged.linked_budget_title) merged.linked_budget_title = merged.linkedBudgetTitle;
  if (merged.linkedInvoiceNumber && !merged.linked_invoice_number) merged.linked_invoice_number = merged.linkedInvoiceNumber;

  let result = templateStr;

  // Process conditional blocks from the inside out so nested constructs such
  // as beneficiary_name -> beneficiary_account are evaluated correctly.
  // The negative lookahead prevents an outer block from consuming an inner
  // block's closing tag before that inner block has been resolved.
  const innermostConditional = /\{\{#if\s+([a-zA-Z0-9_.]+)\}\}((?:(?!\{\{#if\s+)[\s\S])*?)\{\{\/if\}\}/gi;
  let conditionalPass = 0;
  let replacedConditional = true;

  while (replacedConditional && conditionalPass < 50) {
    replacedConditional = false;
    result = result.replace(innermostConditional, (_match, key, innerContent) => {
      replacedConditional = true;
      const val = merged[key] ?? merged[key.toLowerCase()];
      if (val && String(val).trim() !== "" && val !== "0" && val !== false) {
        return innerContent;
      }
      return "";
    });
    conditionalPass += 1;
  }

  // Process standard variable replacements: {{token_name}} or {{user.name}}
  result = result.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (match, key) => {
    // Check direct key
    if (merged[key] !== undefined && merged[key] !== null) {
      return String(merged[key]);
    }
    // Check lower-case key
    const lower = key.toLowerCase();
    if (merged[lower] !== undefined && merged[lower] !== null) {
      return String(merged[lower]);
    }
    // Check underscore/dot variations
    const under = key.replace(/\./g, "_");
    if (merged[under] !== undefined && merged[under] !== null) {
      return String(merged[under]);
    }
    const dot = key.replace(/_/g, ".");
    if (merged[dot] !== undefined && merged[dot] !== null) {
      return String(merged[dot]);
    }
    return "";
  });

  return result;
}

/**
 * Wrap inner HTML in Master Responsive Email Layout
 */
export function wrapInEmailLayout(
  bodyHtml: string,
  title: string,
  config: EmailSenderConfig,
  layoutText: Record<string, any> = {}
): string {
  // If the user already provided a full HTML document, return sanitized version
  if (/<!DOCTYPE\s+html/i.test(bodyHtml) || /<html\b[^>]*>/i.test(bodyHtml)) {
    return sanitizeEmailHtml(bodyHtml);
  }

  const currentYear = new Date().getFullYear();
  const studioName = config.studioName || "SPS Studio";
  const escapeLayoutText = (value: any) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const renderLayoutText = (value: any) => escapeLayoutText(interpolateTemplateTokens(String(value ?? ""), layoutText, config));
  const headerTitle = renderLayoutText(layoutText.header_title || studioName);
  const headerSubtitle = renderLayoutText(layoutText.header_subtitle || "Visual Marketing & Photography");
  const footerNotice = renderLayoutText(layoutText.footer_text || config.footerText || `${studioName} · All rights reserved.`);
  const footerServiceText = renderLayoutText(layoutText.footer_service_text || `Sent securely via Resend Email Service · © ${currentYear} ${studioName}`);
  const escapeAttribute = (value: any) => escapeLayoutText(value).replace(/'/g, "&#39;");
  const hasLogo = config.brandDisplay !== "name_only" && Boolean(config.logoUrl);
  const showBrandName = config.brandDisplay !== "logo_only" || !hasLogo;
  const emailBrandMarkup = `${hasLogo ? `
                    <img src="${escapeAttribute(config.logoUrl)}" alt="${escapeAttribute(config.logoAltText || studioName)}" width="180" style="display: block; width: auto; max-width: 180px; max-height: 64px; height: auto; margin: 0 auto; object-fit: contain;" />` : ""}${showBrandName ? `
                    <div style="color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; text-transform: uppercase;${hasLogo ? " margin-top: 12px;" : ""}">
                      ${headerTitle}
                    </div>` : ""}
                    <div style="color: #94a3b8; font-size: 11px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 6px;">
                      ${headerSubtitle}
                    </div>`;

  const brandDark = "#0f172a";
  const brandAccent = "#3b82f6";
  const brandBg = "#f8fafc";
  const cardBg = "#ffffff";
  const textDark = "#1e293b";
  const textMuted = "#64748b";
  const borderLight = "#e2e8f0";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>${studioName}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: ${brandBg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color-scheme: light only; }
    .email-container { width: 100%; max-width: 600px; }
    @media only screen and (max-width: 620px) {
      .email-outer { padding: 16px 8px !important; }
      .email-content { padding: 26px 20px 24px !important; }
      .email-header { padding: 24px 20px !important; }
      .email-footer { padding: 20px !important; }
      .invoice-summary-cell { display: block !important; width: 100% !important; padding: 0 0 10px 0 !important; text-align: left !important; }
      .invoice-summary-amount { padding-top: 2px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${brandBg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
    <tr>
      <td class="email-outer" align="center" style="padding: 40px 16px;">
        <!-- Email Container (max 600px) -->
        <table class="email-container" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; max-width: 600px; background-color: ${cardBg}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid ${borderLight};">
          <!-- Header Banner -->
          <tr>
            <td class="email-header" style="background-color: ${brandDark}; padding: 28px 32px; text-align: center; border-bottom: 3px solid ${brandAccent};">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    ${emailBrandMarkup}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td class="email-content" style="padding: 36px 32px 32px 32px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="email-footer" style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid ${borderLight}; text-align: center;">
              <p style="color: ${textMuted}; font-size: 12px; line-height: 1.5; margin: 0 0 8px 0;">
                ${footerNotice}
              </p>
              <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                ${footerServiceText}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Load all email templates with customized overrides from database
 */
export async function getAllEmailTemplates(): Promise<EmailTemplate[]> {
  const resultList: EmailTemplate[] = [];

  // 1. Fetch any custom templates from DB
  const customMap = new Map<string, any>();
  try {
    const dbRes = await db.execute("SELECT * FROM email_templates");
    for (const row of dbRes.rows) {
      customMap.set(row.template_key as string, row);
    }
  } catch (err) {
    console.warn("Could not query email_templates table:", err);
  }

  // 2. Iterate through all standard templates
  for (const [key, defaultDef] of Object.entries(DEFAULT_EMAIL_TEMPLATES)) {
    const custom = customMap.get(key);
    if (custom) {
      let parsedTokens: EmailTemplateToken[] = defaultDef.available_tokens;
      try {
        if (custom.available_tokens) {
          const customTokens = JSON.parse(custom.available_tokens) as EmailTemplateToken[];
          const customTokenNames = new Set(customTokens.map((item) => item.token));
          parsedTokens = [...customTokens, ...defaultDef.available_tokens.filter((item) => !customTokenNames.has(item.token))];
        }
      } catch {}

      let parsedSample: Record<string, any> = defaultDef.sample_data;
      try {
        if (custom.sample_data) parsedSample = { ...defaultDef.sample_data, ...JSON.parse(custom.sample_data) };
      } catch {}
      let parsedDefaults: Record<string, string> = {};
      try { if (custom.token_defaults) parsedDefaults = JSON.parse(custom.token_defaults); } catch {}

      resultList.push({
        id: custom.id,
        template_key: key,
        name: custom.name || defaultDef.name,
        category: (custom.category as any) || defaultDef.category,
        description: custom.description || defaultDef.description,
        subject: custom.subject || defaultDef.subject,
        body_html: custom.body_html || defaultDef.body_html,
        body_text: custom.body_text || defaultDef.body_text,
        available_tokens: parsedTokens,
        sample_data: parsedSample,
        token_defaults: parsedDefaults,
        version: Number(custom.version) || 1,
        is_customized: Boolean(custom.is_customized),
        last_updated_at: custom.last_updated_at || new Date().toISOString(),
        updated_by: custom.updated_by || "system",
        default_subject: defaultDef.subject,
        default_body_html: defaultDef.body_html,
        default_body_text: defaultDef.body_text
      });
    } else {
      resultList.push({
        id: `def_${key}`,
        template_key: key,
        name: defaultDef.name,
        category: defaultDef.category,
        description: defaultDef.description,
        subject: defaultDef.subject,
        body_html: defaultDef.body_html,
        body_text: defaultDef.body_text,
        available_tokens: defaultDef.available_tokens,
        sample_data: defaultDef.sample_data,
        version: 1,
        is_customized: false,
        last_updated_at: new Date().toISOString(),
        updated_by: "system",
        default_subject: defaultDef.subject,
        default_body_html: defaultDef.body_html,
        default_body_text: defaultDef.body_text
      });
    }
  }

  // Marketing templates are intentionally database-only so admins can create
  // any number of reusable campaigns without adding code-defined templates.
  for (const [key, custom] of customMap.entries()) {
    if (DEFAULT_EMAIL_TEMPLATES[key] || custom.category !== "marketing") continue;
    let parsedTokens: EmailTemplateToken[] = [];
    let parsedSample: Record<string, any> = {};
    let parsedDefaults: Record<string, string> = {};
    try { parsedTokens = JSON.parse((custom.available_tokens as string) || "[]"); } catch {}
    try { parsedSample = JSON.parse((custom.sample_data as string) || "{}"); } catch {}
    try { parsedDefaults = JSON.parse((custom.token_defaults as string) || "{}"); } catch {}
    resultList.push({
      id: custom.id as string,
      template_key: key,
      name: custom.name as string,
      category: "marketing",
      description: (custom.description as string) || "",
      subject: custom.subject as string,
      body_html: custom.body_html as string,
      body_text: (custom.body_text as string) || "",
      available_tokens: parsedTokens,
      sample_data: parsedSample,
      token_defaults: parsedDefaults,
      version: Number(custom.version) || 1,
      is_customized: true,
      last_updated_at: (custom.last_updated_at as string) || new Date().toISOString(),
      updated_by: (custom.updated_by as string) || "admin"
    });
  }

  return resultList;
}

/**
 * Get a specific email template by key
 */
export async function getEmailTemplateByKey(key: string): Promise<EmailTemplate | null> {
  const normalizedKey = key === "magic_link" ? "magic_link_login" : key;
  const defaultDef = DEFAULT_EMAIL_TEMPLATES[normalizedKey];

  try {
    const res = await db.execute({
      sql: "SELECT * FROM email_templates WHERE template_key = ?",
      args: [normalizedKey]
    });

    if (res.rows.length > 0) {
      const row = res.rows[0];
      if (!defaultDef && row.category !== "marketing") return null;
      let parsedTokens: EmailTemplateToken[] = defaultDef?.available_tokens || [];
      try {
        if (row.available_tokens) {
          const customTokens = JSON.parse(row.available_tokens as string) as EmailTemplateToken[];
          const customTokenNames = new Set(customTokens.map((item) => item.token));
          parsedTokens = [...customTokens, ...(defaultDef?.available_tokens || []).filter((item) => !customTokenNames.has(item.token))];
        }
      } catch {}

      let parsedSample: Record<string, any> = defaultDef?.sample_data || {};
      try {
        if (row.sample_data) parsedSample = { ...(defaultDef?.sample_data || {}), ...JSON.parse(row.sample_data as string) };
      } catch {}
      let parsedDefaults: Record<string, string> = {};
      try { if (row.token_defaults) parsedDefaults = JSON.parse(row.token_defaults as string); } catch {}

      return {
        id: row.id as string,
        template_key: normalizedKey,
        name: (row.name as string) || defaultDef?.name || "Marketing email",
        category: (row.category as any) || defaultDef?.category || "marketing",
        description: (row.description as string) || defaultDef?.description || "",
        subject: (row.subject as string) || defaultDef?.subject || "",
        body_html: (row.body_html as string) || defaultDef?.body_html || "",
        body_text: (row.body_text as string) || defaultDef?.body_text || "",
        available_tokens: parsedTokens,
        sample_data: parsedSample,
        token_defaults: parsedDefaults,
        version: Number(row.version) || 1,
        is_customized: Boolean(row.is_customized),
        last_updated_at: (row.last_updated_at as string) || new Date().toISOString(),
        updated_by: (row.updated_by as string) || "system",
        default_subject: defaultDef?.subject,
        default_body_html: defaultDef?.body_html,
        default_body_text: defaultDef?.body_text
      };
    }
  } catch (err) {
    console.error("Error retrieving template from DB:", err);
  }

  if (!defaultDef) return null;

  return {
    id: `def_${normalizedKey}`,
    template_key: normalizedKey,
    name: defaultDef.name,
    category: defaultDef.category,
    description: defaultDef.description,
    subject: defaultDef.subject,
    body_html: defaultDef.body_html,
    body_text: defaultDef.body_text,
    available_tokens: defaultDef.available_tokens,
    sample_data: defaultDef.sample_data,
    version: 1,
    is_customized: false,
    last_updated_at: new Date().toISOString(),
    updated_by: "system",
    default_subject: defaultDef.subject,
    default_body_html: defaultDef.body_html,
    default_body_text: defaultDef.body_text
  };
}

/**
 * Save custom email template changes
 */
export async function saveCustomEmailTemplate(
  key: string,
  data: {
    subject: string;
    body_html: string;
    body_text: string;
    token_defaults?: Record<string, string>;
    updated_by?: string;
  }
): Promise<EmailTemplate> {
  const normalizedKey = key === "magic_link" ? "magic_link_login" : key;
  const defaultDef = DEFAULT_EMAIL_TEMPLATES[normalizedKey];

  const cleanSubject = data.subject.trim();
  const cleanHtml = sanitizeEmailHtml(data.body_html);
  const cleanText = data.body_text.trim();
  const updatedBy = data.updated_by || "admin";
  const now = new Date().toISOString();
  try { await db.execute("ALTER TABLE email_templates ADD COLUMN token_defaults TEXT NOT NULL DEFAULT '{}'"); } catch {}
  const cleanTokenDefaults = Object.fromEntries(Object.entries(data.token_defaults || {}).filter(([key, value]) => key && typeof value === "string").map(([key, value]) => [key, value.slice(0, 10000)]));

  // Check existing
  const existing = await db.execute({
    sql: "SELECT * FROM email_templates WHERE template_key = ?",
    args: [normalizedKey]
  });

  const existingRow = existing.rows[0];
  if (!defaultDef && (!existingRow || existingRow.category !== "marketing")) {
    throw new Error(`Unknown email template key: ${key}`);
  }

  let currentVersion = 1;
  let templateId: string = crypto.randomUUID();

  if (existing.rows.length > 0) {
    templateId = existing.rows[0].id as string;
    currentVersion = (Number(existing.rows[0].version) || 1) + 1;
    await db.execute({
      sql: `UPDATE email_templates 
            SET subject = ?, body_html = ?, body_text = ?, token_defaults = ?, version = ?, is_customized = 1, last_updated_at = ?, updated_by = ?
            WHERE template_key = ?`,
      args: [cleanSubject, cleanHtml, cleanText, JSON.stringify(cleanTokenDefaults), currentVersion, now, updatedBy, normalizedKey]
    });
  } else {
    await db.execute({
      sql: `INSERT INTO email_templates 
            (id, template_key, name, category, description, subject, body_html, body_text, available_tokens, sample_data, token_defaults, version, is_customized, last_updated_at, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`,
      args: [
        templateId,
        normalizedKey,
        defaultDef!.name,
        defaultDef!.category,
        defaultDef!.description,
        cleanSubject,
        cleanHtml,
        cleanText,
        JSON.stringify(defaultDef!.available_tokens),
        JSON.stringify(defaultDef!.sample_data),
        JSON.stringify(cleanTokenDefaults),
        now,
        updatedBy
      ]
    });
  }

  return (await getEmailTemplateByKey(normalizedKey))!;
}

/**
 * Reset template to hardcoded default
 */
export async function resetEmailTemplateToDefault(key: string): Promise<EmailTemplate> {
  const normalizedKey = key === "magic_link" ? "magic_link_login" : key;
  const defaultDef = DEFAULT_EMAIL_TEMPLATES[normalizedKey];
  if (!defaultDef) {
    throw new Error(`Unknown email template key: ${key}`);
  }

  await db.execute({
    sql: "DELETE FROM email_templates WHERE template_key = ?",
    args: [normalizedKey]
  });

  return (await getEmailTemplateByKey(normalizedKey))!;
}

/**
 * Generate branded responsive HTML and text from template & tokens
 */
export async function generateEmailFromTemplate(
  templateKey: string,
  tokens: Record<string, any> = {},
  config: EmailSenderConfig
): Promise<{ html: string; text: string; subject: string; title: string }> {
  // Normalize legacy keys
  let resolvedKey = templateKey;
  if (templateKey === "magic_link") {
    resolvedKey = tokens.magicLinkType === "signup" ? "magic_link_signup" : "magic_link_login";
  }

  const template = await getEmailTemplateByKey(resolvedKey);
  const defaultDef = DEFAULT_EMAIL_TEMPLATES[resolvedKey] || DEFAULT_EMAIL_TEMPLATES.test_email;

  const subjectTemplate = template?.subject || defaultDef.subject;
  const bodyHtmlTemplate = template?.body_html || defaultDef.body_html;
  const bodyTextTemplate = template?.body_text || defaultDef.body_text;
  const title = template?.name || defaultDef.name;

  const resolvedTokens = { ...(template?.token_defaults || {}), ...tokens };
  const renderedSubject = interpolateTemplateTokens(subjectTemplate, resolvedTokens, config);
  const renderedInnerHtml = interpolateTemplateTokens(bodyHtmlTemplate, resolvedTokens, config);
  const renderedText = interpolateTemplateTokens(bodyTextTemplate, resolvedTokens, config);

  const fullHtml = wrapInEmailLayout(renderedInnerHtml, title, config, resolvedTokens);

  return {
    html: fullHtml,
    text: renderedText,
    subject: renderedSubject,
    title
  };
}

/**
 * Synchronous backward-compatible HTML generator
 */
export function generateEmailHtml(
  templateId: SendEmailOptions["templateId"],
  data: EmailTemplateData = {},
  config: EmailSenderConfig
): { html: string; text: string; defaultSubject: string } {
  let resolvedKey = templateId;
  if (templateId === "magic_link") {
    resolvedKey = data.magicLinkType === "signup" ? "magic_link_signup" : "magic_link_login";
  }

  const def = DEFAULT_EMAIL_TEMPLATES[resolvedKey] || DEFAULT_EMAIL_TEMPLATES.test_email;
  const renderedSubject = interpolateTemplateTokens(def.subject, data, config);
  const renderedInnerHtml = interpolateTemplateTokens(def.body_html, data, config);
  const renderedText = interpolateTemplateTokens(def.body_text, data, config);

  const fullHtml = wrapInEmailLayout(renderedInnerHtml, def.name, config);

  return {
    html: fullHtml,
    text: renderedText,
    defaultSubject: renderedSubject
  };
}

/**
 * Main Transactional Email Dispatcher
 */
export async function sendTransactionalEmail(options: SendEmailOptions): Promise<{
  success: boolean;
  messageId?: string;
  status: "sent" | "failed" | "mock_logged";
  error?: string;
  simulated?: boolean;
}> {
  const config = await getEmailSenderConfig();
  const resend = getResendClient();

  const recipientString = Array.isArray(options.to) ? options.to.join(", ") : options.to;
  const fromFormatted = options.from || `${config.fromName} <${config.fromEmail}>`;
  const replyToFormatted = options.replyTo || config.replyToEmail;

  // Resolve dynamic template
  const generated = await generateEmailFromTemplate(options.templateId, options.templateData || {}, config);
  const subject = options.subject || generated.subject;
  const html = options.customHtml || generated.html;
  const text = options.customText || generated.text;

  const logId = crypto.randomUUID();

  // If no RESEND_API_KEY is configured, record simulated send
  if (!resend) {
    const errorMsg = "RESEND_API_KEY is not set in environment variables. Email was generated and simulated locally.";
    console.log(`[Email Service - Simulated Send] To: ${recipientString} | Subject: ${subject} | Template: ${options.templateId}`);
    
    try {
      await db.execute({
        sql: `INSERT INTO email_logs (id, recipient, sender, subject, template_id, status, error_message, metadata) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          logId,
          recipientString,
          fromFormatted,
          subject,
          options.templateId,
          "mock_logged",
          errorMsg,
          JSON.stringify({ simulated: true, templateData: options.templateData })
        ]
      });
    } catch (dbErr) {
      console.error("Failed to write mock email log to db:", dbErr);
    }

    return {
      success: true,
      messageId: `sim_${logId.slice(0, 8)}`,
      status: "mock_logged",
      simulated: true,
      error: errorMsg
    };
  }

  // Attempt real delivery through Resend SDK
  try {
    const response = await resend.emails.send({
      from: fromFormatted,
      to: options.to,
      subject: subject,
      html: html,
      text: text,
      replyTo: replyToFormatted
    });

    if (response.error) {
      const errorMsg = response.error.message || "Resend API returned an error.";
      console.warn("[Email Service - Resend Delivery Warning - Fallback to Mock Log]", response.error);

      await db.execute({
        sql: `INSERT INTO email_logs (id, recipient, sender, subject, template_id, status, error_message, metadata) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          logId,
          recipientString,
          fromFormatted,
          subject,
          options.templateId,
          "mock_logged",
          `Resend API notice: ${errorMsg}. Logged locally for testing.`,
          JSON.stringify({ errorObj: response.error, simulated: true })
        ]
      });

      return {
        success: true,
        messageId: `sim_${logId.slice(0, 8)}`,
        status: "mock_logged",
        simulated: true,
        error: errorMsg
      };
    }

    const messageId = response.data?.id || logId;

    await db.execute({
      sql: `INSERT INTO email_logs (id, recipient, sender, subject, template_id, status, error_message, metadata) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        logId,
        recipientString,
        fromFormatted,
        subject,
        options.templateId,
        "sent",
        null,
        JSON.stringify({ resendMessageId: messageId })
      ]
    });

    return {
      success: true,
      messageId,
      status: "sent"
    };
  } catch (error: any) {
    const errorMsg = error.message || "Unexpected exception while delivering email";
    console.error("[Email Service - Delivery Exception]", error);

    try {
      await db.execute({
        sql: `INSERT INTO email_logs (id, recipient, sender, subject, template_id, status, error_message, metadata) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          logId,
          recipientString,
          fromFormatted,
          subject,
          options.templateId,
          "failed",
          errorMsg,
          JSON.stringify({ exception: error.toString() })
        ]
      });
    } catch {}

    return {
      success: false,
      status: "failed",
      error: errorMsg
    };
  }
}

/**
 * Public and Admin Email Workflow Helpers
 */
export async function sendPasswordResetToken(email: string, appOrigin: string): Promise<{ success: boolean; error?: string }> {
  const userRes = await db.execute({
    sql: "SELECT id, email FROM users WHERE email = ?",
    args: [email]
  });

  if (userRes.rows.length === 0) {
    return { success: true };
  }

  const user = userRes.rows[0];
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  await db.execute({
    sql: "INSERT INTO password_resets (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)",
    args: [crypto.randomUUID(), user.id, token, expiresAt]
  });

  const resetUrl = `${appOrigin}/client/reset-password?token=${token}`;

  const res = await sendTransactionalEmail({
    to: email,
    templateId: "password_reset",
    templateData: {
      recipientName: (email as string).split("@")[0],
      actionUrl: resetUrl,
      actionText: "Reset Password",
      expiresInMinutes: 60
    }
  });

  return { success: res.success, error: res.error };
}

export async function sendMagicLinkEmail(
  email: string,
  type: "signup" | "login",
  appOrigin: string,
  metadata?: {
    property_address?: string;
    advertisement_link?: string;
    properties?: Array<{ property_name?: string; address: string; metadata?: any } | string>;
    referral_code?: string;
    ip_address?: string;
  }
): Promise<{ success: boolean; token?: string; error?: string; simulated?: boolean; deduplicated?: boolean }> {
  const token = crypto.randomBytes(32).toString("hex");
  const ttlMinutes = 20;
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

  let userId: string | null = null;
  try {
    const existingUser = await db.execute({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [email]
    });
    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id as string;
    }
  } catch (e) {
    console.error("Error checking user for magic link:", e);
  }

  // Normalize properties array (max 10 allowed at registration)
  let normalizedProps: Array<{ property_name?: string; address: string }> = [];
  if (Array.isArray(metadata?.properties)) {
    normalizedProps = metadata.properties.slice(0, 10).map((p, idx) => {
      if (typeof p === "string") {
        return { property_name: `Property ${idx + 1}`, address: p.trim() };
      }
      return {
        property_name: p.property_name?.trim() || `Property ${idx + 1}`,
        address: p.address?.trim() || ""
      };
    }).filter(p => p.address.length > 0);
  }

  const primaryAddress = normalizedProps.length > 0
    ? normalizedProps[0].address
    : (metadata?.property_address || "");

  const propertiesJson = JSON.stringify(normalizedProps);
  const referralCode = metadata?.referral_code ? metadata.referral_code.trim().toUpperCase() : "";

  const linkId = crypto.randomUUID();
  // An atomic conditional insert makes the endpoint idempotent across browser
  // double-submits, network retries, and separate Vercel instances. Only the
  // request that actually inserts a fresh token is allowed to send an email.
  const inserted = await db.execute({
    sql: `INSERT INTO magic_links (id, email, user_id, token, type, property_address, advertisement_link, properties_json, referral_code, ip_address, expires_at)
          SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
          WHERE NOT EXISTS (
            SELECT 1 FROM magic_links
            WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
              AND type = ?
              AND used_at IS NULL
              AND created_at > datetime('now', '-45 seconds')
          )`,
    args: [
      linkId,
      email,
      userId,
      token,
      type,
      primaryAddress,
      metadata?.advertisement_link || "",
      propertiesJson,
      referralCode,
      metadata?.ip_address || "",
      expiresAt,
      email,
      type,
    ]
  });

  if (inserted.rowsAffected === 0) {
    return { success: true, deduplicated: true };
  }

  const verifyUrl = `${appOrigin.replace(/\/$/, "")}/auth/magic-link?token=${encodeURIComponent(token)}`;
  const isSignup = type === "signup";
  const templateKey = isSignup ? "magic_link_signup" : "magic_link_login";

  const propSummary = normalizedProps.length > 1
    ? `${normalizedProps.length} registered properties (Primary: ${primaryAddress})`
    : primaryAddress;

  const emailRes = await sendTransactionalEmail({
    to: email,
    templateId: templateKey,
    templateData: {
      recipientName: email.split("@")[0],
      magicLinkType: type,
      actionUrl: verifyUrl,
      actionText: isSignup ? "Complete Registration & Sign In" : "Sign In to Client Portal",
      property_address: propSummary,
      advertisement_link: metadata?.advertisement_link || "",
      expiresInMinutes: ttlMinutes
    }
  });

  // A provider failure must not leave an idempotency record that prevents the
  // visitor from retrying the delivery immediately.
  if (!emailRes.success) {
    try {
      await db.execute({ sql: "DELETE FROM magic_links WHERE id = ? AND used_at IS NULL", args: [linkId] });
    } catch (cleanupError) {
      console.error("Failed to clean up undelivered magic link:", cleanupError);
    }
  }

  return {
    success: emailRes.success,
    token,
    error: emailRes.error,
    simulated: emailRes.simulated
  };
}

export async function sendInquiryAlerts(submission: {
  name: string;
  email: string;
  phone?: string;
  property_address?: string;
  property_city?: string;
  travel_distance_one_way_km?: number;
  travel_distance_round_trip_km?: number;
  availability_start?: string;
  availability_end?: string;
  subject?: string;
  message: string;
  plan_id?: string;
  plan_name?: string;
  plan_price?: number;
  extra_services?: string | Array<Record<string, any>>;
  fee_details?: string | Array<Record<string, any>>;
  estimated_total?: number;
  currency?: string;
}, appOrigin: string): Promise<{
  success: boolean;
  admin: Awaited<ReturnType<typeof sendTransactionalEmail>> | null;
  customer: Awaited<ReturnType<typeof sendTransactionalEmail>> | null;
  errors: string[];
}> {
  const config = await getEmailSenderConfig();

  const parseItems = (value: unknown): Array<Record<string, any>> => {
    if (Array.isArray(value)) return value.filter((item) => item && typeof item === "object");
    if (typeof value !== "string" || !value.trim()) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === "object") : [];
    } catch {
      return [];
    }
  };
  const escapeHtml = (value: unknown) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
  const currency = String(submission.currency || "USD").toUpperCase();
  const formatMoney = (value: unknown) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "";
    try {
      return new Intl.NumberFormat("hu-HU", { style: "currency", currency }).format(amount);
    } catch {
      return `${amount.toLocaleString("hu-HU")} ${currency}`;
    }
  };
  const extras = parseItems(submission.extra_services);
  const fees = parseItems(submission.fee_details);
  const travelFeeItem = fees.find((item) =>
    item.destination_city || item.round_trip_km !== undefined || item.one_way_km !== undefined
  );
  const otherFees = travelFeeItem ? fees.filter((item) => item !== travelFeeItem) : fees;
  const selectedItemsHtml = extras.map((item) => `
    <tr><td style="padding:7px 0;color:#475569;">${escapeHtml(item.quantity || 1)}× ${escapeHtml(item.title || "Additional service")}</td><td style="padding:7px 0;text-align:right;font-weight:600;color:#0f172a;">${escapeHtml(formatMoney(item.subtotal ?? item.price))}</td></tr>`).join("");
  const feeDetailsHtml = otherFees.map((item) => `
    <tr><td style="padding:7px 0;color:#475569;">${escapeHtml(item.name || "Additional fee")}${item.explanation ? `<div style="font-size:11px;color:#94a3b8;">${escapeHtml(item.explanation)}</div>` : ""}</td><td style="padding:7px 0;text-align:right;font-weight:600;color:#0f172a;">${Number(item.amount) === 0 ? "FREE" : escapeHtml(formatMoney(item.amount))}</td></tr>`).join("");
  const selectedItemsText = extras.map((item) => `${item.quantity || 1}x ${item.title || "Additional service"}: ${formatMoney(item.subtotal ?? item.price)}`).join("\n");
  const feeDetailsText = otherFees.map((item) => `${item.name || "Additional fee"}: ${Number(item.amount) === 0 ? "FREE" : formatMoney(item.amount)}${item.explanation ? ` (${item.explanation})` : ""}`).join("\n");
  const pricingTokens = {
    pricing_plan: submission.plan_name || "",
    plan_price: submission.plan_price ? formatMoney(submission.plan_price) : "",
    selected_items_html: selectedItemsHtml,
    selected_items_text: selectedItemsText,
    fee_details_html: feeDetailsHtml,
    fee_details_text: feeDetailsText,
    estimated_total: submission.estimated_total ? formatMoney(submission.estimated_total) : "",
    currency,
    property_city: submission.property_city || travelFeeItem?.destination_city || "",
    travel_distance_one_way: submission.travel_distance_one_way_km || travelFeeItem?.one_way_km
      ? `${submission.travel_distance_one_way_km || travelFeeItem?.one_way_km} km`
      : "",
    travel_distance_round_trip: submission.travel_distance_round_trip_km || travelFeeItem?.round_trip_km
      ? `${submission.travel_distance_round_trip_km || travelFeeItem?.round_trip_km} km`
      : "",
    estimated_travel_fee: travelFeeItem ? (Number(travelFeeItem.amount) === 0 ? "FREE" : formatMoney(travelFeeItem.amount)) : "",
  };

  let availabilityWindowStr = "";
  let formattedStartStr = "";
  let formattedEndStr = "";

  if (submission.availability_start && submission.availability_end) {
    try {
      const sDate = new Date(submission.availability_start);
      const eDate = new Date(submission.availability_end);
      if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime())) {
        const sFormatted = sDate.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit"
        });
        const eFormatted = eDate.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit"
        });
        formattedStartStr = sFormatted;
        formattedEndStr = eFormatted;
        availabilityWindowStr = `${sFormatted} – ${eFormatted}`;
      }
    } catch {
      availabilityWindowStr = `${submission.availability_start} – ${submission.availability_end}`;
    }
  }

  const adminSend = config.adminNotificationEmail
    ? sendTransactionalEmail({
      to: config.adminNotificationEmail,
      templateId: "inquiry_received",
      templateData: {
        inquiryDetails: submission,
        client_name: submission.name,
        client_email: submission.email,
        client_phone: submission.phone || "",
        property_address: submission.property_address || "General Inquiry",
        inquiry_subject: submission.subject || (submission.plan_name ? `Inquiry for ${submission.plan_name}` : "Photography Session Inquiry"),
        pricing_plan: submission.plan_name || "",
        availability_window: availabilityWindowStr,
        availability_start: formattedStartStr || submission.availability_start || "",
        availability_end: formattedEndStr || submission.availability_end || "",
        inquiry_message: submission.message,
        ...pricingTokens,
        actionUrl: `${appOrigin}/admin/contacts`,
        actionText: "Open Inquiries Dashboard"
      }
    })
    : Promise.resolve(null);

  const customerSend = submission.email
    ? sendTransactionalEmail({
      to: submission.email,
      templateId: "inquiry_confirmation",
      templateData: {
        client_name: submission.name,
        recipientName: submission.name,
        inquiry_message: submission.message,
        pricing_plan: submission.plan_name || "",
        ...pricingTokens,
        contact_email: config.replyToEmail || "contact@spsstudio.com"
      }
    })
    : Promise.resolve(null);

  const [admin, customer] = await Promise.all([adminSend, customerSend]);
  const errors: string[] = [];

  if (!config.adminNotificationEmail) {
    errors.push("Admin notification email is not configured.");
  } else if (!admin || admin.status !== "sent" || !admin.success) {
    errors.push(admin?.error || "Admin notification email was not accepted by Resend.");
  }

  if (!customer || customer.status !== "sent" || !customer.success) {
    errors.push(customer?.error || "Customer confirmation email was not accepted by Resend.");
  }

  return {
    success: errors.length === 0,
    admin,
    customer,
    errors,
  };
}

/**
 * Generates a secure invitation magic link and dispatches the portal_invitation email template
 */
export async function sendPortalInvitationEmail(
  customer: {
    id: string;
    name: string;
    email: string;
    property_address?: string | null;
    advertisement_link?: string | null;
  },
  appOrigin: string,
  options?: {
    expiresInHours?: number;
    couponCode?: string;
  }
): Promise<{
  success: boolean;
  token?: string;
  expiresAt?: string;
  error?: string;
  simulated?: boolean;
  messageId?: string;
}> {
  const token = crypto.randomBytes(32).toString("hex");
  const ttlHours = options?.expiresInHours || 48; // 48 hours for portal invitation links
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

  let userId: string | null = null;
  try {
    const existingUser = await db.execute({
      sql: "SELECT id FROM users WHERE LOWER(TRIM(email)) = ? AND role = 'client'",
      args: [customer.email.trim().toLowerCase()]
    });
    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id as string;
    }
  } catch (e) {
    console.error("[EmailService] Error looking up user for portal invitation:", e);
  }

  const linkId = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO magic_links (id, email, user_id, token, type, property_address, advertisement_link, referral_code, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      linkId,
      customer.email.trim().toLowerCase(),
      userId,
      token,
      "signup",
      customer.property_address || "",
      customer.advertisement_link || "",
      options?.couponCode?.trim().toUpperCase() || "",
      expiresAt
    ]
  });

  const verifyUrl = `${appOrigin.replace(/\/$/, "")}/auth/magic-link?token=${encodeURIComponent(token)}`;

  const emailRes = await sendTransactionalEmail({
    to: customer.email.trim(),
    templateId: options?.couponCode ? "portal_coupon_invitation" : "portal_invitation",
    templateData: {
      recipientName: customer.name || customer.email.split("@")[0],
      "user.name": customer.name || customer.email.split("@")[0],
      userEmail: customer.email.trim(),
      "user.email": customer.email.trim(),
      actionUrl: verifyUrl,
      invitation_link: verifyUrl,
      magic_link: verifyUrl,
      actionText: "Activate Client Portal Account",
      property_address: customer.property_address || "",
      advertisement_link: customer.advertisement_link || "",
      expiresInHours: ttlHours,
      expiry_hours: ttlHours,
      expiresInMinutes: ttlHours * 60,
      coupon_code: options?.couponCode?.trim().toUpperCase() || ""
    }
  });

  return {
    success: emailRes.success,
    token,
    expiresAt,
    error: emailRes.error,
    simulated: emailRes.simulated,
    messageId: emailRes.messageId
  };
}

/**
 * Dispatch Admin / Team Member Invitation Email
 */
export async function sendAdminInvitationEmail(
  invitation: {
    email: string;
    name?: string;
    role: string;
    workspace?: string;
    custom_message?: string;
    inviter_name?: string;
    inviter_email?: string;
  },
  appOrigin: string,
  options?: {
    expiresInDays?: number;
    token?: string;
  }
): Promise<{
  success: boolean;
  token: string;
  expiresAt: string;
  error?: string;
  simulated?: boolean;
  messageId?: string;
}> {
  const token = options?.token || crypto.randomBytes(32).toString("hex");
  const ttlDays = options?.expiresInDays || 7; // 7 days default
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

  const acceptUrl = `${appOrigin}/invite/accept?token=${token}`;
  const config = await getEmailSenderConfig();

  // Role descriptive label & permissions summary
  const roleKey = (invitation.role || "editor").toLowerCase();
  let roleDisplayName = "Editor";
  let roleDescription = "Access to manage photo galleries, project milestones, services, FAQs, and client submissions.";

  if (roleKey === "admin") {
    roleDisplayName = "Administrator";
    roleDescription = "Full access to studio portfolio, project deliverables, team management, pricing packages, and system settings.";
  } else if (roleKey === "viewer") {
    roleDisplayName = "Viewer";
    roleDescription = "Read-only view access across dashboards, visual media, schedules, and analytics.";
  } else {
    roleDisplayName = "Editor";
  }

  const recipientName = invitation.name?.trim() || invitation.email.split("@")[0];
  const inviterName = invitation.inviter_name?.trim() || (invitation.inviter_email ? invitation.inviter_email.split("@")[0] : "Studio Administrator");

  const emailRes = await sendTransactionalEmail({
    to: invitation.email.trim(),
    templateId: "admin_invitation",
    templateData: {
      recipient_name: recipientName,
      recipientName: recipientName,
      recipient_email: invitation.email.trim(),
      userEmail: invitation.email.trim(),
      inviter_name: inviterName,
      inviterName: inviterName,
      role: roleDisplayName,
      role_description: roleDescription,
      workspace: invitation.workspace?.trim() || "Main Studio",
      custom_message: invitation.custom_message?.trim() || "",
      accept_link: acceptUrl,
      action_url: acceptUrl,
      actionText: "Accept Invitation & Set Up Account",
      expiration_days: String(ttlDays),
      expiry_days: String(ttlDays),
      expiry_hours: String(ttlDays * 24),
      support_email: config.replyToEmail || "contact@spsstudio.com",
      studio_name: config.studioName || "SPS Studio"
    }
  });

  return {
    success: emailRes.success,
    token,
    expiresAt,
    error: emailRes.error,
    simulated: emailRes.simulated,
    messageId: emailRes.messageId
  };
}

// =========================================================================
// Payment Request Email Notification Helpers
// =========================================================================

export interface PaymentRequestEmailData {
  id: string;
  request_number?: string;
  requester_name: string;
  requester_email: string;
  superadmin_name?: string;
  title: string;
  amount: number | string;
  currency?: string;
  category?: string;
  description?: string;
  status?: string;
  created_at?: string;
  due_date?: string;
  beneficiary_name?: string;
  beneficiary_account?: string;
  linked_budget_entry_id?: string | null;
  linked_budget_title?: string;
  linked_invoice_id?: string | null;
  linked_invoice_number?: string;
  decision_at?: string;
  denial_reason?: string;
  hold_reason?: string;
  review_notes?: string;
  notes?: string;
}

/**
 * Dispatch "Payment request – approval needed" email to all active Superadmins
 */
export async function sendPaymentRequestCreatedEmail(
  request: PaymentRequestEmailData,
  appOrigin: string
): Promise<{ success: boolean; dispatchedCount: number; results: any[] }> {
  try {
    const config = await getEmailSenderConfig();

    // Query all active superadmins
    const superadminsRes = await db.execute(
      "SELECT id, email, name FROM users WHERE role = 'superadmin' AND is_active = 1"
    );

    const recipientsMap = new Map<string, string>();
    for (const row of superadminsRes.rows) {
      if (row.email && typeof row.email === "string" && row.email.includes("@")) {
        recipientsMap.set(row.email.trim().toLowerCase(), (row.name as string) || "Superadmin");
      }
    }

    // Fallback to admin notification email if no superadmins found in database
    if (recipientsMap.size === 0 && config.adminNotificationEmail && config.adminNotificationEmail.includes("@")) {
      recipientsMap.set(config.adminNotificationEmail.trim().toLowerCase(), "Superadmin");
    }

    const requestId = request.request_number || request.id;
    const numAmount = typeof request.amount === "number"
      ? request.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : String(request.amount || "0.00");

    const cleanOrigin = (appOrigin || "").replace(/\/$/, "");
    const actionUrl = `${cleanOrigin}/admin/payment-requests?requestId=${encodeURIComponent(request.id)}`;
    const approveUrl = `${cleanOrigin}/admin/payment-requests?requestId=${encodeURIComponent(request.id)}&action=approve`;
    const denyUrl = `${cleanOrigin}/admin/payment-requests?requestId=${encodeURIComponent(request.id)}&action=deny`;

    const createdAtFormatted = request.created_at
      ? new Date(request.created_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
      : new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

    const results: any[] = [];

    for (const [email, name] of recipientsMap.entries()) {
      const sendRes = await sendTransactionalEmail({
        to: email,
        templateId: "payment_request_approval_needed",
        templateData: {
          superadmin_name: name,
          recipient_name: name,
          requester_name: request.requester_name || "Team Member",
          requester_email: request.requester_email || "",
          request_id: requestId,
          request_number: requestId,
          amount: numAmount,
          currency: (request.currency || "USD").toUpperCase(),
          title: request.title || "Payment Request",
          reason: request.title || request.description || "Payment Request",
          description: request.description || "",
          category: request.category || "General",
          status: request.status || "pending",
          created_at: createdAtFormatted,
          due_date: request.due_date || "",
          beneficiary_name: request.beneficiary_name || "",
          beneficiary_account: request.beneficiary_account || "",
          linked_budget_title: request.linked_budget_title || "",
          linked_invoice_number: request.linked_invoice_number || "",
          action_url: actionUrl,
          action_text: "Review & Authorize in Admin",
          approve_url: approveUrl,
          deny_url: denyUrl,
          studio_name: config.studioName || "SPS Studio"
        }
      });
      results.push({ email, ...sendRes });
    }

    return {
      success: results.some(r => r.success),
      dispatchedCount: results.filter(r => r.success).length,
      results
    };
  } catch (err: any) {
    console.error("sendPaymentRequestCreatedEmail error:", err);
    return { success: false, dispatchedCount: 0, results: [{ error: err.message }] };
  }
}

/**
 * Dispatch "Payment request – approved" email to the requester
 */
export async function sendPaymentRequestApprovedEmail(
  request: PaymentRequestEmailData,
  appOrigin: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    if (!request.requester_email || !request.requester_email.includes("@")) {
      return { success: false, error: "Requester email address is missing or invalid" };
    }

    const config = await getEmailSenderConfig();
    const requestId = request.request_number || request.id;
    const numAmount = typeof request.amount === "number"
      ? request.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : String(request.amount || "0.00");

    const cleanOrigin = (appOrigin || "").replace(/\/$/, "");
    const actionUrl = `${cleanOrigin}/admin/payment-requests?requestId=${encodeURIComponent(request.id)}`;

    const decisionDateStr = request.decision_at
      ? new Date(request.decision_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
      : new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

    const sendRes = await sendTransactionalEmail({
      to: request.requester_email.trim(),
      templateId: "payment_request_approved",
      templateData: {
        requester_name: request.requester_name || "Team Member",
        recipient_name: request.requester_name || "Team Member",
        superadmin_name: request.superadmin_name || "Studio Administrator",
        request_id: requestId,
        request_number: requestId,
        amount: numAmount,
        currency: (request.currency || "USD").toUpperCase(),
        title: request.title || "Payment Request",
        reason: request.title || request.description || "Payment Request",
        description: request.description || "",
        notes: request.review_notes || request.notes || "Approved by Superadmin",
        review_notes: request.review_notes || request.notes || "",
        status: "approved",
        created_at: request.created_at ? new Date(request.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
        decision_at: decisionDateStr,
        category: request.category || "General",
        due_date: request.due_date || "",
        beneficiary_name: request.beneficiary_name || "",
        beneficiary_account: request.beneficiary_account || "",
        linked_budget_title: request.linked_budget_title || "",
        linked_invoice_number: request.linked_invoice_number || "",
        action_url: actionUrl,
        action_text: "View Request Details",
        studio_name: config.studioName || "SPS Studio"
      }
    });

    return {
      success: sendRes.success,
      result: sendRes,
      error: sendRes.error
    };
  } catch (err: any) {
    console.error("sendPaymentRequestApprovedEmail error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Dispatch "Payment request – denied" email to the requester
 */
export async function sendPaymentRequestDeniedEmail(
  request: PaymentRequestEmailData,
  appOrigin: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    if (!request.requester_email || !request.requester_email.includes("@")) {
      return { success: false, error: "Requester email address is missing or invalid" };
    }

    const config = await getEmailSenderConfig();
    const requestId = request.request_number || request.id;
    const numAmount = typeof request.amount === "number"
      ? request.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : String(request.amount || "0.00");

    const cleanOrigin = (appOrigin || "").replace(/\/$/, "");
    const actionUrl = `${cleanOrigin}/admin/payment-requests?requestId=${encodeURIComponent(request.id)}`;

    const decisionDateStr = request.decision_at
      ? new Date(request.decision_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
      : new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

    const denialReasonText = request.denial_reason || request.review_notes || "No specific reason provided.";

    const sendRes = await sendTransactionalEmail({
      to: request.requester_email.trim(),
      templateId: "payment_request_denied",
      templateData: {
        requester_name: request.requester_name || "Team Member",
        recipient_name: request.requester_name || "Team Member",
        superadmin_name: request.superadmin_name || "Studio Administrator",
        request_id: requestId,
        request_number: requestId,
        amount: numAmount,
        currency: (request.currency || "USD").toUpperCase(),
        title: request.title || "Payment Request",
        reason: request.title || request.description || "Payment Request",
        description: request.description || "",
        denial_reason: denialReasonText,
        review_notes: denialReasonText,
        notes: denialReasonText,
        status: "denied",
        created_at: request.created_at ? new Date(request.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
        decision_at: decisionDateStr,
        category: request.category || "General",
        due_date: request.due_date || "",
        beneficiary_name: request.beneficiary_name || "",
        beneficiary_account: request.beneficiary_account || "",
        action_url: actionUrl,
        action_text: "Review & Resubmit Request",
        studio_name: config.studioName || "SPS Studio"
      }
    });

    return {
      success: sendRes.success,
      result: sendRes,
      error: sendRes.error
    };
  } catch (err: any) {
    console.error("sendPaymentRequestDeniedEmail error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Dispatch "Payment request – placed on hold" email to the requester
 */
export async function sendPaymentRequestOnHoldEmail(
  request: PaymentRequestEmailData,
  appOrigin: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    if (!request.requester_email || !request.requester_email.includes("@")) {
      return { success: false, error: "Requester email address is missing or invalid" };
    }

    const config = await getEmailSenderConfig();
    const requestId = request.request_number || request.id;
    const numAmount = typeof request.amount === "number"
      ? request.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : String(request.amount || "0.00");

    const cleanOrigin = (appOrigin || "").replace(/\/$/, "");
    const actionUrl = `${cleanOrigin}/admin/payment-requests?requestId=${encodeURIComponent(request.id)}`;

    const decisionDateStr = request.decision_at
      ? new Date(request.decision_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
      : new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

    const holdReasonText = request.hold_reason || request.review_notes || request.notes || "Additional information or documentation is required.";

    const sendRes = await sendTransactionalEmail({
      to: request.requester_email.trim(),
      templateId: "payment_request_on_hold",
      templateData: {
        requester_name: request.requester_name || "Team Member",
        recipient_name: request.requester_name || "Team Member",
        superadmin_name: request.superadmin_name || "Studio Administrator",
        request_id: requestId,
        request_number: requestId,
        amount: numAmount,
        currency: (request.currency || "USD").toUpperCase(),
        title: request.title || "Payment Request",
        reason: request.title || request.description || "Payment Request",
        description: request.description || "",
        hold_reason: holdReasonText,
        review_notes: holdReasonText,
        notes: holdReasonText,
        status: "on_hold",
        created_at: request.created_at ? new Date(request.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
        decision_at: decisionDateStr,
        category: request.category || "General",
        due_date: request.due_date || "",
        beneficiary_name: request.beneficiary_name || "",
        beneficiary_account: request.beneficiary_account || "",
        linked_budget_title: request.linked_budget_title || "",
        linked_invoice_number: request.linked_invoice_number || "",
        action_url: actionUrl,
        action_text: "Update & Resubmit Request",
        studio_name: config.studioName || "SPS Studio"
      }
    });

    return {
      success: sendRes.success,
      result: sendRes,
      error: sendRes.error
    };
  } catch (err: any) {
    console.error("sendPaymentRequestOnHoldEmail error:", err);
    return { success: false, error: err.message };
  }
}
