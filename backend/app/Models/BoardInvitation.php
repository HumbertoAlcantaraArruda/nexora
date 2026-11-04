<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['board_id', 'inviter_id', 'invitee_id', 'role', 'status', 'responded_at'])]
class BoardInvitation extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_ACCEPTED = 'accepted';

    public const STATUS_DECLINED = 'declined';

    protected function casts(): array
    {
        return [
            'responded_at' => 'datetime',
        ];
    }

    public function board(): BelongsTo
    {
        return $this->belongsTo(Board::class);
    }

    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inviter_id');
    }

    public function invitee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invitee_id');
    }

    public function scopePending(Builder $query): void
    {
        $query->where('status', self::STATUS_PENDING);
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    /**
     * Endereço do convite no frontend (usado no e-mail).
     */
    public function frontendUrl(): string
    {
        return rtrim((string) config('app.frontend_url'), '/').'/#/convites/'.$this->id;
    }

    /**
     * Dados do convite para a API: quadro, quem convidou e quem foi
     * convidado (nome, e-mail e foto).
     *
     * @return array<string, mixed>
     */
    public function toApi(): array
    {
        $this->loadMissing(['board:id,name,description', 'inviter', 'invitee']);

        return [
            'id' => $this->id,
            'role' => $this->role,
            'status' => $this->status,
            'created_at' => $this->created_at?->toISOString(),
            'responded_at' => $this->responded_at?->toISOString(),
            'board' => $this->board ? [
                'id' => $this->board->id,
                'name' => $this->board->name,
                'description' => $this->board->description,
            ] : null,
            'inviter' => self::person($this->inviter),
            'invitee' => self::person($this->invitee),
        ];
    }

    /**
     * @return array{id: int, name: string, email: string, avatar_url: ?string}|null
     */
    private static function person(?User $user): ?array
    {
        return $user ? [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'avatar_url' => $user->avatar_url,
        ] : null;
    }
}
