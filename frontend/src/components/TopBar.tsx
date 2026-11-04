import type { ReactNode } from "react";
import Logo from "./Logo";

interface TopBarProps {
  title: string;
  subtitle?: string | null;
  sidebarHidden: boolean;
  onShowSidebar: () => void;
  actions?: ReactNode;
}

// Barra superior da área principal: título da tela e ações.
// Com a barra lateral oculta, mostra o logo (que a reabre).
export default function TopBar({
  title,
  subtitle,
  sidebarHidden,
  onShowSidebar,
  actions,
}: TopBarProps) {
  return (
    <header className="topbar">
      {sidebarHidden && (
        <button
          type="button"
          className="topbar-logo"
          onClick={onShowSidebar}
          title="Mostrar barra lateral"
          aria-label="Mostrar barra lateral"
        >
          <Logo />
        </button>
      )}

      <div className="topbar-title">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>

      {actions && <div className="topbar-actions">{actions}</div>}
    </header>
  );
}
