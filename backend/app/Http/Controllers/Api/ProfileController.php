<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\AvatarRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Configurações do usuário autenticado: nome, e-mail e foto de perfil.
 */
class ProfileController extends Controller
{
    private const AVATAR_DISK = AvatarRules::DISK;

    /**
     * Atualiza nome e/ou e-mail. Trocar o e-mail (que é o login) exige a
     * senha atual.
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'current_password' => ['nullable', 'string'],
        ], [
            'email.unique' => 'Este e-mail já está em uso.',
        ]);

        $emailChanged = array_key_exists('email', $validated)
            && $validated['email'] !== $user->email;

        if ($emailChanged && ! Hash::check((string) ($validated['current_password'] ?? ''), $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => 'Senha atual incorreta.',
            ]);
        }

        unset($validated['current_password']);

        $user->fill($validated);

        if ($emailChanged) {
            $user->email_verified_at = null;
        }

        $user->save();

        return response()->json([
            'mensagem' => 'ok',
            'usuario' => $user->refresh(),
        ]);
    }

    /**
     * Envia (ou substitui) a foto de perfil.
     */
    public function updateAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => ['required', ...AvatarRules::rules()],
        ], AvatarRules::messages());

        $user = $request->user();
        $previous = $user->avatar_path;

        $user->avatar_path = $request->file('avatar')->store(AvatarRules::DIRECTORY, self::AVATAR_DISK);
        $user->save();

        if ($previous) {
            Storage::disk(self::AVATAR_DISK)->delete($previous);
        }

        return response()->json([
            'mensagem' => 'ok',
            'usuario' => $user->refresh(),
        ]);
    }

    /**
     * Remove a foto de perfil (volta a exibir as iniciais).
     */
    public function destroyAvatar(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->avatar_path) {
            Storage::disk(self::AVATAR_DISK)->delete($user->avatar_path);
            $user->avatar_path = null;
            $user->save();
        }

        return response()->json([
            'mensagem' => 'ok',
            'usuario' => $user->refresh(),
        ]);
    }
}
