<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ColumnColorTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Board $board;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->board = Board::create(['user_id' => $this->user->id, 'name' => 'Quadro']);
    }

    public function test_creates_column_with_color(): void
    {
        Sanctum::actingAs($this->user);

        $this->postJson('/api/columns', [
            'board_id' => $this->board->id,
            'name' => 'A fazer',
            'color' => '#8471F2',
        ])
            ->assertCreated()
            ->assertJsonPath('coluna.color', '#8471f2');

        $this->assertSame('#8471f2', BoardColumn::first()->color);
    }

    public function test_creates_column_without_color(): void
    {
        Sanctum::actingAs($this->user);

        $this->postJson('/api/columns', [
            'board_id' => $this->board->id,
            'name' => 'A fazer',
        ])
            ->assertCreated()
            ->assertJsonPath('coluna.color', null);
    }

    public function test_rejects_invalid_color(): void
    {
        Sanctum::actingAs($this->user);

        foreach (['red', '#fff', '#12345g', '8471f2', '#8471f2ff'] as $color) {
            $this->postJson('/api/columns', [
                'board_id' => $this->board->id,
                'name' => 'A fazer',
                'color' => $color,
            ])
                ->assertUnprocessable()
                ->assertJsonValidationErrors('color');
        }

        $this->assertSame(0, BoardColumn::count());
    }

    public function test_updates_and_clears_column_color(): void
    {
        Sanctum::actingAs($this->user);

        $column = $this->board->columns()->create(['name' => 'A fazer', 'position' => 0]);

        $this->patchJson("/api/columns/{$column->id}", ['color' => '#67E2AE'])
            ->assertOk()
            ->assertJsonPath('coluna.color', '#67e2ae')
            ->assertJsonPath('coluna.name', 'A fazer');

        $this->patchJson("/api/columns/{$column->id}", ['color' => null])
            ->assertOk()
            ->assertJsonPath('coluna.color', null);
    }

    public function test_rejects_invalid_color_on_update(): void
    {
        Sanctum::actingAs($this->user);

        $column = $this->board->columns()->create([
            'name' => 'A fazer',
            'position' => 0,
            'color' => '#49c4e5',
        ]);

        $this->patchJson("/api/columns/{$column->id}", ['color' => 'azul'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('color');

        $this->assertSame('#49c4e5', $column->refresh()->color);
    }

    public function test_cannot_change_color_of_another_users_column(): void
    {
        $column = $this->board->columns()->create(['name' => 'A fazer', 'position' => 0]);

        Sanctum::actingAs(User::factory()->create());

        $this->patchJson("/api/columns/{$column->id}", ['color' => '#ea5555'])
            ->assertNotFound();

        $this->assertNull($column->refresh()->color);
    }
}
