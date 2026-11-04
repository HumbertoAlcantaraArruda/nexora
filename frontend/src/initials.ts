// Primeira letra ou número de uma palavra, ignorando símbolos
// (ex.: "[tmp]" -> "T", "#2" -> "2").
const FIRST_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

// Até duas iniciais do nome (ex.: "Lançamento da plataforma" -> "LD",
// "[tmp] Quadro de teste" -> "TQ"), usadas nos selos de quadros e no avatar
// do usuário. Palavras só com símbolos são puladas.
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((word) => FIRST_LETTER_OR_DIGIT.exec(word)?.[0])
    .filter((letter): letter is string => Boolean(letter))
    .slice(0, 2)
    .map((letter) => letter.toUpperCase())
    .join("");
}
