export type LengthUnit = "mm" | "cm" | "in" | "pt" | "px" | "pc" | "m" | null;

export type ParsedLength = {
  value: number;
  unit: LengthUnit;
  raw: string;
};

const LENGTH_RE = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s*(mm|cm|in|pt|px|pc|m)?$/i;

export function parseLength(raw: string | null | undefined): ParsedLength | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const match = trimmed.match(LENGTH_RE);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  const unit = match[2] ? (match[2].toLowerCase() as Exclude<LengthUnit, null>) : null;
  return { value, unit, raw: trimmed };
}

export function lengthToMm(parsed: ParsedLength, pxAsPoints = true): number {
  switch (parsed.unit) {
    case "mm":
      return parsed.value;
    case "cm":
      return parsed.value * 10;
    case "m":
      return parsed.value * 1000;
    case "in":
      return parsed.value * 25.4;
    case "pt":
      return parsed.value * (25.4 / 72);
    case "pc":
      return parsed.value * 12 * (25.4 / 72);
    case "px":
      return pxAsPoints ? parsed.value * (25.4 / 72) : parsed.value * (25.4 / 96);
    case null:
      return parsed.value;
    default:
      return parsed.value;
  }
}

export const INSUNITS_TO_MM: Record<number, number | null> = {
  0: null,
  1: 25.4,
  2: 25.4 * 12,
  3: 25.4 * 5280,
  4: 1,
  5: 10,
  6: 1000,
  7: 0.0000254,
  8: 0.0254,
  9: 0.0000000254,
  10: 914.4,
  11: 0.000000001,
  12: 0.000001,
  13: 0.001,
  14: 10000,
  15: 1000000,
};

export function dxfUnitScaleMm(insunits: number | null, measurement: number | null): {
  scale: number;
  usedMeasurement: boolean;
} {
  if (insunits != null && INSUNITS_TO_MM[insunits] != null) {
    return { scale: INSUNITS_TO_MM[insunits] as number, usedMeasurement: false };
  }
  if (measurement === 0) return { scale: 25.4, usedMeasurement: true };
  return { scale: 1, usedMeasurement: insunits === 0 || insunits == null };
}
