import { useEffect, useId, type ReactNode } from "react";
import Icon from "./Icon";

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  // Impede fechar (Esc, clique fora, X) enquanto algo está sendo salvo.
  closeDisabled?: boolean;
  // Elemento do topo à direita do título (ex.: menu de ações).
  headerAction?: ReactNode;
}

// Base dos modais do app: overlay, painel, título, botão fechar,
// Esc e clique fora para fechar.
export default function Modal({
  title,
  children,
  onClose,
  closeDisabled = false,
  headerAction,
}: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !closeDisabled) onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, closeDisabled]);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        // Fecha só quando o clique começa no fundo (não ao arrastar
        // uma seleção de texto de dentro do painel para fora).
        if (event.target === event.currentTarget && !closeDisabled) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="modal-header">
          <h2 id={titleId}>{title}</h2>

          <div className="modal-header-actions">
            {headerAction}
            <button
              type="button"
              className="icon-button"
              onClick={onClose}
              disabled={closeDisabled}
              title="Fechar"
              aria-label="Fechar"
            >
              <Icon name="x" size={20} />
            </button>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
