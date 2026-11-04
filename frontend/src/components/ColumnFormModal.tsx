import { useState, type FormEvent } from "react";
import Modal from "./Modal";

interface ColumnFormModalProps {
  // Sem nome inicial: criação; com nome: renomear.
  initialName?: string;
  saving: boolean;
  error: string;
  // Resolve true quando a API confirma; o pai então fecha o modal.
  onSave: (name: string) => Promise<boolean>;
  onCancel: () => void;
}

const NAME_MAX = 255;

export default function ColumnFormModal({
  initialName,
  saving,
  error,
  onSave,
  onCancel,
}: ColumnFormModalProps) {
  const isEditing = initialName !== undefined;
  const [name, setName] = useState(initialName ?? "");
  const [validationError, setValidationError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = name.trim();

    // Validação no frontend para feedback imediato; o backend valida novamente.
    if (!trimmed) {
      setValidationError("Informe o nome da coluna.");
      return;
    }

    if (trimmed.length > NAME_MAX) {
      setValidationError(`O nome deve ter no máximo ${NAME_MAX} caracteres.`);
      return;
    }

    if (isEditing && trimmed === initialName) {
      onCancel();
      return;
    }

    await onSave(trimmed);
  }

  const visibleError = validationError || error;

  return (
    <Modal
      title={isEditing ? "Renomear coluna" : "Nova coluna"}
      onClose={onCancel}
      closeDisabled={saving}
    >
      <form
        className="modal-form"
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
      >
        <label className="form-field">
          Nome da coluna
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setValidationError("");
            }}
            placeholder="Ex.: Em andamento"
            maxLength={NAME_MAX}
            required
            autoFocus
          />
        </label>

        {visibleError && (
          <p className="form-error" role="alert">
            {visibleError}
          </p>
        )}

        <button type="submit" className="button button-primary" disabled={saving}>
          {saving ? "Salvando..." : isEditing ? "Salvar" : "Criar coluna"}
        </button>
      </form>
    </Modal>
  );
}
