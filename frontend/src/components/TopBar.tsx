import type { ReactNode } from "react";

interface TopBarProps {
  title: string;
  subtitle?: string | null;
  actions?: ReactNode;
}

// Barra superior da área principal: título da tela e ações.
export default function TopBar({ title, subtitle, actions }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>

      {actions && <div className="topbar-actions">{actions}</div>}
    </header>
  );
}
