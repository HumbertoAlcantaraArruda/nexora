<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Tests\TestCase;

class TaskReorderTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private BoardColumn $todo;

    private BoardColumn $done;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $board = Board::create([
            'user_id' => $this->user->id,
            'name' => 'Quadro',
        ]);

        $this->todo = $board->columns()->create(['name' => 'A fazer', 'position' => 0]);
        $this->done = $board->columns()->create(['name' => 'Feito', 'position' => 1]);
    }

    /**
     * @return array<int, Task>
     */
    private function createTasks(BoardColumn $column, int $count): array
    {
        $tasks = [];

        for ($position = 0; $position < $count; $position++) {
            $tasks[] = $column->tasks()->create([
                'title' => "Tarefa {$position}",
                'position' => $position,
            ]);
        }

        return $tasks;
    }

    /**
     * @return array<int, int>
     */
    private function orderedIds(BoardColumn $column): array
    {
        return $column->tasks()->orderBy('position')->pluck('id')->all();
    }

    /**
     * @return array<int, int>
     */
    private function positions(BoardColumn $column): array
    {
        return $column->tasks()->orderBy('position')->pluck('position')->all();
    }

    public function test_reorders_tasks_within_the_same_column(): void
    {
        [$a, $b, $c] = $this->createTasks($this->todo, 3);

        Sanctum::actingAs($this->user);

        $this->putJson('/api/tasks/reorder', [
            'columns' => [
                ['id' => $this->todo->id, 'task_ids' => [$c->id, $a->id, $b->id]],
            ],
        ])
            ->assertOk()
            ->assertJsonPath('mensagem', 'ok')
            ->assertJsonCount(3, 'tarefas');

        $this->assertSame([$c->id, $a->id, $b->id], $this->orderedIds($this->todo));
        $this->assertSame([0, 1, 2], $this->positions($this->todo));
    }

    public function test_moves_task_between_columns_and_renumbers_both(): void
    {
        [$a, $b, $c] = $this->createTasks($this->todo, 3);
        [$x] = $this->createTasks($this->done, 1);

        Sanctum::actingAs($this->user);

        $this->putJson('/api/tasks/reorder', [
            'columns' => [
                ['id' => $this->todo->id, 'task_ids' => [$a->id, $c->id]],
                ['id' => $this->done->id, 'task_ids' => [$b->id, $x->id]],
            ],
        ])->assertOk();

        $this->assertSame([$a->id, $c->id], $this->orderedIds($this->todo));
        $this->assertSame([0, 1], $this->positions($this->todo));
        $this->assertSame([$b->id, $x->id], $this->orderedIds($this->done));
        $this->assertSame([0, 1], $this->positions($this->done));
    }

    public function test_moving_last_task_out_accepts_empty_source_column(): void
    {
        [$a] = $this->createTasks($this->todo, 1);

        Sanctum::actingAs($this->user);

        $this->putJson('/api/tasks/reorder', [
            'columns' => [
                ['id' => $this->todo->id, 'task_ids' => []],
                ['id' => $this->done->id, 'task_ids' => [$a->id]],
            ],
        ])->assertOk();

        $this->assertSame([], $this->orderedIds($this->todo));
        $this->assertSame([$a->id], $this->orderedIds($this->done));
    }

    public function test_requires_authentication(): void
    {
        [$a] = $this->createTasks($this->todo, 1);

        $this->putJson('/api/tasks/reorder', [
            'columns' => [['id' => $this->todo->id, 'task_ids' => [$a->id]]],
        ])->assertUnauthorized();
    }

    public function test_rejects_invalid_payload(): void
    {
        [$a, $b] = $this->createTasks($this->todo, 2);

        Sanctum::actingAs($this->user);

        $this->putJson('/api/tasks/reorder', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('columns');

        $this->putJson('/api/tasks/reorder', [
            'columns' => [['id' => $this->todo->id, 'task_ids' => ['abc', $b->id]]],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('columns.0.task_ids.0');

        $this->putJson('/api/tasks/reorder', [
            'columns' => [['id' => $this->todo->id, 'task_ids' => [$a->id, $a->id, $b->id]]],
        ])->assertUnprocessable();

        $this->putJson('/api/tasks/reorder', [
            'columns' => [
                ['id' => $this->todo->id, 'task_ids' => [$a->id]],
                ['id' => $this->done->id, 'task_ids' => [$a->id, $b->id]],
            ],
        ])->assertUnprocessable();

        $this->assertSame([$a->id, $b->id], $this->orderedIds($this->todo));
    }

    public function test_rejects_reorder_that_leaves_column_tasks_out(): void
    {
        [$a, $b, $c] = $this->createTasks($this->todo, 3);

        Sanctum::actingAs($this->user);

        $this->putJson('/api/tasks/reorder', [
            'columns' => [['id' => $this->todo->id, 'task_ids' => [$c->id, $a->id]]],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('columns');

        $this->assertSame([$a->id, $b->id, $c->id], $this->orderedIds($this->todo));
        $this->assertSame([0, 1, 2], $this->positions($this->todo));
    }

    public function test_cannot_reorder_tasks_of_another_user(): void
    {
        [$a, $b] = $this->createTasks($this->todo, 2);

        $intruder = User::factory()->create();
        $intruderBoard = Board::create(['user_id' => $intruder->id, 'name' => 'Outro']);
        $intruderColumn = $intruderBoard->columns()->create(['name' => 'Col', 'position' => 0]);

        Sanctum::actingAs($intruder);

        // Tenta reordenar a coluna de outro usuário.
        $this->putJson('/api/tasks/reorder', [
            'columns' => [['id' => $this->todo->id, 'task_ids' => [$b->id, $a->id]]],
        ])->assertNotFound();

        // Tenta puxar tarefas de outro usuário para a própria coluna.
        $this->putJson('/api/tasks/reorder', [
            'columns' => [['id' => $intruderColumn->id, 'task_ids' => [$a->id]]],
        ])->assertNotFound();

        $this->assertSame([$a->id, $b->id], $this->orderedIds($this->todo));
    }

    public function test_failure_during_update_rolls_back_all_changes(): void
    {
        [$a, $b, $c] = $this->createTasks($this->todo, 3);

        // Simula uma falha do banco ao salvar a segunda tarefa do lote.
        Task::updating(function (Task $task) use ($a) {
            if ($task->id === $a->id) {
                throw new RuntimeException('Falha simulada');
            }
        });

        Sanctum::actingAs($this->user);

        $this->putJson('/api/tasks/reorder', [
            'columns' => [['id' => $this->todo->id, 'task_ids' => [$c->id, $a->id, $b->id]]],
        ])->assertServerError();

        $this->assertSame([$a->id, $b->id, $c->id], $this->orderedIds($this->todo));
        $this->assertSame([0, 1, 2], $this->positions($this->todo));
    }

    public function test_deleting_task_renumbers_remaining_positions(): void
    {
        [$a, $b, $c] = $this->createTasks($this->todo, 3);

        Sanctum::actingAs($this->user);

        $this->deleteJson("/api/tasks/{$a->id}")->assertOk();

        $this->assertSame([$b->id, $c->id], $this->orderedIds($this->todo));
        $this->assertSame([0, 1], $this->positions($this->todo));
    }
}
