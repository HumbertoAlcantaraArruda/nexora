# Nexora — Backend (API)

API REST da [Nexora](../README.md), feita em **Laravel 13** (PHP 8.3+) com autenticação por token via **Laravel Sanctum** e banco **MySQL**.

> A documentação completa do projeto — funcionalidades, guia de uso, permissões e todas as rotas — está no [README principal](../README.md).

## O que fica aqui

| Pasta | Conteúdo |
|---|---|
| `app/Http/Controllers/Api/` | Controllers da API: autenticação, perfil, quadros, colunas, tarefas, convites e busca de usuários. |
| `app/Http/Controllers/Concerns/` | Regras de permissão compartilhadas (dono, pode editar, pode visualizar). |
| `app/Models/` | `User`, `Board`, `BoardColumn`, `Task` e `BoardInvitation`. |
| `app/Mail/` e `resources/views/mail/` | E-mail de convite para um quadro. |
| `app/Support/` | Regras da foto de perfil, usadas no cadastro e nas configurações. |
| `database/migrations/` | Estrutura das tabelas. |
| `routes/api.php` | Rotas da API (todas com o prefixo `/api`). |
| `tests/Feature/` | Testes automatizados da API. |

## Rodando

```bash
composer install
cp .env.example .env          # no PowerShell: Copy-Item .env.example .env
php artisan key:generate
```

Configure o banco MySQL, o `APP_URL` e o `FRONTEND_URL` no `.env` (veja o [README principal](../README.md#1-backend-api)) e então:

```bash
php artisan migrate        # cria as tabelas
php artisan storage:link   # publica as fotos de perfil em /storage
php artisan serve          # API em http://127.0.0.1:8000/api
```

Por padrão, os e-mails (convites) são gravados em `storage/logs/laravel.log` em vez de enviados. Para envio real, configure o SMTP — veja [Envio de e-mails](../README.md#envio-de-e-mails-convites).

## Testes

```bash
php artisan test
```

Os testes usam SQLite em memória e envio de e-mails simulado, então não alteram o seu banco MySQL.

## Comandos úteis

| Comando | Para que serve |
|---|---|
| `php artisan route:list --path=api` | Lista as rotas da API. |
| `php artisan migrate:status` | Mostra quais migrações já rodaram. |
| `php artisan tinker` | Console interativo para consultar os dados. |
