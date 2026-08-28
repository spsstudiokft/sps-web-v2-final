import { cn } from "../../lib/utils";

interface ButtonProps {
  /**
   * React's HTML button definitions are not installed in this workspace.
   * Preserve every native button attribute used throughout the app while
   * explicitly typing the component-specific presentation options.
   */
  [attribute: string]: any;
  children?: any;
  className?: string;
  disabled?: boolean;
  onClick?: (...args: any[]) => void;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function Button({ className, variant = "primary", size = "default", ...props }: ButtonProps) {
  const variants = {
    primary: "bg-primary text-background hover:opacity-90 disabled:opacity-70",
    secondary: "bg-background text-text border border-border hover:bg-surface",
    outline: "bg-transparent text-text border border-border hover:bg-surface",
    danger: "text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium",
    ghost: "text-primary hover:opacity-80 font-medium",
  };
  
  const sizes = {
    default: "px-4 py-2 text-sm",
    sm: "px-3 py-1.5 text-xs",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={cn(
        "aero-ui-button inline-flex items-center justify-center font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
