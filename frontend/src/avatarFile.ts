// Regras da foto de perfil no frontend (o backend valida de novo):
// JPG, PNG ou WEBP, até 2 MB.

export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const AVATAR_ACCEPT = AVATAR_TYPES.join(",");
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

// Mensagem de erro para o arquivo escolhido, ou "" se ele for válido.
export function validateAvatarFile(file: File): string {
  if (!AVATAR_TYPES.includes(file.type)) {
    return "A foto deve ser JPG, PNG ou WEBP.";
  }

  if (file.size > AVATAR_MAX_BYTES) {
    return "A foto deve ter no máximo 2 MB.";
  }

  return "";
}
