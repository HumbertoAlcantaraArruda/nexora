# Nexora

Nexora é um quadro **Kanban** para organizar projetos em colunas e tarefas. Você cria quadros, monta as colunas do seu fluxo (por exemplo "A fazer", "Em andamento" e "Concluído"), cadastra tarefas com prioridade, vencimento e responsável, e move tudo arrastando com o mouse. Os quadros podem ser compartilhados por convite: a pessoa convidada recebe um e-mail e decide se aceita, podendo apenas visualizar ou também editar.

O projeto é dividido em duas partes:

- **`backend/`** — API REST em **Laravel** (PHP), com autenticação por token e banco **MySQL**.
- **`frontend/`** — aplicação web em **React + TypeScript**, gerada com **Vite**.

---

## Sumário

1. [Funcionalidades](#funcionalidades)
2. [Tecnologias](#tecnologias)
3. [Como o projeto funciona](#como-o-projeto-funciona)
4. [Estrutura de pastas](#estrutura-de-pastas)
5. [Requisitos](#requisitos)
6. [Instalação e execução](#instalação-e-execução)
7. [Como usar a ferramenta](#como-usar-a-ferramenta)
8. [Permissões de compartilhamento](#permissões-de-compartilhamento)
9. [API REST](#api-rest)
10. [Testes e qualidade de código](#testes-e-qualidade-de-código)
11. [Build para produção](#build-para-produção)
12. [Solução de problemas](#solução-de-problemas)
13. [Convenção de commits](#convenção-de-commits)

---

## Funcionalidades

- **Contas de usuário**: cadastro (com foto de perfil opcional), login e logout.
- **Quadros**: criar, renomear, descrever e excluir. Cada quadro é identificado pelas iniciais do nome.
- **Colunas**: criar, editar o nome, escolher a cor do ícone (5 cores prontas ou qualquer cor da paleta), reordenar arrastando e excluir.
- **Tarefas**: título, descrição, prioridade (baixa, média, alta), data de vencimento, coluna e **responsável**.
  - A prioridade aparece em destaque no cartão (faixa colorida e selo com barras).
  - Tarefas vencidas mostram a data em vermelho.
  - O responsável aparece no cartão com foto e nome.
- **Arrastar e soltar**: mova tarefas entre colunas, reordene tarefas dentro da mesma coluna e reordene as colunas. Tudo é salvo no servidor; se algo falhar, a tela volta ao estado anterior.
- **Compartilhamento por convite**: o dono de um quadro busca a pessoa pelo nome e envia um convite com a permissão **"Pode visualizar"** ou **"Pode editar"**. A pessoa recebe um **e-mail** e **aceita ou recusa**; o acesso só começa depois de aceitar.
- **Perfil do usuário**: trocar nome, e-mail e foto de perfil. A foto aparece na barra lateral, nos quadros compartilhados e nas tarefas.
- **Tema claro e escuro**, com a escolha lembrada pelo navegador.
- **Barra lateral recolhível**: fica como uma faixa de ícones à esquerda e expande ao clicar.

---

## Tecnologias

### Frontend (`frontend/`)

| Tecnologia | Versão | Para que serve |
|---|---|---|
| [React](https://react.dev) | 19 | Construção da interface em componentes. |
| [TypeScript](https://www.typescriptlang.org) | 5.9 | Tipagem estática do código. |
| [Vite](https://vite.dev) | 8 | Servidor de desenvolvimento e build de produção. |
| [Axios](https://axios-http.com) | 1.x | Requisições HTTP para a API. |
| [SweetAlert2](https://sweetalert2.github.io) | 11 | Diálogos de confirmação (ex.: "Excluir quadro?"). |
| [ESLint](https://eslint.org) | 10 | Análise estática e padronização do código. |
| HTML5 Drag and Drop | nativo | Arrastar tarefas e colunas, sem biblioteca extra. |
| CSS puro | — | Estilos, com variáveis CSS para os temas claro e escuro. |

A fonte usada é a **Plus Jakarta Sans** (Google Fonts) e os ícones são SVGs próprios em `frontend/src/components/Icon.tsx`.

### Backend (`backend/`)

| Tecnologia | Versão | Para que serve |
|---|---|---|
| [PHP](https://www.php.net) | 8.3+ | Linguagem do servidor. |
| [Laravel](https://laravel.com) | 13 | Framework da API: rotas, validação, ORM (Eloquent), migrações. |
| [Laravel Sanctum](https://laravel.com/docs/sanctum) | 4 | Autenticação da API por token Bearer. |
| [PHPUnit](https://phpunit.de) | — | Testes automatizados da API. |

### Banco de dados

| Tecnologia | Versão | Observação |
|---|---|---|
| [MySQL](https://www.mysql.com) | 8.4 | Banco usado no desenvolvimento (tabelas InnoDB). |
| SQLite (em memória) | — | Usado apenas pelos testes automatizados. |

---

## Como o projeto funciona

```text
┌──────────────────────────┐   HTTP + JSON   ┌───────────────────────────┐        ┌──────────┐
│  Frontend (React/Vite)   │ ──────────────► │  Backend (Laravel API)    │ ─────► │  MySQL   │
│  http://localhost:5173   │ ◄────────────── │  http://127.0.0.1:8000/api│ ◄───── │          │
└──────────────────────────┘  token Bearer   └───────────────────────────┘        └──────────┘
                                                        │
                                                        ▼
                                          storage/app/public/avatars
                                          (fotos de perfil, servidas em /storage)
```

1. Ao entrar, o backend devolve um **token** (Laravel Sanctum). O frontend guarda esse token no `localStorage` do navegador e o envia no cabeçalho `Authorization: Bearer <token>` em todas as requisições.
2. O token não expira sozinho: vale até você clicar em **Sair**. Se ele deixar de ser válido, a API responde `401` e o frontend volta para a tela de login.
3. A navegação do frontend usa o **hash** da URL, sem biblioteca de rotas:
   - `#/` — tela "Meus quadros";
   - `#/quadros/ID` — um quadro aberto;
   - `#/configuracoes` — configurações do usuário.

   Assim, recarregar a página mantém a tela atual e o botão "Voltar" do navegador funciona.
4. Toda regra de acesso é conferida **no backend**: quem não tem acesso a um quadro recebe `404` (o quadro "não existe" para ele) e quem só pode visualizar recebe `403` ao tentar alterar algo.

### Modelo de dados

| Tabela | O que guarda |
|---|---|
| `users` | Usuários: nome, e-mail, senha (hash) e caminho da foto. |
| `boards` | Quadros: dono (`user_id`), nome e descrição. |
| `board_user` | Compartilhamento: quem acessa cada quadro e com qual permissão (`viewer` ou `editor`). |
| `board_invitations` | Convites: quadro, quem convidou, quem foi convidado, permissão e situação (`pending`, `accepted` ou `declined`). |
| `board_columns` | Colunas de um quadro: nome, posição e cor. |
| `tasks` | Tarefas de uma coluna: título, descrição, prioridade, vencimento, posição e responsável (`assignee_id`). |

Excluir um quadro apaga suas colunas, tarefas e compartilhamentos. Excluir uma coluna apaga suas tarefas. Se a conta do responsável por uma tarefa for excluída, a tarefa fica sem responsável.

---

## Estrutura de pastas

```text
meu-kanban/
├── backend/                         # API Laravel
│   ├── app/
│   │   ├── Http/Controllers/Api/
│   │   │   ├── AuthController.php        # cadastro, login, logout, usuário atual
│   │   │   ├── ProfileController.php     # nome, e-mail e foto de perfil
│   │   │   ├── BoardController.php       # quadros
│   │   │   ├── BoardMemberController.php # convites e acessos (lado do dono)
│   │   │   ├── InvitationController.php  # convites recebidos: aceitar e recusar
│   │   │   ├── BoardColumnController.php # colunas e reordenação
│   │   │   ├── TaskController.php        # tarefas e reordenação
│   │   │   └── UserController.php        # busca de usuários pelo nome
│   │   ├── Http/Controllers/Concerns/
│   │   │   └── AuthorizesBoardAccess.php # regras de permissão (403)
│   │   ├── Mail/BoardInvitationMail.php  # e-mail de convite
│   │   └── Models/                       # User, Board, BoardColumn, Task, BoardInvitation
│   ├── database/migrations/              # estrutura das tabelas
│   ├── resources/views/mail/             # texto do e-mail de convite
│   ├── routes/api.php                    # rotas da API
│   └── tests/Feature/                    # testes automatizados
├── frontend/                        # Aplicação React
│   ├── public/favicon.ico
│   └── src/
│       ├── components/                   # telas e componentes (KanbanBoard, Sidebar...)
│       ├── services/                     # chamadas à API (Axios)
│       ├── types/                        # tipos TypeScript
│       ├── App.tsx                       # estrutura principal e navegação
│       ├── App.css                       # estilos dos componentes
│       └── index.css                     # cores e variáveis dos temas
└── rules/                           # documentação interna das tarefas do projeto
```

---

## Requisitos

| Ferramenta | Versão mínima |
|---|---|
| PHP | 8.3, com as extensões `pdo_mysql`, `fileinfo` e `gd` (a `gd` é usada nos testes de upload) |
| Composer | 2.x |
| MySQL | 8.x |
| Node.js | 20.19 ou 22.12+ (exigência do Vite 8) |
| npm | 10+ |

> No Windows, o [WampServer](https://www.wampserver.com) já traz PHP e MySQL.

---

## Instalação e execução

Os comandos abaixo partem da raiz do projeto (`meu-kanban/`). Use dois terminais: um para o backend e outro para o frontend.

### 1. Backend (API)

```bash
cd backend

# Dependências PHP
composer install

# Arquivo de configuração
cp .env.example .env       # no PowerShell: Copy-Item .env.example .env
php artisan key:generate
```

Abra o `backend/.env` e configure o banco MySQL e o endereço da API:

```dotenv
APP_NAME=Nexora
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173   # usado no link do e-mail de convite

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=meu_kanban
DB_USERNAME=root
DB_PASSWORD=
```

Crie o banco vazio no MySQL (por exemplo, pelo phpMyAdmin ou pelo terminal):

```sql
CREATE DATABASE meu_kanban CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Depois, crie as tabelas, libere o acesso às fotos de perfil e inicie o servidor:

```bash
php artisan migrate        # cria as tabelas
php artisan storage:link   # publica a pasta das fotos em /storage
php artisan serve          # API em http://127.0.0.1:8000
```

> **Importante:** sem o `php artisan storage:link`, as fotos de perfil são enviadas, mas não aparecem no navegador.

#### Envio de e-mails (convites)

Por padrão (`MAIL_MAILER=log`), os e-mails **não são enviados de verdade**: eles são gravados no arquivo `backend/storage/logs/laravel.log`, onde dá para ler o texto e o link do convite. Isso é prático no desenvolvimento.

Para os convites chegarem à caixa de entrada, configure um servidor SMTP no `backend/.env` (exemplo genérico; use os dados do seu provedor de e-mail):

```dotenv
MAIL_MAILER=smtp
MAIL_HOST=smtp.seuprovedor.com
MAIL_PORT=587
MAIL_USERNAME=seu-usuario
MAIL_PASSWORD=sua-senha
MAIL_FROM_ADDRESS="nao-responda@seudominio.com"
MAIL_FROM_NAME="${APP_NAME}"
```

Depois de alterar o `.env`, reinicie o `php artisan serve`. Se o envio falhar, o convite é criado mesmo assim: a pessoa o encontra ao entrar na Nexora.

### 2. Frontend (aplicação web)

```bash
cd frontend
npm install
```

Crie o arquivo `frontend/.env` apontando para a API:

```dotenv
VITE_API_URL=http://127.0.0.1:8000/api
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Abra **http://localhost:5173** no navegador.

### 3. Atualizando o projeto

Depois de um `git pull`, rode no backend `php artisan migrate` para aplicar migrações novas e, no frontend, `npm install` se o `package.json` tiver mudado.

---

## Como usar a ferramenta

### 1. Criar a conta e entrar

1. Na tela inicial, clique em **"Ainda não tenho uma conta"**.
2. Se quiser, escolha uma **foto de perfil** (opcional; JPG, PNG ou WEBP, até 2 MB) — a prévia aparece na hora. Sem foto, a Nexora mostra as iniciais do seu nome.
3. Informe nome, e-mail e senha (mínimo de 8 caracteres) e confirme a senha.
4. Clique em **Cadastrar**. Você entra direto na tela **Meus quadros**.

Nas próximas vezes, use **Entrar** com o e-mail e a senha.

### 2. A barra lateral

A barra lateral fica sempre visível à esquerda como uma faixa de ícones.

- Clique no **ícone de painel** (no topo) ou em qualquer área vazia da faixa para **expandir** e ver os nomes. Ela empurra o conteúdo para o lado.
- Clique fora dela, aperte **Esc** ou escolha um item para **recolher**.
- Nela você encontra: **Meus quadros**, a lista **Seus quadros**, **Criar novo quadro**, os **Compartilhados comigo**, a chave de **tema claro/escuro**, o seu **usuário** (abre as configurações) e **Sair**.

### 3. Criar e gerenciar quadros

1. Em **Meus quadros**, clique em **Novo quadro** (no topo ou no cartão tracejado).
2. Dê um nome e, se quiser, uma descrição (até 1000 caracteres).
3. Cada cartão de quadro mostra as iniciais, a descrição e a quantidade de colunas e tarefas, além dos botões:
   - **Compartilhar** (ícone de pessoa com +);
   - **Editar** (lápis);
   - **Excluir** (lixeira) — apaga também as colunas e tarefas, após confirmação;
   - **Abrir** (seta).

Dentro de um quadro, as mesmas ações ficam no menu **⋮** no canto superior direito.

### 4. Criar colunas

1. Em um quadro novo, clique em **Nova coluna** no centro da tela. Em quadros que já têm colunas, o botão **+ Nova coluna** fica depois da última coluna.
2. Informe o nome e escolha a **cor do ícone**: uma das 5 cores prontas ou o botão de arco-íris para escolher qualquer cor.
3. Para editar nome e cor, use o **lápis** no cabeçalho da coluna. Para excluir, a **lixeira** (as tarefas da coluna também são apagadas).
4. Para **reordenar colunas**, arraste o cabeçalho da coluna para a nova posição.

### 5. Criar e editar tarefas

1. Clique em **Nova tarefa** no topo do quadro (é preciso ter pelo menos uma coluna).
2. Preencha:
   - **Título** (obrigatório);
   - **Descrição** (opcional);
   - **Prioridade**: baixa, média ou alta;
   - **Vencimento** (opcional);
   - **Responsável** (opcional): **digite o nome** (a partir de 2 letras) e escolha a pessoa nos resultados, que mostram foto, nome e e-mail. Qualquer usuário da plataforma pode ser escolhido. Use o **×** para tirar o responsável. Ser escolhido como responsável **não** dá acesso ao quadro — para isso é preciso convidá-lo;
   - **Coluna** onde a tarefa vai ficar.
3. Clique no cartão de uma tarefa para **editá-la**. No mesmo modal está o botão **Excluir tarefa**.

No cartão você vê a prioridade (faixa colorida à esquerda e selo **BAIXA / MÉDIA / ALTA**), o vencimento (em vermelho quando vencido) e o responsável.

### 6. Mover tarefas

- **Entre colunas**: arraste o cartão e solte na coluna de destino.
- **Na mesma coluna**: arraste para cima ou para baixo; uma linha mostra onde a tarefa vai entrar.
- Também é possível trocar a coluna pelo campo **Coluna** no modal da tarefa (a tarefa vai para o fim da nova coluna).

Enquanto uma alteração está sendo salva, aparece **"Salvando..."** no topo e novas ações ficam bloqueadas por um instante.

### 7. Compartilhar um quadro (convite)

1. No cartão do quadro, clique em **Compartilhar** (ou use **⋮ → Compartilhar** dentro do quadro).
2. Em **Pessoa**, **digite o nome** de quem você quer convidar e escolha a pessoa nos resultados (ela precisa ter conta na Nexora).
3. Escolha a permissão: **Pode visualizar** ou **Pode editar**.
4. Clique em **Enviar convite**. A pessoa recebe um **e-mail** com o botão **Ver convite**.

Na lista **Quem tem acesso**:

- quem ainda não respondeu aparece com o selo **Convite pendente** — use o **×** para cancelar o convite;
- quem já aceitou aparece com a permissão, que pode ser trocada, e o **×** remove o acesso.

Convidar de novo alguém com convite pendente atualiza a permissão e reenvia o e-mail. Depois de uma recusa, é possível convidar outra vez.

### 8. Receber um convite

- Pelo **e-mail**: clique em **Ver convite**. A Nexora abre a página do convite (se você não estiver logado, entre primeiro com a conta que recebeu o convite).
- Pela **Nexora**: os convites aparecem no topo de **Meus quadros**, em **Convites pendentes**, e um número aparece sobre o ícone de **Meus quadros** na barra lateral.

Cada convite mostra quem convidou, o quadro e a permissão, com os botões **Aceitar** e **Recusar**. Ao aceitar, o quadro abre e passa a aparecer em **Compartilhados comigo**. Ao recusar, nada muda — para entrar depois, é preciso um novo convite.

### 9. Quadros compartilhados com você

- Aparecem em **Meus quadros**, na seção **Compartilhados comigo**, e também na barra lateral.
- Cada cartão mostra **"Quadro de: (foto) Nome do dono"** e um selo com a sua permissão (**Somente leitura** ou **Pode editar**).
- Com **Somente leitura**, você vê colunas e tarefas, mas não aparecem botões de criar, editar, excluir ou arrastar; as tarefas abrem em **Detalhes da tarefa**, com os campos travados.
- Para deixar de ver um quadro, use **Sair do quadro** (ícone de saída no cartão ou **⋮ → Sair do quadro**).

### 10. Configurações do usuário

Clique no seu **nome/foto** na barra lateral para abrir as **Configurações**:

- **Foto de perfil**: envie uma imagem JPG, PNG ou WEBP de até 2 MB. Use **Remover** para voltar às iniciais.
- **Nome**: aparece na barra lateral, nos quadros que você compartilha e nas tarefas em que for responsável.
- **E-mail**: é o seu login. Para trocá-lo, confirme a **senha atual**.

### 11. Tema claro e escuro

Use a chave **Tema escuro** na parte de baixo da barra lateral. Na primeira visita, a Nexora segue o tema do sistema operacional; depois, lembra a sua escolha.

---

## Permissões de compartilhamento

| Ação | Dono | Pode editar | Pode visualizar |
|---|:---:|:---:|:---:|
| Ver o quadro, colunas e tarefas | ✅ | ✅ | ✅ |
| Criar, editar, mover e excluir tarefas | ✅ | ✅ | ❌ |
| Criar, editar, reordenar e excluir colunas | ✅ | ✅ | ❌ |
| Renomear ou excluir o quadro | ✅ | ❌ | ❌ |
| Convidar, cancelar convites, mudar permissões e remover acessos | ✅ | ❌ | ❌ |
| Sair do quadro | — | ✅ | ✅ |

---

## API REST

Endereço base em desenvolvimento: `http://127.0.0.1:8000/api`.

Todas as respostas são JSON e trazem o campo `mensagem` (`"ok"` em caso de sucesso) junto com os dados (`usuario`, `quadros`, `quadro`, `coluna`, `tarefa`, `membros`...). Erros de validação retornam `422` com o objeto `errors`, no padrão do Laravel.

### Autenticação

Exceto `register` e `login`, todas as rotas exigem o cabeçalho:

```http
Authorization: Bearer SEU_TOKEN
Accept: application/json
```

Exemplo de login com `curl`:

```bash
curl -X POST http://127.0.0.1:8000/api/login \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"email": "voce@exemplo.com", "password": "sua-senha"}'
```

A resposta traz `usuario` e `token`.

### Rotas

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/register` | Cria uma conta (`name`, `email`, `password`, `password_confirmation` e, opcionalmente, a foto em `avatar` via `multipart/form-data`). |
| `POST` | `/login` | Entra e devolve o token (`email`, `password`). |
| `POST` | `/logout` | Invalida o token atual. |
| `GET` | `/user` | Usuário autenticado. |
| `PATCH` | `/user` | Atualiza `name` e/ou `email` (trocar o e-mail exige `current_password`). |
| `POST` | `/user/avatar` | Envia a foto de perfil (`multipart/form-data`, campo `avatar`). |
| `DELETE` | `/user/avatar` | Remove a foto de perfil. |
| `GET` | `/users?search=nome` | Busca usuários pelo nome ou e-mail (mínimo de 2 letras, até 10 resultados; nome, e-mail e foto). Sem `search`, a lista vem vazia. |
| `GET` | `/invitations` | Convites pendentes recebidos. |
| `GET` | `/invitations/{id}` | Um convite recebido (aberto pelo link do e-mail). |
| `POST` | `/invitations/{id}/accept` | Aceita o convite e passa a acessar o quadro. |
| `POST` | `/invitations/{id}/decline` | Recusa o convite. |
| `GET` | `/boards` | Quadros próprios e compartilhados, com dono, permissão e contagens. |
| `POST` | `/boards` | Cria um quadro (`name`, `description`). |
| `GET` | `/boards/{id}` | Quadro com colunas, tarefas e responsáveis. |
| `PATCH` | `/boards/{id}` | Atualiza nome e descrição (somente o dono). |
| `DELETE` | `/boards/{id}` | Exclui o quadro (somente o dono). |
| `GET` | `/boards/{id}/members` | Pessoas com acesso (`membros`) e convites pendentes (`convites`); somente o dono. |
| `POST` | `/boards/{id}/invitations` | Convida um usuário (`user_id`, `role`: `viewer` ou `editor`) e envia o e-mail. A resposta traz `email_enviado`. |
| `DELETE` | `/boards/{id}/invitations/{invitationId}` | Cancela um convite pendente. |
| `PATCH` | `/boards/{id}/members/{userId}` | Muda a permissão (`role`). |
| `DELETE` | `/boards/{id}/members/{userId}` | Remove o acesso; com o próprio id, sai do quadro. |
| `GET` | `/columns` | Colunas dos quadros acessíveis. |
| `POST` | `/columns` | Cria uma coluna (`board_id`, `name`, `position`, `color` no formato `#rrggbb`). |
| `GET` | `/columns/{id}` | Uma coluna com suas tarefas. |
| `PATCH` | `/columns/{id}` | Atualiza `name`, `color` ou `position`. |
| `PUT` | `/columns/reorder` | Salva a nova ordem (`board_id`, `column_ids` com todas as colunas do quadro). |
| `DELETE` | `/columns/{id}` | Exclui a coluna e suas tarefas. |
| `GET` | `/tasks` | Tarefas dos quadros acessíveis. |
| `POST` | `/tasks` | Cria uma tarefa (`board_column_id`, `title`, `description`, `priority`, `due_date`, `position`, `assignee_id`). |
| `GET` | `/tasks/{id}` | Uma tarefa. |
| `PATCH` | `/tasks/{id}` | Atualiza campos da tarefa, inclusive coluna e responsável. |
| `PUT` | `/tasks/reorder` | Salva a ordem de uma ou mais colunas (`columns: [{ id, task_ids }]`). |
| `DELETE` | `/tasks/{id}` | Exclui a tarefa. |

### Limites de validação

| Campo | Regra |
|---|---|
| Senha | mínimo de 8 caracteres |
| Nome do quadro, coluna, tarefa e usuário | até 255 caracteres |
| Descrição do quadro | até 1000 caracteres |
| Descrição da tarefa | até 5000 caracteres |
| Prioridade | `low`, `medium` ou `high` |
| Cor da coluna | `#rrggbb` |
| Foto de perfil | JPG, PNG ou WEBP, até 2 MB e 4000 × 4000 px |

---

## Testes e qualidade de código

### Backend

```bash
cd backend
php artisan test
```

Os testes ficam em `backend/tests/Feature/` e usam um banco SQLite em memória (não afetam o seu MySQL) e um envio de e-mails simulado. Cobrem quadros, colunas (incluindo cores e reordenação), tarefas (edição, reordenação e responsável), busca de usuários, perfil e foto, convites (enviar, aceitar, recusar, cancelar) e as regras de permissão.

### Frontend

```bash
cd frontend
npm run lint     # ESLint
npm run build    # checagem de tipos (TypeScript) + build
```

---

## Build para produção

### Frontend

```bash
cd frontend
npm run build
```

Os arquivos finais são gerados em `frontend/dist/` e podem ser servidos por qualquer servidor web estático (Apache, Nginx etc.). Lembre-se de definir `VITE_API_URL` com o endereço público da API **antes** do build.

### Backend

No servidor:

```bash
cd backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
```

Configure no `.env` de produção `APP_ENV=production`, `APP_DEBUG=false`, o `APP_URL` público (usado no endereço das fotos de perfil), o `FRONTEND_URL` público (usado no link do e-mail de convite) e o servidor SMTP.

---

## Solução de problemas

| Problema | O que verificar |
|---|---|
| A tela fica em "Carregando..." ou aparece erro de conexão | O backend está rodando (`php artisan serve`)? O `VITE_API_URL` em `frontend/.env` aponta para ele? Depois de mudar o `.env`, reinicie o `npm run dev`. |
| Fotos de perfil não aparecem | Rode `php artisan storage:link` e confira se o `APP_URL` do backend corresponde ao endereço da API. |
| Erro de tabela ou coluna inexistente | Rode `php artisan migrate` no backend. |
| Volto para a tela de login sozinho | O token salvo no navegador deixou de ser válido (por exemplo, o banco foi recriado); entre novamente. |
| "Você tem acesso somente para visualizar este quadro." | Sua permissão é **Pode visualizar**; peça ao dono para mudar para **Pode editar**. |
| A pessoa não aparece na busca ao convidar | Ela precisa ter conta na Nexora. Digite pelo menos 2 letras do nome. Quem já tem acesso ou convite pendente não aparece. |
| O e-mail de convite não chega | Com `MAIL_MAILER=log`, o e-mail fica em `backend/storage/logs/laravel.log`. Para envio real, configure o SMTP (veja [Envio de e-mails](#envio-de-e-mails-convites)). O convite também aparece em **Meus quadros** para quem foi convidado. |
| O link do convite abre o endereço errado | Ajuste `FRONTEND_URL` no `backend/.env`. |
| "Convite não encontrado" ao abrir o link | O convite foi cancelado, ou você entrou com uma conta diferente da que foi convidada. |
| Erro ao rodar `npm run dev` | Confira a versão do Node.js (20.19+ ou 22.12+). |

---

## Convenção de commits

O projeto segue o padrão **Conventional Commits**, em português, descrito em [`rules/convencao-commits-claude.md`](rules/convencao-commits-claude.md):

```text
tipo(escopo): descrição curta
```

Exemplos: `feat(kanban): adiciona criação de tarefas`, `fix(auth): corrige validação do login`, `docs(readme): atualiza instruções de instalação`.
