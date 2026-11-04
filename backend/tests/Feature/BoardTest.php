<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BoardTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
    }

    /**
     * Cria um quadro com colunas e tarefas para o usuário informado.
     */
    private function boardWithContent(User $owner, string $name = 'Quadro'): Board
    {
        $board = Board::create(['user_id' => $owner->id, 'name' => $name]);

        $todo = $board->columns()->create(['name' => 'A fazer', 'position' => 0]);
        $board->columns()->create(['name' => 'Feito', 'position' => 1]);

        $todo->tasks()->create(['title' => 'Tarefa 1', 'position' => 0]);
        $todo->tasks()->create(['title' => 'Tarefa 2', 'position' => 1]);

        return $board;
    }

    public function test_lists_only_own_boards_with_counts(): void
    {
        $mine = $this->boardWithContent($this->user, 'Meu quadro');
        $this->boardWithContent(User::factory()->create(), 'Quadro alheio');

        Sanctum::actingAs($this->user);

        $this->getJson('/api/boards')
            ->assertOk()
            ->assertJsonCount(1, 'quadros')
            ->assertJsonPath('quadros.0.id', $mine->id)
            ->assertJsonPath('quadros.0.columns_count', 2)
            ->assertJsonPath('quadros.0.tasks_count', 2);
    }

    public function test_listing_requires_authentication(): void
    {
        $this->getJson('/api/boards')->assertUnauthorized();
    }

    public function test_shows_own_board_with_columns_and_tasks(): void
    {
        $board = $this->boardWithContent($this->user);

        Sanctum::actingAs($this->user);

        $this->getJson("/api/boards/{$board->id}")
            ->assertOk()
            ->assertJsonPath('quadro.id', $board->id)
            ->assertJsonCount(2, 'quadro.columns')
            ->assertJsonCount(2, 'quadro.columns.0.tasks');
    }

    public function test_cannot_show_board_of_another_user(): void
    {
        $board = $this->boardWithContent(User::factory()->create());

        Sanctum::actingAs($this->user);

        $this->getJson("/api/boards/{$board->id}")->assertNotFound();
    }

    public function test_deleting_board_removes_its_columns_and_tasks(): void
    {
        $board = $this->boardWithContent($this->user);
        $other = $this->boardWithContent($this->user, 'Outro quadro');

        $columnIds = $board->columns()->pluck('id');
        $this->assertSame(4, Task::count());

        Sanctum::actingAs($this->user);

        $this->deleteJson("/api/boards/{$board->id}")->assertOk();

        $this->assertModelMissing($board);
        $this->assertSame(0, BoardColumn::whereIn('id', $columnIds)->count());
        $this->assertSame(0, Task::whereIn('board_column_id', $columnIds)->count());

        // O outro quadro do usuário não é afetado.
        $this->assertModelExists($other);
        $this->assertSame(2, $other->columns()->count());
        $this->assertSame(2, $other->tasks()->count());
        $this->assertSame(2, Task::count());
    }

    public function test_cannot_delete_board_of_another_user(): void
    {
        $board = $this->boardWithContent(User::factory()->create());

        Sanctum::actingAs($this->user);

        $this->deleteJson("/api/boards/{$board->id}")->assertNotFound();

        $this->assertModelExists($board);
        $this->assertSame(2, $board->tasks()->count());
    }

    public function test_deleting_board_requires_authentication(): void
    {
        $board = $this->boardWithContent($this->user);

        $this->deleteJson("/api/boards/{$board->id}")->assertUnauthorized();

        $this->assertModelExists($board);
    }

    public function test_creates_board_and_validates_name(): void
    {
        Sanctum::actingAs($this->user);

        $this->postJson('/api/boards', ['name' => 'Projeto X', 'description' => 'Desc'])
            ->assertCreated()
            ->assertJsonPath('quadro.name', 'Projeto X')
            ->assertJsonPath('quadro.user_id', $this->user->id);

        $this->postJson('/api/boards', ['name' => '  '])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    }
}
