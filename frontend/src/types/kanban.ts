
export interface Task {
  id: number;
  board_column_id: number;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  position: number;
}

export interface KanbanColumn {
  id: number;
  board_id: number;
  name: string;
  position: number;
  tasks: Task[];
}

// Estado do arraste em andamento, compartilhado entre as colunas para exibir
// o feedback visual (tarefa arrastada, coluna de destino e ponto de inserção).
export interface TaskDragState {
  taskId: number;
  sourceColumnId: number;
  overColumnId: number | null;
  insertIndex: number | null;
}

export interface KanbanBoard {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  columns?: KanbanColumn[];
}

export interface ApiResponse<T> {
  mensagem: string;
  [key: string]: T | string;
}
