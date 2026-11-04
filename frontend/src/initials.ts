// Até duas iniciais do nome (ex.: "Lançamento da plataforma" -> "LD"), usadas
// nos selos de quadros e no avatar do usuário.
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
