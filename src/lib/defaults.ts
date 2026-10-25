import type { StitchSettings } from "@/lib/geometry/types";

export const DEFAULT_SETTINGS: StitchSettings = {
  seamMm: 3.5,
  lineMm: 0.9,
  mode: "solid",
  markLengthMm: 2.5,
  gapMm: 2.5,
  plateHeightMm: 3,
};

export const PLATE_HEIGHT_MIN_MM = 1.6;
export const PLATE_HEIGHT_MAX_MM = 8;
export const SCALE_MIN_PCT = 10;
export const SCALE_MAX_PCT = 400;
export const IMAGE_ASSUMED_WIDTH_MM = 200;
export const BED_SIZE_MM = 200;
export const BED_GAP_MM = 8;
export const GROOVE_DEPTH_MM = 0.8;
export const GUIDE_DISTANCE_MIN_MM = 0.4;
export const GUIDE_DISTANCE_MAX_MM = 12;
