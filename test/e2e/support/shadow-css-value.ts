// CSSOM が保持する黒の色空間表記だけを揃え、alpha と影の形状はそのまま比較する。
export const normalizeBlackShadowSerialization = (value: string): string =>
  value.replace(/(^|[\s,])lab\(0 0 0(?=\)| \/ )/gu, '$1oklch(0 0 0');
