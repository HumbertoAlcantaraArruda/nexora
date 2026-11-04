<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class RegisterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
    }

    /**
     * @return array<string, mixed>
     */
    private function data(array $extra = []): array
    {
        return [
            'name' => 'Maria Silva',
            'email' => 'maria@example.com',
            'password' => 'senha-forte',
            'password_confirmation' => 'senha-forte',
            ...$extra,
        ];
    }

    public function test_registers_without_photo(): void
    {
        $this->postJson('/api/register', $this->data())
            ->assertCreated()
            ->assertJsonPath('usuario.name', 'Maria Silva')
            ->assertJsonPath('usuario.avatar_url', null)
            ->assertJsonStructure(['token']);
    }

    public function test_registers_with_photo(): void
    {
        $response = $this->post('/api/register', $this->data([
            'avatar' => UploadedFile::fake()->image('foto.png', 300, 300),
        ]), ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonMissingPath('usuario.avatar_path');

        $user = User::where('email', 'maria@example.com')->firstOrFail();

        $this->assertNotNull($user->avatar_path);
        Storage::disk('public')->assertExists($user->avatar_path);
        $this->assertStringContainsString($user->avatar_path, $response->json('usuario.avatar_url'));
    }

    public function test_invalid_photo_creates_no_account(): void
    {
        $this->post('/api/register', $this->data([
            'avatar' => UploadedFile::fake()->create('documento.pdf', 100, 'application/pdf'),
        ]), ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['avatar' => 'A foto deve ser JPG, PNG ou WEBP.']);

        $this->post('/api/register', $this->data([
            'avatar' => UploadedFile::fake()->image('grande.png', 300, 300)->size(3000),
        ]), ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['avatar' => 'A foto deve ter no máximo 2 MB.']);

        $this->assertSame(0, User::count());
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_validation_messages_are_in_portuguese(): void
    {
        User::factory()->create(['email' => 'maria@example.com']);

        $this->postJson('/api/register', $this->data(['password_confirmation' => 'outra-senha']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'email' => 'Este e-mail já está em uso.',
                'password' => 'As senhas não conferem.',
            ]);
    }
}
