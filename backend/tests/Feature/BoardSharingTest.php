<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BoardSharingTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private User $editor;

    private User $viewer;

    private User $stranger;

    private Board $board;

    private BoardColumn $column;

    private Task $task;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->create(['name' => 'Ana Dona', 'email' => 'ana@example.com']);
        $this->editor = User::factory()->create(['name' => 'Bruno Editor', 'email' => 'bruno@example.com']);
        $this->viewer = User::factory()->create(['name' => 'Carla Leitora', 'email' => 'carla@example.com']);
        $this->stranger = User::factory()->create(['email' => 'estranho@example.com']);

        $this->board = Board::create(['user_id' => $this->owner->id, 'name' => 'Lançamento']);
        $this->column = $this->board->columns()->create(['name' => 'A fazer', 'position' => 0]);
        $this->task = $this->column->tasks()->create(['title' => 'Tarefa', 'position' => 0]);

        $this->board->members()->attach([
            $this->editor->id => ['role' => Board::ROLE_EDITOR],
            $this->viewer->id => ['role' => Board::ROLE_VIEWER],
        ]);
    }

    // ---- Gerenciar o compartilhamento ----------------------------------------

    public function test_owner_shares_board_by_email(): void
    {
        $board = Board::create(['user_id' => $this->owner->id, 'name' => 'Outro']);

        Sanctum::actingAs($this->owner);

        $this->postJson("/api/boards/{$board->id}/members", [
            'email' => 'bruno@example.com',
            'role' => 'viewer',
        ])
            ->assertCreated()
            ->assertJsonPath('membros.0.name', 'Bruno Editor')
            ->assertJsonPath('membros.0.role', 'viewer')
            ->assertJsonMissingPath('membros.0.avatar_path');

        // Compartilhar de novo com a mesma pessoa só troca a permissão.
        $this->postJson("/api/boards/{$board->id}/members", [
            'email' => 'bruno@example.com',
            'role' => 'editor',
        ])
            ->assertCreated()
            ->assertJsonCount(1, 'membros')
            ->assertJsonPath('membros.0.role', 'editor');
    }

    public function test_rejects_unknown_email_owner_and_invalid_role(): void
    {
        Sanctum::actingAs($this->owner);

        $this->postJson("/api/boards/{$this->board->id}/members", [
            'email' => 'ninguem@example.com',
            'role' => 'viewer',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->postJson("/api/boards/{$this->board->id}/members", [
            'email' => 'ana@example.com',
            'role' => 'viewer',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->postJson("/api/boards/{$this->board->id}/members", [
            'email' => 'estranho@example.com',
            'role' => 'owner',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('role');
    }

    public function test_owner_lists_changes_and_removes_members(): void
    {
        Sanctum::actingAs($this->owner);

        $this->getJson("/api/boards/{$this->board->id}/members")
            ->assertOk()
            ->assertJsonCount(2, 'membros');

        $this->patchJson("/api/boards/{$this->board->id}/members/{$this->viewer->id}", ['role' => 'editor'])
            ->assertOk();

        $this->assertTrue($this->board->canEdit($this->viewer));

        $this->deleteJson("/api/boards/{$this->board->id}/members/{$this->editor->id}")
            ->assertOk();

        $this->assertNull($this->board->permissionFor($this->editor));
    }

    public function test_only_owner_manages_sharing(): void
    {
        foreach ([$this->editor, $this->viewer] as $member) {
            Sanctum::actingAs($member);

            $this->getJson("/api/boards/{$this->board->id}/members")->assertForbidden();

            $this->postJson("/api/boards/{$this->board->id}/members", [
                'email' => 'estranho@example.com',
                'role' => 'editor',
            ])->assertForbidden();

            $this->patchJson("/api/boards/{$this->board->id}/members/{$this->viewer->id}", ['role' => 'editor'])
                ->assertForbidden();
        }

        Sanctum::actingAs($this->editor);

        $this->deleteJson("/api/boards/{$this->board->id}/members/{$this->viewer->id}")
            ->assertForbidden();

        Sanctum::actingAs($this->stranger);

        $this->getJson("/api/boards/{$this->board->id}/members")->assertNotFound();

        $this->assertSame(Board::ROLE_VIEWER, $this->board->permissionFor($this->viewer));
    }

    public function test_member_can_leave_board(): void
    {
        Sanctum::actingAs($this->viewer);

        $this->deleteJson("/api/boards/{$this->board->id}/members/{$this->viewer->id}")
            ->assertOk();

        $this->getJson("/api/boards/{$this->board->id}")->assertNotFound();
    }

    // ---- O que cada um enxerga -------------------------------------------------

    public function test_shared_board_appears_with_owner_and_permission(): void
    {
        Board::create(['user_id' => $this->viewer->id, 'name' => 'Meu quadro']);

        Sanctum::actingAs($this->viewer);

        $boards = collect($this->getJson('/api/boards')->assertOk()->json('quadros'))->keyBy('name');

        $this->assertCount(2, $boards);
        $this->assertSame('owner', $boards['Meu quadro']['permission']);

        $shared = $boards['Lançamento'];
        $this->assertSame('viewer', $shared['permission']);
        $this->assertSame('Ana Dona', $shared['owner']['name']);
        $this->assertArrayHasKey('avatar_url', $shared['owner']);
        $this->assertArrayNotHasKey('email', $shared['owner']);
        $this->assertArrayNotHasKey('members', $shared);
        $this->assertSame(1, $shared['columns_count']);
        $this->assertSame(1, $shared['tasks_count']);
    }

    public function test_strangers_do_not_see_the_board(): void
    {
        Sanctum::actingAs($this->stranger);

        $this->getJson('/api/boards')->assertOk()->assertJsonCount(0, 'quadros');
        $this->getJson("/api/boards/{$this->board->id}")->assertNotFound();
        $this->getJson("/api/columns/{$this->column->id}")->assertNotFound();
        $this->getJson("/api/tasks/{$this->task->id}")->assertNotFound();
    }

    public function test_viewer_reads_but_cannot_change_anything(): void
    {
        Sanctum::actingAs($this->viewer);

        $this->getJson("/api/boards/{$this->board->id}")
            ->assertOk()
            ->assertJsonPath('quadro.permission', 'viewer')
            ->assertJsonPath('quadro.columns.0.tasks.0.title', 'Tarefa');

        $this->postJson('/api/columns', ['board_id' => $this->board->id, 'name' => 'Nova'])->assertForbidden();
        $this->patchJson("/api/columns/{$this->column->id}", ['name' => 'X'])->assertForbidden();
        $this->putJson('/api/columns/reorder', [
            'board_id' => $this->board->id,
            'column_ids' => [$this->column->id],
        ])->assertForbidden();
        $this->deleteJson("/api/columns/{$this->column->id}")->assertForbidden();

        $this->postJson('/api/tasks', ['board_column_id' => $this->column->id, 'title' => 'Nova'])->assertForbidden();
        $this->patchJson("/api/tasks/{$this->task->id}", ['title' => 'X'])->assertForbidden();
        $this->putJson('/api/tasks/reorder', [
            'columns' => [['id' => $this->column->id, 'task_ids' => [$this->task->id]]],
        ])->assertForbidden();
        $this->deleteJson("/api/tasks/{$this->task->id}")->assertForbidden();

        $this->patchJson("/api/boards/{$this->board->id}", ['name' => 'X'])->assertForbidden();
        $this->deleteJson("/api/boards/{$this->board->id}")->assertForbidden();

        $this->assertSame('A fazer', $this->column->refresh()->name);
        $this->assertSame('Tarefa', $this->task->refresh()->title);
        $this->assertSame(1, $this->board->columns()->count());
        $this->assertSame('Lançamento', $this->board->refresh()->name);
    }

    public function test_editor_changes_columns_and_tasks_but_not_the_board(): void
    {
        Sanctum::actingAs($this->editor);

        $column = $this->postJson('/api/columns', [
            'board_id' => $this->board->id,
            'name' => 'Feito',
            'position' => 1,
        ])->assertCreated()->json('coluna');

        $this->patchJson("/api/columns/{$this->column->id}", ['name' => 'Em andamento'])->assertOk();

        $this->postJson('/api/tasks', ['board_column_id' => $this->column->id, 'title' => 'Nova'])
            ->assertCreated();

        $this->patchJson("/api/tasks/{$this->task->id}", ['board_column_id' => $column['id'], 'position' => 0])
            ->assertOk();

        $this->putJson('/api/columns/reorder', [
            'board_id' => $this->board->id,
            'column_ids' => [$column['id'], $this->column->id],
        ])->assertOk();

        $this->patchJson("/api/boards/{$this->board->id}", ['name' => 'X'])->assertForbidden();
        $this->deleteJson("/api/boards/{$this->board->id}")->assertForbidden();

        $this->assertSame('Em andamento', $this->column->refresh()->name);
        $this->assertSame($column['id'], $this->task->refresh()->board_column_id);
        $this->assertSame('Lançamento', $this->board->refresh()->name);
    }

    public function test_editor_cannot_move_task_to_board_they_only_view(): void
    {
        $other = Board::create(['user_id' => $this->stranger->id, 'name' => 'Alheio']);
        $otherColumn = $other->columns()->create(['name' => 'Coluna', 'position' => 0]);
        $other->members()->attach($this->editor->id, ['role' => Board::ROLE_VIEWER]);

        Sanctum::actingAs($this->editor);

        $this->patchJson("/api/tasks/{$this->task->id}", ['board_column_id' => $otherColumn->id])
            ->assertForbidden();

        $this->assertSame($this->column->id, $this->task->refresh()->board_column_id);
    }

    public function test_deleting_board_or_user_removes_sharing(): void
    {
        $this->owner->delete();

        $this->assertDatabaseMissing('board_user', ['board_id' => $this->board->id]);

        $board = Board::create(['user_id' => $this->stranger->id, 'name' => 'Q']);
        $board->members()->attach($this->viewer->id, ['role' => Board::ROLE_VIEWER]);

        $this->viewer->delete();

        $this->assertDatabaseMissing('board_user', ['board_id' => $board->id]);
    }
}
