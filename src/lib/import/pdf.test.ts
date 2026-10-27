import { describe, expect, it } from "vitest";
import { parsePdf } from "@/lib/import/pdf";

function simplePdf() {
  const content = "0.5 w 72 72 216 144 re S\n";
  return `%PDF-1.1
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length ${content.length} >> stream
${content}endstream endobj
trailer << /Root 1 0 R >>
%%EOF
`;
}

describe("PDF page size", () => {
  it("reads 72 points per inch and warns about fit-to-page", async () => {
    const result = await parsePdf(new TextEncoder().encode(simplePdf()).buffer, "letter.pdf");
    expect(result.drawingWidthMm).toBeCloseTo(215.9, 0);
    expect(result.notes.some((note) => note.kind === "pdf-page")).toBe(true);
    expect(result.notes[0].message).toMatch(/fit-to-page/);
    expect(result.pieces).toHaveLength(1);
    expect(result.pieces[0].outline.length).toBeGreaterThanOrEqual(4);
  });
});
