import { useState, useEffect } from "react";
import { Label } from "../ui/Label";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";

export function TranslatableInput({
  label,
  value,
  onChange,
  siteLanguages,
  isTextarea = false,
}: {
  label: string;
  value: string | undefined;
  onChange: (val: string) => void;
  siteLanguages: string;
  isTextarea?: boolean;
}) {
  const [langs, setLangs] = useState<{ code: string; name: string }[]>([{ code: "en", name: "English" }]);

  useEffect(() => {
    try {
      if (siteLanguages) {
        const parsed = JSON.parse(siteLanguages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLangs(parsed);
        }
      }
    } catch (e) {
      // fallback
    }
  }, [siteLanguages]);

  const parsedValue = (val: string | undefined) => {
    if (!val) return {};
    try {
      const p = JSON.parse(val);
      if (typeof p === "object" && p !== null) return p;
    } catch (e) {
      // If it's legacy flat text, treat it as the first language's text
      return { [langs[0]?.code || "en"]: val };
    }
    return {};
  };

  const values = parsedValue(value);

  const updateValue = (langCode: string, newVal: string) => {
    const next = { ...values, [langCode]: newVal };
    onChange(JSON.stringify(next));
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      {langs.length > 1 ? (
        <div className="space-y-2 border-l-2 border-border pl-4">
          {langs.map((l) => (
            <div key={l.code}>
              <Label className="text-xs text-muted-text mb-1 block">{l.name} ({l.code})</Label>
              {isTextarea ? (
                <Textarea
                  rows={4}
                  value={values[l.code] || ""}
                  onChange={(e) => updateValue(l.code, e.target.value)}
                />
              ) : (
                <Input
                  value={values[l.code] || ""}
                  onChange={(e) => updateValue(l.code, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        isTextarea ? (
          <Textarea
            rows={4}
            value={values[langs[0]?.code || "en"] || ""}
            onChange={(e) => updateValue(langs[0]?.code || "en", e.target.value)}
          />
        ) : (
          <Input
            value={values[langs[0]?.code || "en"] || ""}
            onChange={(e) => updateValue(langs[0]?.code || "en", e.target.value)}
          />
        )
      )}
    </div>
  );
}
