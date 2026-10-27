export type Point = { x: number; y: number };

export type Ring = Point[];

export type FillRule = "evenodd" | "nonzero";

export type RawPath = {
  id?: string;
  name?: string;
  closed: boolean;
  rings: Ring[];
  fillRule: FillRule;
  filled: boolean;
};

export type Piece = {
  id: string;
  name: string;
  outline: Ring;
  holes: Ring[];
  included: boolean;
};

export type ScaleNoteKind =
  | "illustrator-px"
  | "unitless-svg"
  | "pdf-page"
  | "image-assumed"
  | "dxf-measurement"
  | "file-note"
  | "info";

export type ScaleNote = {
  kind: ScaleNoteKind;
  message: string;
};

export type ImportResult = {
  sourceName: string;
  pieces: Piece[];
  drawingWidthMm: number;
  drawingHeightMm: number;
  notes: ScaleNote[];
  needsWidthConfirm: boolean;
  scaleTrusted: boolean;
};

export type StitchMode = "solid" | "marks";

export type StitchSettings = {
  seamMm: number;
  lineMm: number;
  mode: StitchMode;
  markLengthMm: number;
  gapMm: number;
  plateHeightMm: number;
};

export type WorkbenchSettings = StitchSettings & {
  scalePct: number;
  drawingWidthMm: number;
  unit: "mm" | "in";
};

export type StitchPlan = {
  path: Ring;
  holePaths: Ring[];
  marks: Ring[];
  markCount: number;
  pitchMm: number;
  actualGapMm: number;
};

export type TriangleMesh = {
  vertices: [number, number, number][];
  faces: [number, number, number][];
};

export type BBox = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};
