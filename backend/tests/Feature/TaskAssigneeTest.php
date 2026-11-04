<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TaskAssigneeTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private User $assignee;

    private Board $board;

    private BoardColumn $column;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->create(['name' => 'Ana Dona']);
        // Usuário da plataforma sem nenhum acesso ao quadro.
        $this->assignee = User::factory()->create([
            'name' => 'Bruno Responsável',
            'email' => 'bruno@example.com',
        ]);

        $this->board = Board::create(['user_id' => $this->owner->id, 'name' => 'Quadro']);
        $this->column = $this->board->columns()->create(['name' => 'A fazer', 'position' => 0]);
    }

    public function test_searches_users_by_name_with_name_email_and_photo_only(): void
    {
        User::factory()->create(['name' => 'Carla Brunetti']);

        Sanctum::actingAs($this->owner);

        $users = $this->getJson('/api/users?search=brun')
            ->assertOk()
            ->assertJsonCount(2, 'usuarios')
            ->json('usuarios');

        $this->assertSame(['Bruno Responsável', 'Carla Brunetti'], array_column($users, 'name'));
        $this->assertSame(['id', 'name', 'email', 'avatar_url'], array_keys($users[0]));
        $this->assertSame('bruno@example.com', $users[0]['email']);
    }

    public function test_users_are_not_listed_without_a_search_term(): void
    {
        Sanctum::actingAs($this->owner);

        $this->getJson('/api/users')->assertOk()->assertJsonCount(0, 'usuarios');
        $this->getJson('/api/users?search=b')->assertOk()->assertJsonCount(0, 'usuarios');
        $this->getJson('/api/users?search=%25%25')->assertOk()->assertJsonCount(0, 'usuarios');
    }

    public function test_search_returns_at_most_ten_users(): void
    {
        User::factory()->count(12)->create(['name' => 'Pessoa Repetida']);

        Sanctum::actingAs($this->owner);

        $this->getJson('/api/users?search=repetida')->assertOk()->assertJsonCount(10, 'usuarios');
    }

    public function test_users_list_requires_authentication(): void
    {
        $this->getJson('/api/users')->assertUnauthorized();
    }

    public function test_creates_task_with_any_platform_user_as_assignee(): void
    {
        Sanctum::actingAs($this->owner);

        $this->postJson('/api/tasks', [
            'board_column_id' => $this->column->id,
            'title' => 'Revisar contrato',
            'assignee_id' => $this->assignee->id,
        ])
            ->assertCreated()
            ->assertJsonPath('tarefa.assignee_id', $this->assignee->id)
            ->assertJsonPath('tarefa.assignee.name', 'Bruno Responsável')
            ->assertJsonPath('tarefa.assignee.email', 'bruno@example.com')
            ->assertJsonPath('tarefa.assignee.avatar_url', null)
            ->assertJsonMissingPath('tarefa.assignee.avatar_path');
    }

    public function test_assignee_is_optional(): void
    {
        Sanctum::actingAs($this->owner);

        $this->postJson('/api/tasks', [
            'board_column_id' => $this->column->id,
            'title' => 'Sem responsável',
        ])
            ->assertCreated()
            ->assertJsonPath('tarefa.assignee_id', null)
            ->assertJsonPath('tarefa.assignee', null);
    }

    public function test_changes_and_clears_assignee(): void
    {
        $task = $this->column->tasks()->create(['title' => 'Tarefa', 'position' => 0]);

        Sanctum::actingAs($this->owner);

        $this->patchJson("/api/tasks/{$task->id}", ['assignee_id' => $this->assignee->id])
            ->assertOk()
            ->assertJsonPath('tarefa.assignee.name', 'Bruno Responsável');

        $this->patchJson("/api/tasks/{$task->id}", ['assignee_id' => null])
            ->assertOk()
            ->assertJsonPath('tarefa.assignee', null);

        $this->assertNull($task->refresh()->assignee_id);
    }

    public function test_rejects_unknown_assignee(): void
    {
        Sanctum::actingAs($this->owner);

        $this->postJson('/api/tasks', [
            'board_column_id' => $this->column->id,
            'title' => 'Tarefa',
            'assignee_id' => 999999,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('assignee_id');

        $this->assertSame(0, Task::count());
    }

    public function test_board_returns_assignee_of_each_task(): void
    {
        $this->column->tasks()->create([
            'title' => 'Tarefa',
            'position' => 0,
            'assignee_id' => $this->assignee->id,
        ]);

        Sanctum::actingAs($this->owner);

        $this->getJson("/api/boards/{$this->board->id}")
            ->assertOk()
            ->assertJsonPath('quadro.columns.0.tasks.0.assignee.name', 'Bruno Responsável');
    }

    public function test_being_assignee_does_not_grant_access(): void
    {
        $task = $this->column->tasks()->create([
            'title' => 'Tarefa',
            'position' => 0,
            'assignee_id' => $this->assignee->id,
        ]);

        Sanctum::actingAs($this->assignee);

        $this->getJson('/api/boards')->assertOk()->assertJsonCount(0, 'quadros');
        $this->getJson("/api/boards/{$this->board->id}")->assertNotFound();
        $this->getJson("/api/tasks/{$task->id}")->assertNotFound();
        $this->patchJson("/api/tasks/{$task->id}", ['title' => 'X'])->assertNotFound();
    }

    public function test_viewer_cannot_change_assignee(): void
    {
        $task = $this->column->tasks()->create(['title' => 'Tarefa', 'position' => 0]);
        $viewer = User::factory()->create();
        $this->board->members()->attach($viewer->id, ['role' => Board::ROLE_VIEWER]);

        Sanctum::actingAs($viewer);

        $this->patchJson("/api/tasks/{$task->id}", ['assignee_id' => $viewer->id])
            ->assertForbidden();

        $this->assertNull($task->refresh()->assignee_id);
    }

    public function test_deleting_assignee_account_leaves_task_unassigned(): void
    {
        $task = $this->column->tasks()->create([
            'title' => 'Tarefa',
            'position' => 0,
            'assignee_id' => $this->assignee->id,
        ]);

        $this->assignee->delete();

        $this->assertNull($task->refresh()->assignee_id);
    }
}
