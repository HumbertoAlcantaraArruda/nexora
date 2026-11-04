import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { PlatformUser } from "../services/userService";
import Avatar from "./Avatar";
import Icon from "./Icon";

interface UserSelectProps {
  users: PlatformUser[];
  // Id do usuário escolhido; null = nenhum.
  value: number | null;
  // Usuário atual do campo, para exibi-lo mesmo antes de a lista carregar.
  selectedUser?: PlatformUser | null;
  onChange: (userId: number | null) => void;
  loading?: boolean;
  disabled?: boolean;
  emptyLabel?: string;
  labelId?: string;
}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Select de usuários com foto, nome e e-mail (o <select> nativo não mostra
// imagens). Tem busca e funciona pelo teclado: setas, Enter e Esc.
export default function UserSelect({
  users,
  value,
  selectedUser,
  onChange,
  loading = false,
  disabled = false,
  emptyLabel = "Sem responsável",
  labelId,
}: UserSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selected =
    users.find((user) => user.id === value) ??
    (selectedUser && selectedUser.id === value ? selectedUser : null);

  // Primeira opção é sempre "sem responsável"; depois os usuários filtrados.
  const options = useMemo(() => {
    const term = normalize(query.trim());
    const matches = term
      ? users.filter(
          (user) =>
            normalize(user.name).includes(term) ||
            normalize(user.email).includes(term),
        )
      : users;

    return [null, ...matches];
  }, [users, query]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  // Mantém a opção ativa visível ao navegar com as setas.
  useEffect(() => {
    if (!open) return;

    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function openList() {
    if (disabled) return;

    const selectedIndex = options.findIndex(
      (option) => (option?.id ?? null) === value,
    );

    setQuery("");
    setActiveIndex(Math.max(0, selectedIndex));
    setOpen(true);
  }

  function choose(option: PlatformUser | null) {
    onChange(option?.id ?? null);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      // Fecha só a lista, sem fechar o modal em volta.
      event.stopPropagation();
      setOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(options.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (options[activeIndex] !== undefined) choose(options[activeIndex]);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div className="user-select" ref={rootRef}>
      <button
        type="button"
        className="user-select-trigger"
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            openList();
          }
        }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={labelId}
      >
        {selected ? (
          <>
            <Avatar user={selected} size={26} />
            <span className="user-select-text">
              <span className="user-select-name">{selected.name}</span>
              <span className="user-select-email">{selected.email}</span>
            </span>
          </>
        ) : (
          <span className="user-select-placeholder">{emptyLabel}</span>
        )}
        {!disabled && <Icon name="chevron-down" size={16} />}
      </button>

      {open && (
        <div className="user-select-popover" onKeyDown={handleKeyDown}>
          <input
            className="user-select-search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            placeholder="Buscar por nome ou e-mail"
            aria-label="Buscar usuário"
            aria-controls={listId}
            aria-activedescendant={`${listId}-${activeIndex}`}
            autoFocus
          />

          <ul className="user-select-list" role="listbox" id={listId} ref={listRef}>
            {options.map((option, index) => {
              const isSelected = (option?.id ?? null) === value;

              return (
                <li
                  key={option?.id ?? "none"}
                  id={`${listId}-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  className={[
                    "user-select-option",
                    index === activeIndex && "user-select-option-active",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onPointerEnter={() => setActiveIndex(index)}
                  onClick={() => choose(option)}
                >
                  {option ? (
                    <>
                      <Avatar user={option} size={30} />
                      <span className="user-select-text">
                        <span className="user-select-name">{option.name}</span>
                        <span className="user-select-email">{option.email}</span>
                      </span>
                    </>
                  ) : (
                    <span className="user-select-none">{emptyLabel}</span>
                  )}
                  {isSelected && <Icon name="check" size={16} />}
                </li>
              );
            })}

            {loading && <li className="user-select-status">Carregando usuários...</li>}
            {!loading && options.length === 1 && query.trim() && (
              <li className="user-select-status">Nenhum usuário encontrado.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
