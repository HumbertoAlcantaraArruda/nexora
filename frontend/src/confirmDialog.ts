import Swal from "sweetalert2";

interface ConfirmOptions {
  title: string;
  text?: string;
  // Destaca o "Sim" em vermelho para ações destrutivas (ex.: excluir).
  danger?: boolean;
}

// Diálogo de confirmação padrão do app (SweetAlert2), com os botões
// [Não] [Sim]. Resolve true somente se o usuário clicar em "Sim".
// As cores seguem o tema claro/escuro pelas variáveis CSS (ver App.css).
export async function confirmDialog({
  title,
  text,
  danger = false,
}: ConfirmOptions): Promise<boolean> {
  const result = await Swal.fire({
    title,
    text,
    icon: danger ? "warning" : "question",
    showCancelButton: true,
    cancelButtonText: "Não",
    confirmButtonText: "Sim",
    // Ordem dos botões: [Não] [Sim].
    reverseButtons: true,
    // Foco no "Não": Enter acidental não confirma uma exclusão.
    focusCancel: true,
    buttonsStyling: false,
    customClass: {
      popup: "swal-popup",
      title: "swal-title",
      htmlContainer: "swal-text",
      actions: "swal-actions",
      cancelButton: "button button-secondary",
      confirmButton: danger ? "button button-danger" : "button button-primary",
    },
  });

  return result.isConfirmed;
}
