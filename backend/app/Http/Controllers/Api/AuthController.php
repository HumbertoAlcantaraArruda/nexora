<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AvatarRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            // Foto de perfil opcional, enviada junto com o cadastro.
            'avatar' => ['nullable', ...AvatarRules::rules()],
        ], [
            'name.required' => 'Informe seu nome.',
            'email.required' => 'Informe seu e-mail.',
            'email.email' => 'Informe um e-mail válido.',
            'email.unique' => 'Este e-mail já está em uso.',
            'password.required' => 'Informe uma senha.',
            'password.min' => 'A senha deve ter pelo menos 8 caracteres.',
            'password.confirmed' => 'As senhas não conferem.',
            ...AvatarRules::messages(),
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
        ]);

        if ($request->hasFile('avatar')) {
            $user->avatar_path = $request->file('avatar')->store(AvatarRules::DIRECTORY, AvatarRules::DISK);
            $user->save();
        }

        $token = $user->createToken('kanban-api')->plainTextToken;

        return response()->json([
            'mensagem' => 'ok',
            'usuario' => $user,
            'token' => $token,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($validated)) {
            throw ValidationException::withMessages([
                'email' => ['As credenciais informadas são inválidas.'],
            ]);
        }

        $user = User::where('email', $validated['email'])->firstOrFail();
        $token = $user->createToken('kanban-api')->plainTextToken;

        return response()->json([
            'mensagem' => 'ok',
            'usuario' => $user,
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'mensagem' => 'ok',
        ]);
    }

    public function user(Request $request): JsonResponse
    {
        return response()->json([
            'mensagem' => 'ok',
            'usuario' => $request->user(),
        ]);
    }
}
