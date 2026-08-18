import { useState, KeyboardEvent, ClipboardEvent } from "react";
import { Tag, X, Plus, AlertCircle, Trash2 } from "lucide-react";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";

interface KeywordTagInputProps {
  keywords: string; // Comma separated string or empty
  onChange: (keywords: string) => void;
  label?: string;
  description?: string;
  placeholder?: string;
  maxKeywords?: number;
  maxKeywordLength?: number;
  className?: string;
}

export function KeywordTagInput({
  keywords = "",
  onChange,
  label = "SEO Keywords",
  description = "Press Enter or comma to add a keyword tag. Paste comma-separated keywords to add multiple.",
  placeholder = "Add keyword...",
  maxKeywords = 30,
  maxKeywordLength = 50,
  className = ""
}: KeywordTagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Helper to parse comma-separated keywords into clean array
  const parseTags = (str: string): string[] => {
    if (!str) return [];
    return str
      .split(",")
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  };

  const currentTags = parseTags(keywords);

  const updateTags = (newTags: string[]) => {
    // Deduplicate case-insensitively while preserving original casing
    const uniqueTags: string[] = [];
    const seen = new Set<string>();

    for (const tag of newTags) {
      const lower = tag.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        uniqueTags.push(tag);
      }
    }

    const limitedTags = uniqueTags.slice(0, maxKeywords);
    onChange(limitedTags.join(", "));
  };

  const addTag = (text: string) => {
    setError(null);
    const trimmed = text.trim();
    if (!trimmed) return;

    if (trimmed.length > maxKeywordLength) {
      setError(`Keyword exceeds maximum length of ${maxKeywordLength} characters.`);
      return;
    }

    const lower = trimmed.toLowerCase();
    if (currentTags.some(t => t.toLowerCase() === lower)) {
      setError(`"${trimmed}" is already added.`);
      return;
    }

    if (currentTags.length >= maxKeywords) {
      setError(`Maximum limit of ${maxKeywords} keywords reached.`);
      return;
    }

    updateTags([...currentTags, trimmed]);
    setInputValue("");
  };

  const removeTag = (indexToRemove: number) => {
    setError(null);
    updateTags(currentTags.filter((_, idx) => idx !== indexToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && inputValue === "" && currentTags.length > 0) {
      removeTag(currentTags.length - 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const pastedTags = pastedText
      .split(/,|\n/)
      .map(t => t.trim())
      .filter(t => t.length > 0 && t.length <= maxKeywordLength);

    if (pastedTags.length > 0) {
      updateTags([...currentTags, ...pastedTags]);
      setInputValue("");
    }
  };

  const clearAll = () => {
    setError(null);
    onChange("");
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex justify-between items-center">
        {label && (
          <Label className="flex items-center gap-1.5 font-medium text-text">
            <Tag size={15} className="text-primary" />
            {label}
          </Label>
        )}
        <span className="text-xs text-muted-text font-mono">
          {currentTags.length} / {maxKeywords} keywords
        </span>
      </div>

      {description && (
        <p className="text-xs text-muted-text">{description}</p>
      )}

      <div className="p-2.5 bg-surface border border-border rounded-xl focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all space-y-2">
        {/* Render tags */}
        <div className="flex flex-wrap gap-2 items-center min-h-[32px]">
          {currentTags.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-full text-xs font-medium transition-colors"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="hover:bg-primary/30 rounded-full p-0.5 text-primary/70 hover:text-primary transition-colors focus:outline-none"
                title="Remove keyword"
              >
                <X size={12} />
              </button>
            </span>
          ))}

          <div className="flex-1 min-w-[140px] flex items-center gap-2">
            <Input
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={currentTags.length >= maxKeywords ? "Max keywords reached" : placeholder}
              disabled={currentTags.length >= maxKeywords}
              className="h-8 text-xs border-0 bg-transparent focus-visible:ring-0 px-2 py-1 shadow-none text-text placeholder:text-muted-text/70"
            />
            {inputValue.trim() && (
              <button
                type="button"
                onClick={() => addTag(inputValue)}
                className="p-1 text-primary hover:bg-primary/10 rounded-md transition-colors"
                title="Add tag"
              >
                <Plus size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-500 font-medium pt-0.5">
          <AlertCircle size={13} />
          <span>{error}</span>
        </div>
      )}

      {currentTags.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-muted-text hover:text-red-500 flex items-center gap-1 transition-colors"
          >
            <Trash2 size={12} /> Clear all keywords
          </button>
        </div>
      )}
    </div>
  );
}
