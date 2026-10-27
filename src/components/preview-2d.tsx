"use client";

import type { Piece, StitchPlan } from "@/lib/geometry/types";
import { closeRing, ringBBox, ringsBBox } from "@/lib/geometry/vec";
import { formatDim } from "@/lib/utils";

function d(ring: { x: number; y: number }[]): string {
  const pts = closeRing(ring);
  if (pts.length === 0) return "";
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(3)} ${p.y.toFixed(3)}`).join(" ") + " Z";
}

export function Preview2D({
  piece,
  plan,
  scalePct,
  unit,
}: {
  piece: Piece | null;
  plan: StitchPlan | null;
  scalePct: number;
  unit: "mm" | "in";
}) {
  if (!piece || !plan) {
    return (
      <div className="flex h-full min-h-56 items-center justify-center text-sm text-muted-foreground">
        Select a piece to preview the cut outline.
      </div>
    );
  }

  const factor = scalePct / 100;
  const outline = piece.outline.map((p) => ({ x: p.x * factor, y: p.y * factor }));
  const holes = piece.holes.map((hole) => hole.map((p) => ({ x: p.x * factor, y: p.y * factor })));
  const box = ringsBBox([outline, ...holes, plan.path]);
  const pad = Math.max(4, Math.max(box.width, box.height) * 0.08);

  return (
    <div className="relative h-full min-h-56">
      <svg
        viewBox={`${box.minX - pad} ${box.minY - pad} ${box.width + pad * 2} ${box.height + pad * 2}`}
        className="h-full w-full"
        role="img"
        aria-label={`2D outline of ${piece.name}`}
      >
        <path d={d(outline)} fill="#c08958" fillOpacity="0.55" stroke="#3b2416" strokeWidth="0.85" />
        {holes.map((hole, i) => (
          <path key={`h-${i}`} d={d(hole)} fill="#f4efe6" stroke="#3b2416" strokeWidth="0.55" />
        ))}
        <path
          d={d(plan.path)}
          fill="none"
          stroke="#6b3a22"
          strokeWidth="0.55"
          strokeDasharray={plan.marks.length ? undefined : "1.8 1.2"}
        />
        {plan.holePaths.map((hole, i) => (
          <path key={`s-${i}`} d={d(hole)} fill="none" stroke="#8b5a2b" strokeWidth="0.4" />
        ))}
        {plan.marks.map((mark, i) => (
          <path key={`m-${i}`} d={d(mark)} fill="#3b2416" />
        ))}
      </svg>
      <div className="pointer-events-none absolute bottom-2 left-3 text-xs text-muted-foreground">
        {formatDim(ringBBox(outline).width, unit, unit === "mm" ? 1 : 3)} ×{" "}
        {formatDim(ringBBox(outline).height, unit, unit === "mm" ? 1 : 3)} cut
      </div>
    </div>
  );
}
