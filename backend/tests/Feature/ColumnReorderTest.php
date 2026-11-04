<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Tests\TestCase;

class ColumnReorderTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Board $board;

    /** @var array<int, BoardColumn> */
    private array $columns;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->board = Board::create(['user_id' => $this->user->id, 'name' => 'Quadro']);

        $this->columns = [];

        foreach (['A fazer', 'Fazendo', 'Feito'] as $position => $name) {
            $this->columns[] = $this->board->columns()->create([
                'name' => $name,
                'position' => $position,
            ]);
        }
    }

    /**
     * @return array<int, int>
     */
    private function orderedIds(?Board $board = null): array
    {
        return ($board ?? $this->board)->columns()->orderBy('position')->pluck('id')->all();
    }

    /**
     * @return array<int, int>
     */
    private function positions(): array
    {
        return $this->board->columns()->orderBy('position')->pluck('position')->all();
    }

    public function test_reorders_columns(): void
    {
        [$a, $b, $c] = $this->columns;

        Sanctum::actingAs($this->user);

        $this->putJson('/api/columns/reorder', [
            'board_id' => $this->board->id,
            'column_ids' => [$c->id, $a->id, $b->id],
        ])
            ->assertOk()
            ->assertJsonPath('mensagem', 'ok')
            ->assertJsonPath('colunas.0.id', $c->id);

        $this->assertSame([$c->id, $a->id, $b->id], $this->orderedIds());
        $this->assertSame([0, 1, 2], $this->positions());
    }

    public function test_requires_authentication(): void
    {
        [$a, $b, $c] = $this->columns;

        $this->putJson('/api/columns/reorder', [
            'board_id' => $this->board->id,
            'column_ids' => [$c->id, $b->id, $a->id],
        ])->assertUnauthorized();

        $this->assertSame([$a->id, $b->id, $c->id], $this->orderedIds());
    }

    public function test_rejects_invalid_payload(): void
    {
        [$a, $b, $c] = $this->columns;

        Sanctum::actingAs($this->user);

        $this->putJson('/api/columns/reorder', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['board_id', 'column_ids']);

        $this->putJson('/api/columns/reorder', [
            'board_id' => $this->board->id,
            'column_ids' => [$a->id, $a->id, $b->id],
        ])->assertUnprocessable();

        $this->putJson('/api/columns/reorder', [
            'board_id' => $this->board->id,
            'column_ids' => ['x', $b->id, $c->id],
        ])->assertUnprocessable();

        // Lista incompleta: faltaria a coluna $b.
        $this->putJson('/api/columns/reorder', [
            'board_id' => $this->board->id,
            'column_ids' => [$c->id, $a->id],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('column_ids');

        $this->assertSame([$a->id, $b->id, $c->id], $this->orderedIds());
    }

    public function test_rejects_columns_from_another_board(): void
    {
        [$a, $b, $c] = $this->columns;

        $otherBoard = Board::create(['user_id' => $this->user->id, 'name' => 'Outro']);
        $foreign = $otherBoard->columns()->create(['name' => 'Alheia', 'position' => 0]);

        Sanctum::actingAs($this->user);

        $this->putJson('/api/columns/reorder', [
            'board_id' => $this->board->id,
            'column_ids' => [$c->id, $a->id, $b->id, $foreign->id],
        ])->assertUnprocessable();

        $this->assertSame([$a->id, $b->id, $c->id], $this->orderedIds());
        $this->assertSame([$foreign->id], $this->orderedIds($otherBoard));
    }

    public function test_cannot_reorder_columns_of_another_user(): void
    {
        [$a, $b, $c] = $this->columns;

        Sanctum::actingAs(User::factory()->create());

        $this->putJson('/api/columns/reorder', [
            'board_id' => $this->board->id,
            'column_ids' => [$c->id, $b->id, $a->id],
        ])->assertNotFound();

        $this->assertSame([$a->id, $b->id, $c->id], $this->orderedIds());
    }

    public function test_failure_during_update_rolls_back_all_changes(): void
    {
        [$a, $b, $c] = $this->columns;

        // Simula uma falha do banco ao salvar a segunda coluna do lote.
        BoardColumn::updating(function (BoardColumn $column) use ($a) {
            if ($column->id === $a->id) {
                throw new RuntimeException('Falha simulada');
            }
        });

        Sanctum::actingAs($this->user);

        $this->putJson('/api/columns/reorder', [
            'board_id' => $this->board->id,
            'column_ids' => [$c->id, $a->id, $b->id],
        ])->assertServerError();

        $this->assertSame([$a->id, $b->id, $c->id], $this->orderedIds());
        $this->assertSame([0, 1, 2], $this->positions());
    }

    public function test_deleting_column_renumbers_remaining_positions(): void
    {
        [$a, $b, $c] = $this->columns;

        Sanctum::actingAs($this->user);

        $this->deleteJson("/api/columns/{$a->id}")->assertOk();

        $this->assertSame([$b->id, $c->id], $this->orderedIds());
        $this->assertSame([0, 1], $this->positions());
    }
}
