<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Cor do ícone ao lado do nome da coluna (#rrggbb). Nula nas colunas
     * antigas: o frontend usa a cor padrão pela posição.
     */
    public function up(): void
    {
        Schema::table('board_columns', function (Blueprint $table) {
            $table->string('color', 7)->nullable()->after('position');
        });
    }

    public function down(): void
    {
        Schema::table('board_columns', function (Blueprint $table) {
            $table->dropColumn('color');
        });
    }
};
