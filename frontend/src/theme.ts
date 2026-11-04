export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

// O tema inicial já é aplicado em <html data-theme> por um script inline no
// index.html (evita piscar o tema errado); aqui apenas lemos esse valor.
export function getInitialTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Sem acesso ao armazenamento: o tema vale só para esta sessão.
  }
}
