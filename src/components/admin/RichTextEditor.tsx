import { useEffect, useRef } from "react";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Eraser, Italic, Link, List, ListOrdered, Minus, Quote, Redo2, Strikethrough, Subscript, Superscript, Underline, Undo2, Unlink } from "lucide-react";

export function RichTextEditor({ value, onChange, fullHeight = false }: { value: string; onChange: (html: string) => void; fullHeight?: boolean }) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value || "<p><br></p>";
  }, [value]);

  const run = (command: string, argument?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, argument);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const addLink = () => {
    const url = window.prompt("Link URL (https://, mailto:, tel: or #anchor)");
    if (url) run("createLink", url);
  };

  const tools = [
    [Bold, "Bold", "bold"], [Italic, "Italic", "italic"], [Underline, "Underline", "underline"], [Strikethrough, "Strikethrough", "strikeThrough"],
    [List, "Bulleted list", "insertUnorderedList"], [ListOrdered, "Numbered list", "insertOrderedList"], [Quote, "Blockquote", "formatBlock", "blockquote"],
    [AlignLeft, "Align left", "justifyLeft"], [AlignCenter, "Align center", "justifyCenter"], [AlignRight, "Align right", "justifyRight"], [AlignJustify, "Justify", "justifyFull"],
    [Subscript, "Subscript", "subscript"], [Superscript, "Superscript", "superscript"], [Minus, "Horizontal rule", "insertHorizontalRule"],
    [Undo2, "Undo", "undo"], [Redo2, "Redo", "redo"], [Eraser, "Clear formatting", "removeFormat"]
  ] as const;

  return (
    <div className={`rounded-2xl border border-border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary/60 ${fullHeight ? "h-full min-h-0 flex flex-col" : ""}`}>
      <div className="flex flex-wrap items-center gap-1 p-2.5 border-b border-border bg-surface shrink-0">
        <select aria-label="Text style" className="h-8 px-2 rounded-lg border border-border bg-background text-text text-xs" defaultValue="p" onChange={(e) => run("formatBlock", e.target.value)}>
          <option value="p">Paragraph</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option><option value="h4">Heading 4</option><option value="pre">Code / preformatted</option>
        </select>
        {tools.map(([Icon, label, command, argument]) => (
          <button key={label} type="button" title={label} aria-label={label} onMouseDown={(e) => e.preventDefault()} onClick={() => run(command, argument)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-text hover:text-primary hover:bg-primary/10">
            <Icon className="w-4 h-4" />
          </button>
        ))}
        <button type="button" title="Insert link" aria-label="Insert link" onMouseDown={(e) => e.preventDefault()} onClick={addLink} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-text hover:text-primary hover:bg-primary/10"><Link className="w-4 h-4" /></button>
        <button type="button" title="Remove link" aria-label="Remove link" onMouseDown={(e) => e.preventDefault()} onClick={() => run("unlink")} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-text hover:text-primary hover:bg-primary/10"><Unlink className="w-4 h-4" /></button>
        <label title="Text color" className="h-8 px-2 rounded-lg border border-border flex items-center gap-1.5 text-[11px] text-muted-text cursor-pointer">A <input type="color" className="w-5 h-5 p-0 border-0 bg-transparent" onChange={(e) => run("foreColor", e.target.value)} /></label>
        <label title="Highlight color" className="h-8 px-2 rounded-lg border border-border flex items-center gap-1.5 text-[11px] text-muted-text cursor-pointer">Highlight <input type="color" className="w-5 h-5 p-0 border-0 bg-transparent" defaultValue="#fff3a3" onChange={(e) => run("hiliteColor", e.target.value)} /></label>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className={`legal-document-content overflow-y-auto p-6 sm:p-8 lg:px-[max(3rem,calc((100vw-1100px)/2))] bg-surface text-text focus:outline-none ${fullHeight ? "flex-1 min-h-0" : "min-h-[420px] max-h-[58vh]"}`}
      />
    </div>
  );
}
