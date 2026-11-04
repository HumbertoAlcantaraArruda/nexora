<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

#[Fillable(['name', 'description', 'user_id'])]
class Board extends Model
{
    // Permissões de quem acessa o quadro.
    public const ROLE_OWNER = 'owner';

    public const ROLE_EDITOR = 'editor';

    public const ROLE_VIEWER = 'viewer';

    // Permissões que o dono pode conceder ao compartilhar.
    public const SHARE_ROLES = [self::ROLE_VIEWER, self::ROLE_EDITOR];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Dono do quadro (mesmo vínculo de user(), com nome mais claro na API).
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Usuários com quem o quadro foi compartilhado (sem o dono).
     */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'board_user')
            ->withPivot('role')
            ->withTimestamps();
    }

    public function columns(): HasMany
    {
        return $this->hasMany(BoardColumn::class);
    }

    public function tasks(): HasManyThrough
    {
        return $this->hasManyThrough(Task::class, BoardColumn::class);
    }

    /**
     * Quadros que o usuário pode abrir: os dele e os compartilhados com ele.
     */
    public function scopeAccessibleBy(Builder $query, User $user): void
    {
        $query->where(function (Builder $query) use ($user) {
            $query->where('boards.user_id', $user->id)
                ->orWhereHas('members', function (Builder $members) use ($user) {
                    $members->where('users.id', $user->id);
                });
        });
    }

    /**
     * Quadros em que o usuário pode alterar colunas e tarefas.
     */
    public function scopeEditableBy(Builder $query, User $user): void
    {
        $query->where(function (Builder $query) use ($user) {
            $query->where('boards.user_id', $user->id)
                ->orWhereHas('members', function (Builder $members) use ($user) {
                    $members->where('users.id', $user->id)
                        ->where('board_user.role', self::ROLE_EDITOR);
                });
        });
    }

    /**
     * Permissão do usuário neste quadro: owner, editor, viewer ou null.
     */
    public function permissionFor(User $user): ?string
    {
        if ($this->user_id === $user->id) {
            return self::ROLE_OWNER;
        }

        $member = $this->relationLoaded('members')
            ? $this->members->firstWhere('id', $user->id)
            : $this->members()->where('users.id', $user->id)->first();

        return $member?->pivot->role;
    }

    public function canEdit(User $user): bool
    {
        return in_array(
            $this->permissionFor($user),
            [self::ROLE_OWNER, self::ROLE_EDITOR],
            true,
        );
    }

    /**
     * Prepara o quadro para a resposta da API: dono (nome e foto) e a
     * permissão de quem está consultando.
     */
    public function presentFor(User $user): static
    {
        $this->loadMissing('owner:id,name,avatar_path');
        $this->setAttribute('permission', $this->permissionFor($user));
        $this->makeHidden('members');

        return $this;
    }
}
