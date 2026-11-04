<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Board;
use App\Models\User;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Regras de acesso compartilhadas por quadros, colunas e tarefas.
 *
 * Quem não tem acesso ao quadro recebe 404 (o quadro "não existe" para ele).
 * Quem tem acesso só para visualizar recebe 403 ao tentar alterar.
 */
trait AuthorizesBoardAccess
{
    protected function ensureCanEdit(Board $board, User $user): void
    {
        if (! $board->canEdit($user)) {
            throw new HttpException(403, 'Você tem acesso somente para visualizar este quadro.');
        }
    }

    protected function ensureIsOwner(Board $board, User $user): void
    {
        if ($board->user_id !== $user->id) {
            throw new HttpException(403, 'Somente o dono do quadro pode fazer isso.');
        }
    }
}
