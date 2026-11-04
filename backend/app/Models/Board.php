<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

#[Fillable(['name', 'description', 'user_id'])]
class Board extends Model
{
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function columns(): HasMany
    {
        return $this->hasMany(BoardColumn::class);
    }

    public function tasks(): HasManyThrough
    {
        return $this->hasManyThrough(Task::class, BoardColumn::class);
    }
}