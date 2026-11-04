// Logo do app: três barras (colunas de um kanban) + nome.

interface LogoProps {
  // Só o símbolo, sem o texto (ex.: barra superior no celular).
  compact?: boolean;
}

export default function Logo({ compact = false }: LogoProps) {
  return (
    <span className="logo">
      <svg
        className="logo-mark"
        viewBox="0 0 24 25"
        width="24"
        height="25"
        aria-hidden="true"
      >
        <rect width="6" height="25" rx="2" fill="currentColor" />
        <rect x="9" width="6" height="25" rx="2" fill="currentColor" opacity="0.75" />
        <rect x="18" width="6" height="25" rx="2" fill="currentColor" opacity="0.5" />
      </svg>
      {!compact && <span className="logo-text">kanban</span>}
    </span>
  );
}
