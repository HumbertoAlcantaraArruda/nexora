import { useState } from "react";
import { applyTheme, getInitialTheme, type Theme } from "../theme";
import Icon from "./Icon";

// Item de tema da barra lateral: ícone + "Tema escuro" + chave.
// Com a barra recolhida, sobra só o ícone (que continua alternando o tema).
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const isDark = theme === "dark";

  function handleToggle() {
    const next: Theme = isDark ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      className="sidebar-item"
      title={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      onClick={handleToggle}
    >
      <span className="sidebar-item-icon">
        <Icon name={isDark ? "moon" : "sun"} size={18} />
      </span>
      <span className="sidebar-item-label">Tema escuro</span>
      <span className="theme-switch-track" aria-hidden="true">
        <span className="theme-switch-thumb" />
      </span>
    </button>
  );
}
