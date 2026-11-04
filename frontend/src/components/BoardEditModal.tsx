import { useState, type FormEvent } from "react";
import type { Board } from "../services/boardService";

export interface BoardEditData {
  name: string;
  description: string | null;
}

interface BoardEditModalProps {
  board: Board;
  saving: boolean;
  error: string;
  // Resolve true quando a API confirma; o modal então é fechado pelo pai.
  onSave: (data: BoardEditData) => Promise<boolean>;
  onCancel: () => void;
}

const NAME_MAX = 255;
const DESCRIPTION_MAX = 1000;

// Validação no frontend para feedback imediato; o backend valida novamente.
function validate(name: string, description: string): string {
  if (!name) return "Informe o nome do quadro.";
  if (name.length > NAME_MAX) {
    return `O nome deve ter no máximo ${NAME_MAX} caracteres.`;
  }
  if (description.length > DESCRIPTION_MAX) {
    return `A descrição deve ter no máximo ${DESCRIPTION_MAX} caracteres.`;
  }
  return "";
}

export default function BoardEditModal({
  board,
  saving,
  error,
  onSave,
  onCancel,
}: BoardEditModalProps) {
  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description ?? "");
  const [validationError, setValidationError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const message = validate(trimmedName, trimmedDescription);

    setValidationError(message);

    if (message) return;

    await onSave({
      name: trimmedName,
      description: trimmedDescription || null,
    });
  }

  const visibleError = validationError || error;

  return (
    <div
      className="modal-overlay"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !saving) onCancel();
      }}
    >
      <form
        className="move-modal edit-modal"
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-labelledby="board-edit-title"
      >
        <h2 id="board-edit-title">Editar quadro</h2>

        <label>
          Nome do quadro
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setValidationError("");
            }}
            maxLength={NAME_MAX}
            required
            autoFocus
          />
        </label>

        <label>
          Descrição
          <textarea
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              setValidationError("");
            }}
            maxLength={DESCRIPTION_MAX}
            rows={4}
          />
        </label>

        {visibleError && (
          <p className="auth-error" role="alert">
            {visibleError}
          </p>
        )}

        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
            disabled={saving}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
