/**
 * src/lib/utils/contrast.ts
 * Calcul WCAG AA (contraste texte/fond) — utilisé avant sauvegarde de
 * Category.bg_color (brief admin §3). Ratio minimum 4.5:1 (texte normal).
 * Texte de référence : --ls-gray-900 (#111827), couleur des libellés de
 * catégorie sur les cartes storefront (hypothèse — non précisée dans le
 * design system fourni, à confirmer avec l'agent Storefront/Design si le
 * texte sur carte n'est pas toujours gray-900).
 */

const LS_GRAY_900 = "#111827";
const AA_MIN_RATIO = 4.5;

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function getContrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexToRgb(hexA));
  const lumB = relativeLuminance(hexToRgb(hexB));
  const [lighter, darker] = lumA > lumB ? [lumA, lumB] : [lumB, lumA];
  return (lighter + 0.05) / (darker + 0.05);
}

export function validateCategoryBgColor(bgColorHex: string): {
  valid: boolean;
  ratio: number;
  min: number;
} {
  const ratio = getContrastRatio(bgColorHex, LS_GRAY_900);
  return { valid: ratio >= AA_MIN_RATIO, ratio: Math.round(ratio * 100) / 100, min: AA_MIN_RATIO };
}

export function getTextColorOnBg(bgColorHex: string): '#111827' | '#FFFFFF' {
  return getContrastRatio(bgColorHex, '#FFFFFF') >= getContrastRatio(bgColorHex, LS_GRAY_900)
    ? '#FFFFFF'
    : LS_GRAY_900;
}
