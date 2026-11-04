<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class KanbanEditTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private BoardColumn $column;

    private Task $task;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $board = Board::create(['user_id' => $this->user->id, 'name' => 'Quadro']);

        $this->column = $board->columns()->create(['name' => 'A fazer', 'position' => 0]);

        $this->task = $this->column->tasks()->create([
            'title' => 'Título original',
            'description' => 'Descrição original',
            'priority' => 'low',
            'due_date' => '2026-12-01',
            'position' => 0,
        ]);
    }

    private function otherUser(): User
    {
        return User::factory()->create();
    }

    public function test_edits_task_fields(): void
    {
        Sanctum::actingAs($this->user);

        $this->patchJson("/api/tasks/{$this->task->id}", [
            'title' => 'Novo título',
            'description' => 'Nova descrição',
            'priority' => 'high',
            'due_date' => '2027-01-15',
        ])
            ->assertOk()
            ->assertJsonPath('tarefa.title', 'Novo título')
            ->assertJsonPath('tarefa.priority', 'high');

        $task = $this->task->refresh();

        $this->assertSame('Novo título', $task->title);
        $this->assertSame('Nova descrição', $task->description);
        $this->assertSame('high', $task->priority);
        $this->assertStringStartsWith('2027-01-15', (string) $task->due_date);
        // Editar não altera coluna nem posição.
        $this->assertSame($this->column->id, $task->board_column_id);
        $this->assertSame(0, $task->position);
    }

    public function test_clears_optional_task_fields(): void
    {
        Sanctum::actingAs($this->user);

        $this->patchJson("/api/tasks/{$this->task->id}", [
            'description' => '',
            'due_date' => null,
        ])->assertOk();

        $task = $this->task->refresh();

        $this->assertNull($task->description);
        $this->assertNull($task->due_date);
        $this->assertSame('Título original', $task->title);
    }

    public function test_rejects_invalid_task_data(): void
    {
        Sanctum::actingAs($this->user);

        $cases = [
            'title' => ['title' => '   '],
            'title_too_long' => ['title' => str_repeat('a', 256)],
            'description' => ['description' => str_repeat('a', 5001)],
            'priority' => ['priority' => 'urgent'],
            'due_date' => ['due_date' => '2026-02-30'],
        ];

        foreach ($cases as $name => $payload) {
            $field = array_key_first($payload);

            $this->patchJson("/api/tasks/{$this->task->id}", $payload)
                ->assertUnprocessable()
                ->assertJsonValidationErrors($field, 'errors', "Caso {$name} deveria falhar");
        }

        $task = $this->task->refresh();

        $this->assertSame('Título original', $task->title);
        $this->assertSame('low', $task->priority);
    }

    public function test_cannot_edit_task_of_another_user(): void
    {
        Sanctum::actingAs($this->otherUser());

        $this->patchJson("/api/tasks/{$this->task->id}", ['title' => 'Invasão'])
            ->assertNotFound();

        $this->assertSame('Título original', $this->task->refresh()->title);
    }

    public function test_editing_task_requires_authentication(): void
    {
        $this->patchJson("/api/tasks/{$this->task->id}", ['title' => 'Sem login'])
            ->assertUnauthorized();

        $this->assertSame('Título original', $this->task->refresh()->title);
    }

    public function test_renames_column(): void
    {
        Sanctum::actingAs($this->user);

        $this->patchJson("/api/columns/{$this->column->id}", ['name' => 'Em andamento'])
            ->assertOk()
            ->assertJsonPath('coluna.name', 'Em andamento');

        $column = $this->column->refresh();

        $this->assertSame('Em andamento', $column->name);
        $this->assertSame(0, $column->position);
    }

    public function test_rejects_invalid_column_name(): void
    {
        Sanctum::actingAs($this->user);

        $this->patchJson("/api/columns/{$this->column->id}", ['name' => '  '])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');

        $this->patchJson("/api/columns/{$this->column->id}", ['name' => str_repeat('a', 256)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');

        $this->assertSame('A fazer', $this->column->refresh()->name);
    }

    public function test_cannot_rename_column_of_another_user(): void
    {
        Sanctum::actingAs($this->otherUser());

        $this->patchJson("/api/columns/{$this->column->id}", ['name' => 'Invasão'])
            ->assertNotFound();

        $this->assertSame('A fazer', $this->column->refresh()->name);
    }

    public function test_renaming_column_requires_authentication(): void
    {
        $this->patchJson("/api/columns/{$this->column->id}", ['name' => 'Sem login'])
            ->assertUnauthorized();

        $this->assertSame('A fazer', $this->column->refresh()->name);
    }
}
