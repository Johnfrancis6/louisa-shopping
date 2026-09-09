/**
 * Calcule la couleur de texte/icône (noir ou blanc) offrant le meilleur contraste
 * sur un fond `bg_color` donné, selon la formule de luminance relative WCAG.
 *
 * Exigence du brief DB : le contraste doit être recalculé côté storefront au rendu,
 * pas seulement validé côté Admin avant sauvegarde (bg_color peut être modifié après coup).
 */
export function getTextColorOnBg(bgColor: string): '#FFFFFF' | '#111827' {
  const { r, g, b } = hexToRgb(bgColor)

  const toLinear = (channel: number) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }

  const luminance =
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)

  const contrastWithWhite = (1.05) / (luminance + 0.05)
  const contrastWithBlack = (luminance + 0.05) / 0.05

  // ls-gray-900 (#111827) plutôt que du noir pur, cohérent avec le design system
  return contrastWithBlack >= contrastWithWhite ? '#111827' : '#FFFFFF'
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '')
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized

  const int = parseInt(full, 16)
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  }
}