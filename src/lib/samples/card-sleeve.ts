import { parseSvg } from "@/lib/import/svg";
import type { ImportResult } from "@/lib/geometry/types";

export const CARD_SLEEVE_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="220mm" height="120mm" viewBox="0 0 220 120">
  <!-- The SVG width is 220 mm. Card-sleeve sample for Leatherme. -->
  <rect id="card-body" data-name="Card Body" x="8" y="8" width="100" height="72" fill="none" stroke="#2a1d14"/>
  <line id="body-fold" x1="8" y1="44" x2="108" y2="44" stroke="#2a1d14"/>
  <rect id="body-stitch" data-name="Body stitch" x="11.5" y="11.5" width="93" height="65" fill="none" stroke="#8b5a2b"/>
  <path id="flap" data-name="Flap" fill="none" stroke="#2a1d14" d="M 120 8 H 214 V 50 L 207 64 H 127 L 120 50 Z"/>
  <rect id="strap" data-name="Strap" x="8" y="90" width="150" height="22" fill="none" stroke="#2a1d14"/>
  <rect id="strap-slot" x="20" y="96" width="24" height="10" fill="none" stroke="#2a1d14"/>
  <rect id="keeper" data-name="Keeper" x="168" y="93" width="40" height="16" fill="none" stroke="#2a1d14"/>
</svg>
`;

export function loadCardSleeveSample(): ImportResult {
  return parseSvg(CARD_SLEEVE_SVG, "card-sleeve.svg");
}

export async function fetchCardSleeveSample(): Promise<ImportResult> {
  const response = await fetch("/samples/card-sleeve.svg");
  if (!response.ok) return loadCardSleeveSample();
  return parseSvg(await response.text(), "card-sleeve.svg");
}
