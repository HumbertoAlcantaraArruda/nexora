import logoMark from "../assets/nexora-logo.png";

// Logo do app: o raio da Nexora + nome.

const APP_NAME = "Nexora";

interface LogoProps {
  // Só o símbolo, sem o texto.
  compact?: boolean;
}

export default function Logo({ compact = false }: LogoProps) {
  return (
    <span className="logo">
      <img
        className="logo-mark"
        src={logoMark}
        width="22"
        height="30"
        alt={compact ? APP_NAME : ""}
      />
      {!compact && <span className="logo-text">{APP_NAME}</span>}
    </span>
  );
}
