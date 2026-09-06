import { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { THEME_PRESETS, ThemeColorMode } from "../../lib/themeTypes";

type PaletteMode = Pick<ThemeColorMode, "background" | "surface" | "text" | "mutedText" | "primary" | "accent">;
type PaletteSettings = { light: PaletteMode; dark: PaletteMode };

const keys: Array<{ key: keyof PaletteMode; label: string }> = [
  { key: "background", label: "Háttér" }, { key: "surface", label: "Felület / kártyák" }, { key: "text", label: "Fő szöveg" },
  { key: "mutedText", label: "Másodlagos szöveg" }, { key: "primary", label: "Elsődleges márkaszín" }, { key: "accent", label: "Kiemelőszín" },
];

function readPalette(value?: string): PaletteSettings {
  const fallback = THEME_PRESETS.find(theme => theme.id === "preset-sps-studio-cinematic") || THEME_PRESETS[0];
  const base = { light: { ...fallback.colors.light }, dark: { ...fallback.colors.dark } };
  try {
    const parsed = value ? JSON.parse(value) : {};
    const colors = parsed.colors || parsed;
    return { light: { ...base.light, ...(colors.light || {}) }, dark: { ...base.dark, ...(colors.dark || {}) } };
  } catch { return base; }
}

export function ThemeManager({ value, onChange }: { value?: string; onChange: (val: string) => void }) {
  const [palette, setPalette] = useState<PaletteSettings>(() => readPalette(value));
  useEffect(() => setPalette(readPalette(value)), [value]);
  const setColor = (mode: "light" | "dark", key: keyof PaletteMode, color: string) => {
    const next = { ...palette, [mode]: { ...palette[mode], [key]: color } };
    setPalette(next); onChange(JSON.stringify(next));
  };
  return <div className="space-y-5"><div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-muted-text"><div className="flex items-center gap-2 font-semibold text-text"><Palette className="h-4 w-4 text-primary" />Weboldal alapszínei</div><p className="mt-1 text-xs leading-5">Csak a publikus weboldal színpalettája módosítható. Betűtípusok, árnyékok, formák és az adminfelület témája rögzített.</p></div><div className="grid gap-5 lg:grid-cols-2">{(["light", "dark"] as const).map(mode => <section key={mode} className="rounded-xl border border-border bg-background p-4"><h4 className="text-sm font-bold text-text">{mode === "light" ? "Világos mód" : "Sötét mód"}</h4><div className="mt-4 grid gap-3">{keys.map(({ key, label }) => <label key={key} className="grid grid-cols-[2rem_1fr] items-center gap-3 text-sm font-medium text-text"><input type="color" value={palette[mode][key]} onChange={event => setColor(mode, key, event.target.value)} className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent p-0.5" aria-label={`${mode} ${label}`} /><span>{label}<code className="ml-2 text-xs font-normal text-muted-text">{palette[mode][key]}</code></span></label>)}</div></section>)}</div></div>;
}
