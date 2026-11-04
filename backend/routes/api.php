<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BoardColumnController;
use App\Http\Controllers\Api\BoardController;
use App\Http\Controllers\Api\BoardMemberController;
use App\Http\Controllers\Api\InvitationController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    // Login
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    // Busca de usuários pelo nome (responsável da tarefa e convites)
    Route::get('/users', [UserController::class, 'index']);

    // Convites recebidos: ver, aceitar e recusar
    Route::get('/invitations', [InvitationController::class, 'index']);
    Route::get('/invitations/{invitation}', [InvitationController::class, 'show']);
    Route::post('/invitations/{invitation}/accept', [InvitationController::class, 'accept']);
    Route::post('/invitations/{invitation}/decline', [InvitationController::class, 'decline']);

    // Configurações do usuário
    Route::patch('/user', [ProfileController::class, 'update']);
    Route::post('/user/avatar', [ProfileController::class, 'updateAvatar']);
    Route::delete('/user/avatar', [ProfileController::class, 'destroyAvatar']);

    // Kanban
    Route::apiResource('boards', BoardController::class);

    // Compartilhamento de quadros: o dono convida (o convidado aceita ou
    // recusa por e-mail), muda permissões e remove acessos.
    Route::get('/boards/{board}/members', [BoardMemberController::class, 'index']);
    Route::post('/boards/{board}/invitations', [BoardMemberController::class, 'invite']);
    Route::delete('/boards/{board}/invitations/{invitation}', [BoardMemberController::class, 'cancelInvitation']);
    Route::patch('/boards/{board}/members/{user}', [BoardMemberController::class, 'update']);
    Route::delete('/boards/{board}/members/{user}', [BoardMemberController::class, 'destroy']);

    // Rotas de reordenação declaradas antes dos apiResource para não serem
    // capturadas por columns/{column} e tasks/{task}.
    Route::put('/columns/reorder', [BoardColumnController::class, 'reorder']);
    Route::apiResource('columns', BoardColumnController::class);

    Route::put('/tasks/reorder', [TaskController::class, 'reorder']);
    Route::apiResource('tasks', TaskController::class);
});
