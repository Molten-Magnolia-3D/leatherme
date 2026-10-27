import { parseDxf } from "@/lib/import/dxf";
import { parseImage } from "@/lib/import/image";
import { parsePdf } from "@/lib/import/pdf";
import { parseSvg } from "@/lib/import/svg";
import type { ImportResult } from "@/lib/geometry/types";

export async function parsePatternFile(file: File): Promise<ImportResult> {
  const name = file.name || "pattern";
  const ext = extension(name, file.type);
  if (ext === "svg") {
    return parseSvg(await file.text(), name);
  }
  if (ext === "dxf") {
    return parseDxf(await file.text(), name);
  }
  if (ext === "pdf") {
    return parsePdf(await file.arrayBuffer(), name);
  }
  if (["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(ext)) {
    return parseImage(file, name);
  }
  throw new Error("Use an SVG, PDF, ASCII DXF, or high-contrast image.");
}

export async function parsePatternText(
  text: string,
  sourceName: string,
): Promise<ImportResult> {
  const ext = extension(sourceName, "");
  if (ext === "dxf") return parseDxf(text, sourceName);
  return parseSvg(text, sourceName);
}

function extension(name: string, mime: string): string {
  const fromName = name.split(".").pop()?.toLowerCase() ?? "";
  if (fromName) return fromName;
  if (mime.includes("svg")) return "svg";
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  return "";
}
