import type { DragEvent } from "react";

// Tipo usado no dataTransfer ao arrastar colunas. Tarefas usam "text/plain";
// assim cada área de soltura reconhece (e ignora) o arraste que não é seu.
export const COLUMN_DRAG_TYPE = "application/x-kanban-column";

export function isColumnDrag(event: DragEvent): boolean {
  return event.dataTransfer.types.includes(COLUMN_DRAG_TYPE);
}
