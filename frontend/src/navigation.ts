// Navegação simples por hash, sem biblioteca de rotas:
//   #/            -> tela "Meus quadros"
//   #/quadros/ID  -> kanban do quadro ID
//   #/configuracoes -> configurações do usuário
// Mantém o quadro aberto ao recarregar a página e permite usar o botão
// "Voltar" do navegador.

const BOARD_HASH = /^#\/quadros\/(\d+)$/;
const SETTINGS_HASH = "#/configuracoes";

export function isSettingsHash(): boolean {
  return window.location.hash === SETTINGS_HASH;
}

export function goToSettings() {
  window.location.hash = SETTINGS_HASH.slice(1);
}

export function getBoardIdFromHash(): number | null {
  const match = BOARD_HASH.exec(window.location.hash);
  return match ? Number(match[1]) : null;
}

export function goToBoard(boardId: number) {
  window.location.hash = `/quadros/${boardId}`;
}

export function goToBoardList() {
  if (window.location.hash && window.location.hash !== "#/") {
    window.location.hash = "/";
  }
}
