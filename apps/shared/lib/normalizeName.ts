/**
 * Normaliza un nombre para comparación insensible a acentos, mayúsculas y formato.
 * Usado para detección de duplicados, prevención de creación y búsqueda manual.
 *
 * Transformaciones aplicadas:
 * 1. Descomposición Unicode NFKD (separa letras de sus acentos/diacríticos)
 * 2. Elimina marcas diacríticas de combinación (acentos, diéresis, etc.)
 * 3. Convierte a minúsculas
 * 4. Elimina espacios al inicio y final (trim)
 * 5. Colapsa múltiples espacios en uno solo
 * 6. Elimina puntuación común: . , ; : - _
 *
 * @param name - Nombre crudo (puede tener acentos, mayúsculas, espacios extra, puntuación)
 * @returns Nombre normalizado, o string vacío si la entrada es nula/indefinida/vacía
 *
 * @example
 * normalizeName("  María  José-Rodríguez. ")  // → "maria jose rodriguez"
 * normalizeName("Juan Pérez")                   // → "juan perez"
 * normalizeName("JUAN")                         // → "juan"
 * normalizeName("")                             // → ""
 * normalizeName(null)                           // → ""
 */
export function normalizeName(name: string | null | undefined): string {
    if (!name) return '';

    // 1. Descomposición Unicode NFKD: separa letras base de diacríticos
    // 2. Elimina marcas diacríticas de combinación (categoría Unicode "M")
    // 3. Convierte a minúsculas
    const normalized = name
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')           // Colapsar espacios múltiples
        .replace(/[.,;:\-_]/g, '')      // Eliminar puntuación común
        .replace(/\s+/g, ' ')           // Re-colapsar espacios tras eliminar puntuación
        .trim();

    return normalized;
}
