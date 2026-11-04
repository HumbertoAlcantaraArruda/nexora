<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'board_column_id',
    'assignee_id',
    'title',
    'description',
    'priority',
    'due_date',
    'position',
])]
class Task extends Model
{
    // Dados do responsável exibidos na API: nome, e-mail e foto.
    public const ASSIGNEE_COLUMNS = 'assignee:id,name,email,avatar_path';

    public function column(): BelongsTo
    {
        return $this->belongsTo(BoardColumn::class, 'board_column_id');
    }

    /**
     * Responsável pela tarefa (opcional).
     */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }
}
