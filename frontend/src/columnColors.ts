// Cores do ícone ao lado do nome da coluna.

export const COLUMN_PRESET_COLORS = [
  { value: "#49c4e5", label: "Azul" },
  { value: "#8471f2", label: "Roxo" },
  { value: "#67e2ae", label: "Verde" },
  { value: "#e5a449", label: "Laranja" },
  { value: "#ea5555", label: "Vermelho" },
] as const;

// Cor sugerida para a coluna na posição informada (alterna entre as padrão).
export function defaultColumnColor(position: number): string {
  return COLUMN_PRESET_COLORS[position % COLUMN_PRESET_COLORS.length].value;
}

// Cor exibida: a escolhida pelo usuário ou, em colunas sem cor salva, a
// padrão pela posição.
export function columnColor(
  column: { color?: string | null },
  position: number,
): string {
  return column.color ?? defaultColumnColor(position);
}

export function isPresetColor(color: string): boolean {
  return COLUMN_PRESET_COLORS.some(
    (preset) => preset.value === color.toLowerCase(),
  );
}
