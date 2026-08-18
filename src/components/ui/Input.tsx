import { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "aero-ui-input block w-full px-4 py-2 border border-border bg-surface text-text rounded-lg focus:border-primary outline-none sm:text-sm",
        className
      )}
      {...props}
    />
  );
}
