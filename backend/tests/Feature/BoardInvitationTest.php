<?php

namespace Tests\Feature;

use App\Mail\BoardInvitationMail;
use App\Models\Board;
use App\Models\BoardInvitation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BoardInvitationTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private User $invitee;

    private User $stranger;

    private Board $board;

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();

        $this->owner = User::factory()->create(['name' => 'Ana Dona']);
        $this->invitee = User::factory()->create(['name' => 'Bruno Convidado', 'email' => 'bruno@example.com']);
        $this->stranger = User::factory()->create();

        $this->board = Board::create(['user_id' => $this->owner->id, 'name' => 'Lançamento']);
    }

    private function invite(string $role = 'editor')
    {
        Sanctum::actingAs($this->owner);

        return $this->postJson("/api/boards/{$this->board->id}/invitations", [
            'user_id' => $this->invitee->id,
            'role' => $role,
        ]);
    }

    private function pendingInvitation(string $role = Board::ROLE_EDITOR): BoardInvitation
    {
        return BoardInvitation::create([
            'board_id' => $this->board->id,
            'inviter_id' => $this->owner->id,
            'invitee_id' => $this->invitee->id,
            'role' => $role,
            'status' => BoardInvitation::STATUS_PENDING,
        ]);
    }

    // ---- Dono convida --------------------------------------------------------

    public function test_owner_invites_and_email_is_sent(): void
    {
        $this->invite()
            ->assertCreated()
            ->assertJsonPath('email_enviado', true)
            ->assertJsonPath('convite.status', 'pending')
            ->assertJsonPath('convite.role', 'editor')
            ->assertJsonPath('convite.invitee.name', 'Bruno Convidado')
            ->assertJsonCount(0, 'membros')
            ->assertJsonCount(1, 'convites');

        Mail::assertSent(BoardInvitationMail::class, function (BoardInvitationMail $mail) {
            $invitation = BoardInvitation::first();

            return $mail->hasTo('bruno@example.com')
                && $mail->invitation->is($invitation)
                && str_contains($mail->render(), $invitation->frontendUrl())
                && str_contains($mail->render(), 'Ana Dona');
        });

        // Convidar não dá acesso: só aceitar dá.
        $this->assertNull($this->board->permissionFor($this->invitee));
    }

    public function test_inviting_again_updates_role_and_resends(): void
    {
        $this->invite('viewer')->assertCreated();
        $this->invite('editor')->assertCreated()->assertJsonCount(1, 'convites');

        $this->assertSame(1, BoardInvitation::count());
        $this->assertSame('editor', BoardInvitation::first()->role);
        Mail::assertSentCount(2);
    }

    public function test_rejects_owner_existing_member_unknown_user_and_invalid_role(): void
    {
        Sanctum::actingAs($this->owner);

        $this->postJson("/api/boards/{$this->board->id}/invitations", [
            'user_id' => $this->owner->id,
            'role' => 'viewer',
        ])->assertUnprocessable()->assertJsonValidationErrors('user_id');

        $this->board->members()->attach($this->stranger->id, ['role' => Board::ROLE_VIEWER]);

        $this->postJson("/api/boards/{$this->board->id}/invitations", [
            'user_id' => $this->stranger->id,
            'role' => 'editor',
        ])->assertUnprocessable()->assertJsonValidationErrors('user_id');

        $this->postJson("/api/boards/{$this->board->id}/invitations", [
            'user_id' => 999999,
            'role' => 'viewer',
        ])->assertUnprocessable()->assertJsonValidationErrors('user_id');

        $this->postJson("/api/boards/{$this->board->id}/invitations", [
            'user_id' => $this->invitee->id,
            'role' => 'owner',
        ])->assertUnprocessable()->assertJsonValidationErrors('role');

        $this->assertSame(0, BoardInvitation::count());
        Mail::assertNothingSent();
    }

    public function test_only_owner_invites_and_cancels(): void
    {
        $invitation = $this->pendingInvitation();
        $editor = User::factory()->create();
        $this->board->members()->attach($editor->id, ['role' => Board::ROLE_EDITOR]);

        Sanctum::actingAs($editor);

        $this->postJson("/api/boards/{$this->board->id}/invitations", [
            'user_id' => $this->stranger->id,
            'role' => 'viewer',
        ])->assertForbidden();

        $this->deleteJson("/api/boards/{$this->board->id}/invitations/{$invitation->id}")
            ->assertForbidden();

        Sanctum::actingAs($this->stranger);

        $this->postJson("/api/boards/{$this->board->id}/invitations", [
            'user_id' => $this->invitee->id,
            'role' => 'viewer',
        ])->assertNotFound();

        $this->assertTrue($invitation->refresh()->isPending());
    }

    public function test_owner_cancels_pending_invitation(): void
    {
        $invitation = $this->pendingInvitation();

        Sanctum::actingAs($this->owner);

        $this->deleteJson("/api/boards/{$this->board->id}/invitations/{$invitation->id}")
            ->assertOk()
            ->assertJsonCount(0, 'convites');

        $this->assertModelMissing($invitation);

        Sanctum::actingAs($this->invitee);

        $this->postJson("/api/invitations/{$invitation->id}/accept")->assertNotFound();
    }

    public function test_email_failure_keeps_invitation(): void
    {
        Mail::shouldReceive('to')->andThrow(new \RuntimeException('SMTP fora do ar'));

        $this->invite()
            ->assertCreated()
            ->assertJsonPath('email_enviado', false);

        $this->assertTrue(BoardInvitation::first()->isPending());
    }

    // ---- Convidado responde --------------------------------------------------

    public function test_invitee_sees_pending_invitations(): void
    {
        $invitation = $this->pendingInvitation();

        Sanctum::actingAs($this->invitee);

        $this->getJson('/api/invitations')
            ->assertOk()
            ->assertJsonCount(1, 'convites')
            ->assertJsonPath('convites.0.board.name', 'Lançamento')
            ->assertJsonPath('convites.0.inviter.name', 'Ana Dona');

        $this->getJson("/api/invitations/{$invitation->id}")
            ->assertOk()
            ->assertJsonPath('convite.status', 'pending');

        // Antes de aceitar, o quadro não aparece.
        $this->getJson('/api/boards')->assertJsonCount(0, 'quadros');
        $this->getJson("/api/boards/{$this->board->id}")->assertNotFound();
    }

    public function test_accepting_grants_access_with_invited_role(): void
    {
        $invitation = $this->pendingInvitation(Board::ROLE_VIEWER);

        Sanctum::actingAs($this->invitee);

        $this->postJson("/api/invitations/{$invitation->id}/accept")
            ->assertOk()
            ->assertJsonPath('convite.status', 'accepted');

        $this->getJson("/api/boards/{$this->board->id}")
            ->assertOk()
            ->assertJsonPath('quadro.permission', 'viewer');

        $this->getJson('/api/invitations')->assertJsonCount(0, 'convites');

        $this->postJson("/api/invitations/{$invitation->id}/accept")->assertStatus(409);
        $this->postJson("/api/invitations/{$invitation->id}/decline")->assertStatus(409);
    }

    public function test_declining_does_not_grant_access(): void
    {
        $invitation = $this->pendingInvitation();

        Sanctum::actingAs($this->invitee);

        $this->postJson("/api/invitations/{$invitation->id}/decline")
            ->assertOk()
            ->assertJsonPath('convite.status', 'declined');

        $this->getJson("/api/boards/{$this->board->id}")->assertNotFound();
        $this->assertNull($this->board->permissionFor($this->invitee));

        // O dono pode convidar de novo depois de uma recusa.
        $this->invite()->assertCreated();
        $this->assertSame(1, BoardInvitation::query()->pending()->count());
    }

    public function test_others_cannot_see_or_answer_someone_elses_invitation(): void
    {
        $invitation = $this->pendingInvitation();

        foreach ([$this->stranger, $this->owner] as $user) {
            Sanctum::actingAs($user);

            $this->getJson("/api/invitations/{$invitation->id}")->assertNotFound();
            $this->postJson("/api/invitations/{$invitation->id}/accept")->assertNotFound();
            $this->postJson("/api/invitations/{$invitation->id}/decline")->assertNotFound();
        }

        $this->assertTrue($invitation->refresh()->isPending());
    }

    public function test_invitation_routes_require_authentication(): void
    {
        $invitation = $this->pendingInvitation();

        $this->getJson('/api/invitations')->assertUnauthorized();
        $this->postJson("/api/invitations/{$invitation->id}/accept")->assertUnauthorized();
    }

    public function test_deleting_board_removes_invitations(): void
    {
        $this->pendingInvitation();

        $this->board->delete();

        $this->assertSame(0, BoardInvitation::count());
    }
}
