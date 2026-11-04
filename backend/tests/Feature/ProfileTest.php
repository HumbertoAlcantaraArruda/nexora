<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->user = User::factory()->create([
            'name' => 'Maria Silva',
            'email' => 'maria@example.com',
            'password' => Hash::make('senha-atual'),
        ]);
    }

    public function test_updates_name(): void
    {
        Sanctum::actingAs($this->user);

        $this->patchJson('/api/user', ['name' => 'Maria Souza'])
            ->assertOk()
            ->assertJsonPath('usuario.name', 'Maria Souza')
            ->assertJsonPath('usuario.email', 'maria@example.com');

        $this->assertSame('Maria Souza', $this->user->refresh()->name);
    }

    public function test_rejects_empty_or_long_name(): void
    {
        Sanctum::actingAs($this->user);

        $this->patchJson('/api/user', ['name' => '  '])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');

        $this->patchJson('/api/user', ['name' => str_repeat('a', 256)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');

        $this->assertSame('Maria Silva', $this->user->refresh()->name);
    }

    public function test_changing_email_requires_current_password(): void
    {
        Sanctum::actingAs($this->user);

        $this->patchJson('/api/user', ['email' => 'nova@example.com'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('current_password');

        $this->patchJson('/api/user', [
            'email' => 'nova@example.com',
            'current_password' => 'senha-errada',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('current_password');

        $this->assertSame('maria@example.com', $this->user->refresh()->email);

        $this->patchJson('/api/user', [
            'email' => 'nova@example.com',
            'current_password' => 'senha-atual',
        ])
            ->assertOk()
            ->assertJsonPath('usuario.email', 'nova@example.com');

        $this->assertSame('nova@example.com', $this->user->refresh()->email);
    }

    public function test_keeping_same_email_does_not_require_password(): void
    {
        Sanctum::actingAs($this->user);

        $this->patchJson('/api/user', [
            'name' => 'Maria',
            'email' => 'maria@example.com',
        ])->assertOk();
    }

    public function test_rejects_email_in_use_or_invalid(): void
    {
        User::factory()->create(['email' => 'outro@example.com']);

        Sanctum::actingAs($this->user);

        $this->patchJson('/api/user', [
            'email' => 'outro@example.com',
            'current_password' => 'senha-atual',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->patchJson('/api/user', [
            'email' => 'nao-e-email',
            'current_password' => 'senha-atual',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->assertSame('maria@example.com', $this->user->refresh()->email);
    }

    public function test_uploads_and_replaces_avatar(): void
    {
        Sanctum::actingAs($this->user);

        $first = $this->post('/api/user/avatar', [
            'avatar' => UploadedFile::fake()->image('foto.png', 200, 200),
        ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonMissingPath('usuario.avatar_path');

        $firstPath = $this->user->refresh()->avatar_path;
        Storage::disk('public')->assertExists($firstPath);
        $this->assertStringContainsString($firstPath, $first->json('usuario.avatar_url'));

        $this->post('/api/user/avatar', [
            'avatar' => UploadedFile::fake()->image('nova.jpg', 300, 300),
        ], ['Accept' => 'application/json'])->assertOk();

        $secondPath = $this->user->refresh()->avatar_path;
        $this->assertNotSame($firstPath, $secondPath);
        Storage::disk('public')->assertExists($secondPath);
        Storage::disk('public')->assertMissing($firstPath);
    }

    public function test_rejects_invalid_avatar(): void
    {
        Sanctum::actingAs($this->user);

        $this->post('/api/user/avatar', [
            'avatar' => UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('avatar');

        $this->post('/api/user/avatar', [
            'avatar' => UploadedFile::fake()->image('grande.png', 300, 300)->size(3000),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('avatar');

        $this->assertNull($this->user->refresh()->avatar_path);
    }

    public function test_removes_avatar(): void
    {
        Sanctum::actingAs($this->user);

        $this->post('/api/user/avatar', [
            'avatar' => UploadedFile::fake()->image('foto.png', 200, 200),
        ], ['Accept' => 'application/json'])->assertOk();

        $path = $this->user->refresh()->avatar_path;

        $this->deleteJson('/api/user/avatar')
            ->assertOk()
            ->assertJsonPath('usuario.avatar_url', null);

        $this->assertNull($this->user->refresh()->avatar_path);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_profile_routes_require_authentication(): void
    {
        $this->patchJson('/api/user', ['name' => 'Sem login'])->assertUnauthorized();
        $this->postJson('/api/user/avatar')->assertUnauthorized();
        $this->deleteJson('/api/user/avatar')->assertUnauthorized();

        $this->assertSame('Maria Silva', $this->user->refresh()->name);
    }
}
