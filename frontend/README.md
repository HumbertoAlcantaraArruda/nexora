# Nexora — Frontend

Aplicação web da [Nexora](../README.md), feita em **React 19 + TypeScript** e gerada com **Vite**. Conversa com a API Laravel da pasta [`backend/`](../backend/README.md).

> A documentação completa do projeto — funcionalidades, guia de uso, permissões e API — está no [README principal](../README.md).

## O que fica aqui

| Pasta / arquivo | Conteúdo |
|---|---|
| `src/components/` | Telas e componentes: quadro (`KanbanBoard`, `KanbanColumn`, `TaskCard`), barra lateral, modais, configurações, convites e o campo de busca de usuários (`UserPicker`). |
| `src/services/` | Chamadas à API com Axios (autenticação, quadros, colunas, tarefas, convites e usuários). |
| `src/types/` | Tipos TypeScript compartilhados. |
| `src/navigation.ts` | Navegação pelo hash da URL (`#/`, `#/quadros/ID`, `#/configuracoes`, `#/convites/ID`). |
| `src/App.tsx` | Estrutura principal: sessão, quadros, convites e rotas. |
| `src/App.css` / `src/index.css` | Estilos e as variáveis de cor dos temas claro e escuro. |

Detalhes técnicos:

- **Arrastar e soltar** com a API nativa do HTML5 (sem biblioteca), salvando a nova ordem no servidor e desfazendo na tela se a requisição falhar.
- **Ícones SVG** próprios em `src/components/Icon.tsx` e diálogos de confirmação com **SweetAlert2**.
- O token de login fica no `localStorage` e vai no cabeçalho `Authorization: Bearer` de cada requisição.

## Rodando

Requer **Node.js 20.19+ ou 22.12+**. Com a API rodando, crie o arquivo `.env` nesta pasta:

```dotenv
VITE_API_URL=http://127.0.0.1:8000/api
```

E então:

```bash
npm install
npm run dev        # http://localhost:5173
```

## Scripts

| Comando | Para que serve |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com recarga automática. |
| `npm run build` | Checagem de tipos (TypeScript) e build de produção em `dist/`. |
| `npm run lint` | Análise estática com ESLint. |
| `npm run preview` | Serve localmente o build de `dist/`. |
