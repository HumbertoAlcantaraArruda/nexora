import { useState, type CSSProperties, type FormEvent } from "react";
import { COLUMN_PRESET_COLORS, isPresetColor } from "../columnColors";
import Icon from "./Icon";
import Modal from "./Modal";

export interface ColumnFormData {
  name: string;
  color: string;
}

interface ColumnFormModalProps {
  // Sem nome inicial: criação; com nome: edição.
  initialName?: string;
  // Cor já selecionada ao abrir (a da coluna, ou a sugerida na criação).
  initialColor: string;
  saving: boolean;
  error: string;
  // Resolve true quando a API confirma; o pai então fecha o modal.
  onSave: (data: ColumnFormData) => Promise<boolean>;
  onCancel: () => void;
}

const NAME_MAX = 255;

export default function ColumnFormModal({
  initialName,
  initialColor,
  saving,
  error,
  onSave,
  onCancel,
}: ColumnFormModalProps) {
  const isEditing = initialName !== undefined;
  const [name, setName] = useState(initialName ?? "");
  const [color, setColor] = useState(initialColor.toLowerCase());
  const [validationError, setValidationError] = useState("");

  const customSelected = !isPresetColor(color);

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

    if (
      isEditing &&
      trimmed === initialName &&
      color === initialColor.toLowerCase()
    ) {
      onCancel();
      return;
    }

    await onSave({ name: trimmed, color });
  }

  const visibleError = validationError || error;

  return (
    <Modal
      title={isEditing ? "Editar coluna" : "Nova coluna"}
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
          <span className="column-name-input">
            <span
              className="column-dot"
              style={{ background: color }}
              aria-hidden="true"
            />
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
          </span>
        </label>

        <fieldset className="form-field color-field">
          <legend>Cor do ícone</legend>

          <div className="color-options">
            {COLUMN_PRESET_COLORS.map((preset) => (
              <label
                key={preset.value}
                className="color-swatch"
                style={{ "--swatch": preset.value } as CSSProperties}
                title={preset.label}
              >
                <input
                  type="radio"
                  name="column-color"
                  value={preset.value}
                  checked={color === preset.value}
                  onChange={() => setColor(preset.value)}
                  aria-label={preset.label}
                />
                <Icon name="check" size={16} />
              </label>
            ))}

            {/* Paleta livre: abre o seletor de cores do navegador. */}
            <label
              className={`color-swatch color-swatch-custom${customSelected ? " color-swatch-custom-active" : ""}`}
              style={{ "--swatch": color } as CSSProperties}
              title="Escolher outra cor"
            >
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value.toLowerCase())}
                aria-label="Escolher outra cor"
              />
              <Icon name={customSelected ? "check" : "plus"} size={16} />
            </label>
          </div>
        </fieldset>

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
