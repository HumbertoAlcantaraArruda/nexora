<?php

namespace App\Support;

/**
 * Regras da foto de perfil, usadas no cadastro e nas configurações do
 * usuário: JPG, PNG ou WEBP, até 2 MB e 4000 × 4000 pixels.
 */
final class AvatarRules
{
    // Disco onde as fotos ficam (servidas em /storage após storage:link).
    public const DISK = 'public';

    public const DIRECTORY = 'avatars';

    /**
     * @return list<string>
     */
    public static function rules(): array
    {
        return [
            'file',
            'image',
            'mimes:jpg,jpeg,png,webp',
            'max:2048',
            'dimensions:max_width=4000,max_height=4000',
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function messages(string $field = 'avatar'): array
    {
        return [
            "{$field}.file" => 'Envie uma imagem.',
            "{$field}.image" => 'Envie uma imagem.',
            "{$field}.mimes" => 'A foto deve ser JPG, PNG ou WEBP.',
            "{$field}.max" => 'A foto deve ter no máximo 2 MB.',
            "{$field}.dimensions" => 'A foto deve ter no máximo 4000 × 4000 pixels.',
            "{$field}.uploaded" => 'Não foi possível enviar a foto. Tente outra imagem.',
        ];
    }
}
