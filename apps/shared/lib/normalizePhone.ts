/**
 * Normaliza un número de teléfono eliminando todos los caracteres no numéricos.
 * Usado para detección de duplicados, prevención de creación y búsqueda manual.
 *
 * @param phone - Número de teléfono crudo (puede tener espacios, guiones, paréntesis, etc.)
 * @returns Solo los dígitos del teléfono, o string vacío si la entrada es nula/indefinida/vacía
 *
 * @example
 * normalizePhone("(809) 555-1234")  // → "8095551234"
 * normalizePhone("809 555 1234")    // → "8095551234"
 * normalizePhone("")                // → ""
 * normalizePhone(null)              // → ""
 * normalizePhone(undefined)         // → ""
 */
export function normalizePhone(phone: string | null | undefined): string {
    if (!phone) return '';
    // Eliminar todo carácter que no sea dígito
    return phone.replace(/\D/g, '');
}
