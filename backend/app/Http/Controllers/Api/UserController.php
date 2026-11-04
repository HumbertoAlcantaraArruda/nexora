<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    // A busca só começa com este número de caracteres.
    private const MIN_SEARCH = 2;

    private const MAX_RESULTS = 10;

    /**
     * Busca usuários da plataforma pelo nome (ou e-mail), para escolher o
     * responsável de uma tarefa ou convidar alguém para um quadro. Devolve
     * somente nome, e-mail e foto. Sem termo de busca, a lista vem vazia:
     * os usuários não são listados todos de uma vez.
     */
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));

        if (mb_strlen($search) < self::MIN_SEARCH) {
            return response()->json([
                'mensagem' => 'ok',
                'usuarios' => [],
            ]);
        }

        $like = '%'.addcslashes($search, '\\%_').'%';

        $users = User::query()
            ->where(function ($query) use ($like) {
                $query->where('name', 'like', $like)
                    ->orWhere('email', 'like', $like);
            })
            ->orderBy('name')
            ->limit(self::MAX_RESULTS)
            ->get(['id', 'name', 'email', 'avatar_path'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar_url' => $user->avatar_url,
            ]);

        return response()->json([
            'mensagem' => 'ok',
            'usuarios' => $users,
        ]);
    }
}
