import type { ReactNode } from "react";

export function PageHeader({
  children,
  description,
  title,
}: {
  children?: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <div className="grid gap-1">
      {children ? (
        <div className="flex items-center gap-2">
          <h2 className="text-2xl leading-tight font-semibold">{title}</h2>
          {children}
        </div>
      ) : (
        <h2 className="text-2xl leading-tight font-semibold">{title}</h2>
      )}
      {description ? (
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
