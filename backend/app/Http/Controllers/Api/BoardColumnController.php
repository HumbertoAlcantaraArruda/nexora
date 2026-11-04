<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\AuthorizesBoardAccess;
use App\Http\Controllers\Controller;
use App\Models\Board;
use App\Models\BoardColumn;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BoardColumnController extends Controller
{
    use AuthorizesBoardAccess;

    /**
     * Cor do ícone da coluna: hexadecimal de 6 dígitos (#rrggbb). Nula usa a
     * cor padrão pela posição.
     */
    private const COLOR_RULES = ['sometimes', 'nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'];

    private const COLOR_MESSAGES = ['color.regex' => 'A cor deve estar no formato #rrggbb.'];

    /**
     * Lista as colunas dos quadros que o usuário acessa.
     */
    public function index(Request $request): JsonResponse
    {
        $columns = BoardColumn::query()
            ->whereHas('board', function ($query) use ($request) {
                $query->accessibleBy($request->user());
            })
            ->with('tasks')
            ->orderBy('position')
            ->get();

        return response()->json([
            'mensagem' => 'ok',
            'colunas' => $columns,
        ]);
    }

    /**
     * Cria uma coluna em um quadro do usuário autenticado.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'board_id' => ['required', 'integer', 'exists:boards,id'],
            'name' => ['required', 'string', 'max:255'],
            'position' => ['sometimes', 'integer', 'min:0'],
            'color' => self::COLOR_RULES,
        ], self::COLOR_MESSAGES);

        $board = Board::query()
            ->accessibleBy($request->user())
            ->findOrFail($validated['board_id']);

        $this->ensureCanEdit($board, $request->user());

        $column = $board->columns()->create([
            'name' => $validated['name'],
            'position' => $validated['position'] ?? 0,
            'color' => $this->normalizeColor($validated['color'] ?? null),
        ]);

        return response()->json([
            'mensagem' => 'ok',
            'coluna' => $column,
        ], 201);
    }

    /**
     * Consulta uma coluna pertencente ao usuário autenticado.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $column = $this->findUserColumn($request, $id)
            ->with('tasks')
            ->firstOrFail();

        return response()->json([
            'mensagem' => 'ok',
            'coluna' => $column,
        ]);
    }

    /**
     * Atualiza uma coluna.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $column = $this->findUserColumn($request, $id)
            ->with('board')
            ->firstOrFail();

        $this->ensureCanEdit($column->board, $request->user());

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'position' => ['sometimes', 'integer', 'min:0'],
            'color' => self::COLOR_RULES,
        ], self::COLOR_MESSAGES);

        if (array_key_exists('color', $validated)) {
            $validated['color'] = $this->normalizeColor($validated['color']);
        }

        $column->update($validated);

        return response()->json([
            'mensagem' => 'ok',
            'coluna' => $column->refresh(),
        ]);
    }

    /**
     * Atualiza em lote a ordem das colunas de um quadro.
     *
     * A lista deve conter, na nova ordem, todas as colunas do quadro. As
     * posições são regravadas sequencialmente a partir de zero dentro de uma
     * transação: ou tudo é salvo, ou nada é alterado.
     */
    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'board_id' => ['required', 'integer'],
            'column_ids' => ['required', 'array', 'min:1'],
            'column_ids.*' => ['required', 'integer', 'distinct'],
        ]);

        $board = Board::query()
            ->accessibleBy($request->user())
            ->findOrFail($validated['board_id']);

        $this->ensureCanEdit($board, $request->user());

        $submittedIds = array_map('intval', $validated['column_ids']);

        $columns = DB::transaction(function () use ($board, $submittedIds) {
            $columns = $board->columns()
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            // A lista precisa ser exatamente o conjunto de colunas do quadro:
            // sem faltar nenhuma (posições inconsistentes) e sem colunas alheias.
            $currentIds = $columns->keys()->all();
            sort($currentIds);

            $sortedSubmitted = $submittedIds;
            sort($sortedSubmitted);

            if ($currentIds !== $sortedSubmitted) {
                throw ValidationException::withMessages([
                    'column_ids' => 'Informe todas as colunas do quadro, e somente elas.',
                ]);
            }

            foreach ($submittedIds as $position => $columnId) {
                $column = $columns->get($columnId);
                $column->position = $position;

                if ($column->isDirty()) {
                    $column->save();
                }
            }

            return $board->columns()->orderBy('position')->get();
        });

        return response()->json([
            'mensagem' => 'ok',
            'colunas' => $columns,
        ]);
    }

    /**
     * Exclui uma coluna e reorganiza as posições restantes do quadro.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $column = $this->findUserColumn($request, $id)
            ->with('board')
            ->firstOrFail();

        $this->ensureCanEdit($column->board, $request->user());

        DB::transaction(function () use ($column) {
            $column->delete();

            BoardColumn::query()
                ->where('board_id', $column->board_id)
                ->where('position', '>', $column->position)
                ->decrement('position');
        });

        return response()->json([
            'mensagem' => 'ok',
        ]);
    }

    /**
     * Grava a cor sempre em minúsculas (ou nula, para usar a cor padrão).
     */
    private function normalizeColor(?string $color): ?string
    {
        return $color === null ? null : strtolower($color);
    }

    /**
     * Busca somente colunas dos quadros que o usuário acessa (próprios ou
     * compartilhados). A permissão de edição é conferida em cada ação.
     */
    private function findUserColumn(
        Request $request,
        string $id
    ): \Illuminate\Database\Eloquent\Builder {
        return BoardColumn::query()
            ->whereHas('board', function ($query) use ($request) {
                $query->accessibleBy($request->user());
            })
            ->where('id', $id);
    }
}
