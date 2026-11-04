import { useState, type FormEvent } from "react";
import type { Board } from "../services/boardService";
import Modal from "./Modal";

export interface BoardFormData {
  name: string;
  description: string | null;
}

interface BoardFormModalProps {
  // Sem quadro: criação; com quadro: edição (campos preenchidos).
  board?: Board;
  saving: boolean;
  error: string;
  // Resolve true quando a API confirma; o pai então fecha o modal.
  onSave: (data: BoardFormData) => Promise<boolean>;
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

export default function BoardFormModal({
  board,
  saving,
  error,
  onSave,
  onCancel,
}: BoardFormModalProps) {
  const [name, setName] = useState(board?.name ?? "");
  const [description, setDescription] = useState(board?.description ?? "");
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
    <Modal
      title={board ? "Editar quadro" : "Novo quadro"}
      onClose={onCancel}
      closeDisabled={saving}
    >
      <form
        className="modal-form"
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
      >
        <label className="form-field">
          Nome do quadro
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setValidationError("");
            }}
            placeholder="Ex.: Lançamento da plataforma"
            maxLength={NAME_MAX}
            required
            autoFocus
          />
        </label>

        <label className="form-field">
          Descrição
          <textarea
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              setValidationError("");
            }}
            placeholder="Opcional"
            maxLength={DESCRIPTION_MAX}
            rows={3}
          />
        </label>

        {visibleError && (
          <p className="form-error" role="alert">
            {visibleError}
          </p>
        )}

        <button type="submit" className="button button-primary" disabled={saving}>
          {saving
            ? "Salvando..."
            : board
              ? "Salvar alterações"
              : "Criar quadro"}
        </button>
      </form>
    </Modal>
  );
}
