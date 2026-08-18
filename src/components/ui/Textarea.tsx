import { TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "aero-ui-input block w-full px-4 py-2 border border-border bg-surface text-text rounded-lg focus:border-primary outline-none sm:text-sm resize-y",
        className
      )}
      {...props}
    />
  );
}
