import { useState } from "react";
import { applyTheme, getInitialTheme, type Theme } from "../theme";
import Icon from "./Icon";

// Chave de tema no rodapé da barra lateral: sol — [chave] — lua.
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const isDark = theme === "dark";

  function handleToggle() {
    const next: Theme = isDark ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  return (
    <div className="theme-switch">
      <Icon name="sun" size={16} />

      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label="Tema escuro"
        title={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
        className="theme-switch-track"
        onClick={handleToggle}
      >
        <span className="theme-switch-thumb" />
      </button>

      <Icon name="moon" size={16} />
    </div>
  );
}
