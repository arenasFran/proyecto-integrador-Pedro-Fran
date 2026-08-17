/**
 * Escapa caracteres especiales de regex para usar strings del usuario
 * como texto literal en $regex de MongoDB.
 */
export const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
