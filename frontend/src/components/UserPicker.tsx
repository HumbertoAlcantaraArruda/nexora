import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import {
  searchUsers,
  USER_SEARCH_MIN,
  type PlatformUser,
} from "../services/userService";
import Avatar from "./Avatar";
import Icon from "./Icon";

interface UserPickerProps {
  // Usuário escolhido (null = nenhum).
  value: PlatformUser | null;
  onChange: (user: PlatformUser | null) => void;
  placeholder?: string;
  // Texto exibido quando o campo está travado e não há ninguém escolhido.
  emptyText?: string;
  disabled?: boolean;
  // Usuários que não devem aparecer nos resultados (ex.: quem já tem acesso).
  excludeIds?: number[];
  invalid?: boolean;
  labelId?: string;
}

const SEARCH_DELAY_MS = 250;

// Campo para escolher um usuário da plataforma digitando o nome. A busca só
// vai ao servidor a partir de 2 letras; nada é carregado antes disso.
// Mostra foto, nome e e-mail e funciona pelo teclado (setas, Enter, Esc).
export default function UserPicker({
  value,
  onChange,
  placeholder = "Digite o nome",
  emptyText = "Ninguém escolhido",
  disabled = false,
  excludeIds = [],
  invalid = false,
  labelId,
}: UserPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const term = query.trim();
  const canSearch = term.length >= USER_SEARCH_MIN;
  const options = results.filter((user) => !excludeIds.includes(user.id));

  // Busca com atraso curto enquanto a pessoa digita; respostas antigas são
  // descartadas (AbortController).
  useEffect(() => {
    if (!canSearch) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setFailed(false);

      searchUsers(term, controller.signal)
        .then((users) => {
          setResults(users);
          setActiveIndex(0);
        })
        .catch(() => {
          if (!controller.signal.aborted) setFailed(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, SEARCH_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [term, canSearch]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function choose(user: PlatformUser) {
    onChange(user);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function clear() {
    onChange(null);
    // Volta o foco para o campo de busca que reaparece.
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && open) {
      // Fecha só a lista, sem fechar o modal em volta.
      event.stopPropagation();
      setOpen(false);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(options.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter" && open && options[activeIndex]) {
      event.preventDefault();
      choose(options[activeIndex]);
    }
  }

  if (value) {
    return (
      <div className={`user-picker-selected${disabled ? " user-picker-disabled" : ""}`}>
        <Avatar user={value} size={28} />
        <span className="user-select-text">
          <span className="user-select-name">{value.name}</span>
          <span className="user-select-email">{value.email}</span>
        </span>
        {!disabled && (
          <button
            type="button"
            className="icon-button"
            onClick={clear}
            title="Remover"
            aria-label={`Remover ${value.name}`}
          >
            <Icon name="x" size={16} />
          </button>
        )}
      </div>
    );
  }

  if (disabled) {
    return (
      <div className="user-picker-selected user-picker-disabled">
        <span className="user-select-placeholder">{emptyText}</span>
      </div>
    );
  }

  const showList = open && term.length > 0;

  return (
    <div className="user-picker" ref={rootRef}>
      <input
        ref={inputRef}
        className="user-picker-input"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          if (event.target.value.trim().length < USER_SEARCH_MIN) {
            setResults([]);
            setLoading(false);
          }
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          showList && options[activeIndex] ? `${listId}-${activeIndex}` : undefined
        }
        aria-labelledby={labelId}
        aria-invalid={invalid ? true : undefined}
        autoComplete="off"
      />

      {showList && (
        <ul className="user-select-popover user-select-list" role="listbox" id={listId}>
          {!canSearch ? (
            <li className="user-select-status">
              Digite pelo menos {USER_SEARCH_MIN} letras.
            </li>
          ) : loading && options.length === 0 ? (
            <li className="user-select-status">Buscando...</li>
          ) : failed ? (
            <li className="user-select-status">
              Não foi possível buscar. Tente de novo.
            </li>
          ) : options.length === 0 ? (
            <li className="user-select-status">Nenhum usuário encontrado.</li>
          ) : (
            options.map((user, index) => (
              <li
                key={user.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={`user-select-option${index === activeIndex ? " user-select-option-active" : ""}`}
                onPointerEnter={() => setActiveIndex(index)}
                // pointerdown evita perder o foco do campo antes do clique.
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(user)}
              >
                <Avatar user={user} size={30} />
                <span className="user-select-text">
                  <span className="user-select-name">{user.name}</span>
                  <span className="user-select-email">{user.email}</span>
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
