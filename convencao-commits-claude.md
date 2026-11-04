# Padrão de Commits — Conventional Commits

## Objetivo

Padronizar as mensagens de commit para manter o histórico do Git claro, consistente e fácil de consultar.

## Formato

Use a estrutura:

```text
tipo(escopo): descrição curta
```

- **tipo**: categoria da alteração.
- **escopo** (opcional): área do sistema afetada, como `api`, `auth`, `kanban` ou `components`.
- **descrição**: resumo objetivo do que foi feito.

Exemplos:

```text
feat(kanban): adiciona criação de tarefas
fix(auth): corrige validação do login
docs(readme): atualiza instruções de instalação
```

## Tipos principais

| Tipo | Quando usar | Exemplo |
|---|---|---|
| `feat` | Adicionar uma nova funcionalidade | `feat(kanban): adiciona filtro de tarefas` |
| `fix` | Corrigir um bug ou comportamento incorreto | `fix(auth): corrige erro no login` |
| `docs` | Alterar documentação | `docs(readme): documenta instalação do projeto` |
| `style` | Alterar formatação sem mudar a lógica, como espaços, indentação ou ponto e vírgula | `style(components): ajusta indentação` |
| `refactor` | Reorganizar ou melhorar o código sem adicionar funcionalidade nem corrigir diretamente um bug | `refactor(auth): simplifica lógica de autenticação` |
| `perf` | Melhorar o desempenho | `perf(api): otimiza consulta de tarefas` |
| `test` | Adicionar ou modificar testes | `test(auth): adiciona testes de autenticação` |
| `build` | Alterar sistema de build, empacotamento ou dependências que afetam o processo de build | `build: atualiza dependências do projeto` |
| `ci` | Alterar pipelines e configurações de integração/entrega contínua | `ci: configura pipeline do GitHub Actions` |
| `chore` | Tarefas de manutenção que não se encaixam nos tipos anteriores | `chore: atualiza configuração do ESLint` |
| `revert` | Reverter um commit anterior | `revert: reverte alteração no cadastro` |

## Tipos adicionais opcionais

Os tipos abaixo são convenções que algumas equipes usam, mas não fazem parte dos tipos principais definidos pela especificação Conventional Commits. Só os utilize se o projeto ou a equipe adotar essas convenções.

- `hotfix`: correção urgente em produção.
- `init`: inicialização do projeto.
- `deps`: atualização de dependências.
- `security`: alteração ou correção relacionada à segurança.
- `release`: preparação ou publicação de uma versão.
- `config`: alteração de configuração.
- `wip`: trabalho ainda em andamento. Evite em históricos compartilhados ou commits finais.

## Regras para escrever commits

1. Use o tipo em letras minúsculas.
2. Escreva uma descrição curta, objetiva e específica.
3. Prefira verbos no presente, descrevendo a alteração: `adiciona`, `corrige`, `remove`, `atualiza`, `simplifica`.
4. Evite mensagens vagas, como `alterações`, `ajustes`, `correções` ou `update`.
5. Use o escopo quando ajudar a identificar a área afetada. O escopo é opcional.
6. Não use `feat` para uma simples correção; use `fix`.
7. Não use `refactor` quando a mudança realmente adicionar funcionalidade ou corrigir um bug de forma direta.
8. Não crie tipos novos sem necessidade. Prefira os tipos principais, a menos que o projeto tenha uma convenção documentada.
9. Cada commit deve, sempre que possível, representar uma alteração lógica e coerente.

## Breaking changes

Quando uma alteração quebra compatibilidade com versões anteriores, adicione `!` após o tipo ou o escopo:

```text
feat(api)!: altera o formato das respostas
```

Também é possível explicar a quebra no corpo do commit com `BREAKING CHANGE:`:

```text
feat(api): altera o formato das respostas

BREAKING CHANGE: os endpoints agora retornam os dados em uma estrutura diferente.
```

## Exemplos por situação

```text
feat(kanban): adiciona movimentação de cartões
fix(api): corrige tratamento de erros
docs(readme): atualiza instruções de instalação
style(components): padroniza a formatação
refactor(services): reduz duplicação de código
perf(database): otimiza consulta de tarefas
test(auth): adiciona testes para autenticação
build: atualiza dependências do projeto
ci: ajusta workflow de testes
chore: atualiza configuração do ESLint
revert: reverte alteração no cadastro
```

## Instruções para o Claude

Ao sugerir ou criar mensagens de commit para este projeto:

- Siga o formato `tipo(escopo): descrição curta`.
- Escolha o tipo que melhor representa a alteração real.
- Use somente os tipos principais, salvo se o projeto já adotar explicitamente algum tipo adicional.
- Não invente mudanças que não estejam presentes no diff.
- Seja específico e conciso.
- Se houver mudanças de categorias diferentes, sugira separar em commits distintos quando isso fizer sentido.
- Ao receber um pedido para criar uma mensagem de commit, analise as alterações disponíveis e retorne a mensagem pronta para copiar, sem explicações desnecessárias.
- Não execute `git commit` nem altere o histórico do Git sem autorização explícita.

## Referência oficial

[Conventional Commits 1.0.0 — Português](https://www.conventionalcommits.org/pt-br/v1.0.0/)
