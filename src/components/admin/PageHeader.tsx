import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, subtitle, action, children, className }: PageHeaderProps) {
  const desc = description || subtitle;
  const actionContent = action || children;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 ${className || ""}`}>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text break-words">{title}</h1>
        {desc && <p className="text-sm sm:text-base text-muted-text mt-1 max-w-3xl leading-relaxed">{desc}</p>}
      </div>
      {actionContent && <div className="flex items-center gap-2.5 flex-wrap shrink-0">{actionContent}</div>}
    </div>
  );
}
