import { inflate as pakoInflate } from "pako";
import { classifyPieces } from "@/lib/geometry/classify";
import type { ImportResult, Point, RawPath, Ring, ScaleNote } from "@/lib/geometry/types";

const PT_TO_MM = 25.4 / 72;

export async function parsePdf(data: ArrayBuffer, sourceName = "pattern.pdf"): Promise<ImportResult> {
  const bytes = new Uint8Array(data);
  const text = decodeLatin1(bytes);
  const notes: ScaleNote[] = [
    {
      kind: "pdf-page",
      message:
        "This PDF is read at 72 points per inch. A fit-to-page pattern may be the wrong size.",
    },
  ];

  const media = text.match(/\/MediaBox\s*\[\s*([^\]]+)\]/);
  let pageWidthPt = 612;
  let pageHeightPt = 792;
  if (media) {
    const nums = media[1].trim().split(/[\s]+/).map(Number).filter((n) => Number.isFinite(n));
    if (nums.length >= 4) {
      pageWidthPt = nums[2] - nums[0];
      pageHeightPt = nums[3] - nums[1];
    }
  }

  const streams = extractStreams(bytes, text);
  const paths = streams.flatMap((stream) => extractPdfPaths(stream));
  const scale = PT_TO_MM;
  const mapped = paths.map((path) => ({
    ...path,
    rings: path.rings.map((ring) =>
      ring.map((p) => ({ x: p.x * scale, y: (pageHeightPt - p.y) * scale })),
    ),
  }));

  const pieces = classifyPieces(mapped);
  if (pieces.length === 0) {
    throw new Error(
      "No closed vector outlines were found in this PDF. Export the pattern as SVG or a vector PDF.",
    );
  }

  return {
    sourceName,
    pieces,
    drawingWidthMm: pageWidthPt * scale,
    drawingHeightMm: pageHeightPt * scale,
    notes,
    needsWidthConfirm: true,
    scaleTrusted: false,
  };
}

function decodeLatin1(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

function extractStreams(bytes: Uint8Array, text: string): string[] {
  const streams: string[] = [];
  const re = /stream\r?\n/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const start = match.index + match[0].length;
    const end = text.indexOf("endstream", start);
    if (end < 0) continue;
    const header = text.slice(Math.max(0, match.index - 400), match.index);
    const raw = bytes.slice(start, end);
    if (/\/FlateDecode/.test(header)) {
      try {
        streams.push(inflate(raw));
      } catch {
        // ignore compressed streams we cannot read
      }
    } else {
      streams.push(decodeLatin1(raw));
    }
  }
  return streams;
}

function inflate(raw: Uint8Array): string {
  const trimmed =
    raw[raw.length - 1] === 0x0d || raw[raw.length - 1] === 0x0a
      ? raw.slice(0, raw.length - (raw[raw.length - 2] === 0x0d ? 2 : 1))
      : raw;
  return new TextDecoder("latin1").decode(pakoInflate(trimmed));
}

function extractPdfPaths(content: string): RawPath[] {
  const tokens = content
    .replace(/(\d)\(/g, "$1 (")
    .split(/[\s]+/)
    .filter(Boolean);
  const paths: RawPath[] = [];
  let ctm: [number, number, number, number, number, number] = [1, 0, 0, 1, 0, 0];
  const stack: typeof ctm[] = [];
  let ring: Point[] = [];
  let rings: Ring[] = [];
  let current = { x: 0, y: 0 };
  let start = { x: 0, y: 0 };

  const apply = (x: number, y: number): Point => ({
    x: ctm[0] * x + ctm[2] * y + ctm[4],
    y: ctm[1] * x + ctm[3] * y + ctm[5],
  });

  const flush = (closed: boolean, filled: boolean) => {
    if (ring.length >= 2) rings.push(ring);
    if (rings.length) {
      paths.push({
        rings,
        closed: closed || rings.every((r) => r.length >= 3),
        filled,
        fillRule: "nonzero",
      });
    }
    ring = [];
    rings = [];
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const n = (k: number) => Number(tokens[i - k]);
    if (t === "q") stack.push(ctm.slice() as typeof ctm);
    else if (t === "Q") ctm = stack.pop() ?? ctm;
    else if (t === "cm") {
      const next: typeof ctm = [n(6), n(5), n(4), n(3), n(2), n(1)];
      ctm = [
        ctm[0] * next[0] + ctm[2] * next[1],
        ctm[1] * next[0] + ctm[3] * next[1],
        ctm[0] * next[2] + ctm[2] * next[3],
        ctm[1] * next[2] + ctm[3] * next[3],
        ctm[0] * next[4] + ctm[2] * next[5] + ctm[4],
        ctm[1] * next[4] + ctm[3] * next[5] + ctm[5],
      ];
    } else if (t === "m") {
      if (ring.length >= 2) rings.push(ring);
      current = apply(n(2), n(1));
      start = current;
      ring = [current];
    } else if (t === "l") {
      current = apply(n(2), n(1));
      ring.push(current);
    } else if (t === "c") {
      const p3 = apply(n(2), n(1));
      ring.push(p3);
      current = p3;
    } else if (t === "v" || t === "y") {
      current = apply(n(2), n(1));
      ring.push(current);
    } else if (t === "h") {
      ring.push(start);
    } else if (t === "re") {
      const x = n(4);
      const y = n(3);
      const w = n(2);
      const h = n(1);
      rings.push([apply(x, y), apply(x + w, y), apply(x + w, y + h), apply(x, y + h)]);
    } else if (t === "S" || t === "s" || t === "n") {
      flush(t === "s", false);
    } else if (t === "f" || t === "F" || t === "f*" || t === "B" || t === "B*" || t === "b" || t === "b*") {
      flush(true, true);
    }
  }
  if (ring.length || rings.length) flush(false, false);
  return paths;
}
