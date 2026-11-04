<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BoardColumnController;
use App\Http\Controllers\Api\BoardController;
use App\Http\Controllers\Api\TaskController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    // Login
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    // Kanban
    Route::apiResource('boards', BoardController::class);
    // Rotas de reordenação declaradas antes dos apiResource para não serem
    // capturadas por columns/{column} e tasks/{task}.
    Route::put('/columns/reorder', [BoardColumnController::class, 'reorder']);
    Route::apiResource('columns', BoardColumnController::class);

    Route::put('/tasks/reorder', [TaskController::class, 'reorder']);
    Route::apiResource('tasks', TaskController::class);
});
