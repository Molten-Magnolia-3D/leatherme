"use client";

import {
  AlertCircle,
  Download,
  FolderOpen,
  Loader2,
  Upload,
} from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Preview2D } from "@/components/preview-2d";
import { Preview3D } from "@/components/preview-3d";
import { SiteChrome } from "@/components/site-chrome";
import {
  DEFAULT_SETTINGS,
  PLATE_HEIGHT_MAX_MM,
  PLATE_HEIGHT_MIN_MM,
  SCALE_MAX_PCT,
  SCALE_MIN_PCT,
} from "@/lib/defaults";
import { exportPiece, exportZip, type ExportFormat } from "@/lib/export/download";
import { pieceBounds } from "@/lib/geometry/plate";
import { planStitch } from "@/lib/geometry/stitch";
import type { ImportResult, Piece, WorkbenchSettings } from "@/lib/geometry/types";
import { parsePatternFile } from "@/lib/import/parse";
import { fetchCardSleeveSample } from "@/lib/samples/card-sleeve";
import { clamp, formatDim, trimNum } from "@/lib/utils";

type Status = "empty" | "loading" | "ready" | "error";

export function Workbench() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("empty");
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<ImportResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [format, setFormat] = useState<ExportFormat>("stl");
  const [settings, setSettings] = useState<WorkbenchSettings>({
    ...DEFAULT_SETTINGS,
    scalePct: 100,
    drawingWidthMm: 220,
    unit: "mm",
  });

  const pieces = imported?.pieces ?? [];
  const selected = pieces.find((piece) => piece.id === selectedId) ?? pieces[0] ?? null;
  const widthFactor = imported ? settings.drawingWidthMm / imported.drawingWidthMm : 1;
  const effectiveScale = settings.scalePct * widthFactor;
  const plan = useMemo(
    () => (selected ? planStitch(selected, settings, effectiveScale) : null),
    [selected, settings, effectiveScale],
  );

  async function onFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setStatus("loading");
    setError(null);
    try {
      const result = await parsePatternFile(file);
      applyImport(result);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not read that file.");
    }
  }

  async function onSample() {
    setStatus("loading");
    setError(null);
    try {
      applyImport(await fetchCardSleeveSample());
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not load the sample.");
    }
  }

  function applyImport(result: ImportResult) {
    setImported(result);
    setSelectedId(result.pieces[0]?.id ?? null);
    setSettings((prev) => ({
      ...prev,
      drawingWidthMm: result.drawingWidthMm,
    }));
    setStatus("ready");
  }

  function updatePiece(id: string, patch: Partial<Piece>) {
    if (!imported) return;
    setImported({
      ...imported,
      pieces: imported.pieces.map((piece) => (piece.id === id ? { ...piece, ...patch } : piece)),
    });
  }

  function toDisplay(mm: number) {
    return settings.unit === "in" ? mm / 25.4 : mm;
  }

  function fromDisplay(value: number) {
    return settings.unit === "in" ? value * 25.4 : value;
  }

  const selectedBox = selected ? pieceBounds(selected, effectiveScale) : null;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteChrome
        current="workbench"
        trailing={
          <>
            <Tabs
              value={settings.unit}
              onValueChange={(value) => setSettings((s) => ({ ...s, unit: value as "mm" | "in" }))}
            >
              <TabsList className="bg-[#4a2f20]">
                <TabsTrigger value="mm" className="data-[state=active]:bg-[#f4efe6] data-[state=active]:text-[#2a1a12]">
                  mm
                </TabsTrigger>
                <TabsTrigger value="in" className="data-[state=active]:bg-[#f4efe6] data-[state=active]:text-[#2a1a12]">
                  in
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="secondary" onClick={() => inputRef.current?.click()}>
              <Upload /> Upload
            </Button>
            <Button
              variant="outline"
              className="border-[#d7b48a]/40 bg-transparent text-[#f4efe6] hover:bg-[#4a2f20]"
              onClick={onSample}
            >
              <FolderOpen /> Card-sleeve sample
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".svg,.pdf,.dxf,image/*"
              className="hidden"
              onChange={(event) => onFiles(event.target.files)}
            />
          </>
        }
      />

      <main className="mx-auto grid w-full max-w-[1400px] flex-1 gap-4 p-4 sm:p-6 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
        <Card className="order-2 lg:order-1">
          <CardHeader>
            <CardTitle>Pieces</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {status === "empty" && <p className="text-sm text-muted-foreground">No pattern yet.</p>}
            {status === "loading" && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="animate-spin" /> Reading pattern…
              </p>
            )}
            {pieces.map((piece) => {
              const box = pieceBounds(piece, effectiveScale);
              const active = selected?.id === piece.id;
              return (
                <button
                  key={piece.id}
                  type="button"
                  onClick={() => setSelectedId(piece.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    active ? "border-primary bg-muted" : "border-border hover:bg-muted/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{piece.name}</span>
                    <label className="flex items-center gap-1 text-[11px] text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={piece.included}
                        onChange={(e) => updatePiece(piece.id, { included: e.target.checked })}
                      />
                      include
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDim(box.width, settings.unit)} × {formatDim(box.height, settings.unit)}
                    {piece.holes.length ? ` · ${piece.holes.length} hole${piece.holes.length === 1 ? "" : "s"}` : ""}
                  </p>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="order-1 flex min-h-[28rem] flex-col gap-4 lg:order-2">
          {status === "empty" && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onFiles(e.dataTransfer.files);
              }}
              className="flex min-h-72 flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-primary/40 bg-card px-6 text-center shadow-sm"
            >
              <Upload className="mb-3 size-8 text-primary" />
              <p className="font-display text-2xl">Drop a leather pattern</p>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                SVG, PDF, ASCII DXF, or a high-contrast image. Closed outlines become plates. Open fold lines stay off the
                plate.
              </p>
            </button>
          )}

          {status === "loading" && (
            <Card className="flex min-h-72 flex-1 items-center justify-center">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="size-6 animate-spin" />
                Reading pattern…
              </div>
            </Card>
          )}

          {status === "error" && (
            <Alert className="border-destructive/40 bg-destructive/10 text-destructive">
              <AlertCircle className="mt-0.5 size-4" />
              <div>
                <p className="font-medium">Could not read that pattern</p>
                <p>{error}</p>
                <Button className="mt-3" size="sm" onClick={() => setStatus("empty")}>
                  Try again
                </Button>
              </div>
            </Alert>
          )}

          {status === "ready" && imported && (
            <>
              <div className="flex flex-wrap gap-2">
                {imported.notes.map((note) => (
                  <Badge key={note.message}>{note.message}</Badge>
                ))}
                {imported.needsWidthConfirm && (
                  <Badge className="border-primary/40 bg-primary/10 text-primary">Confirm the drawing width</Badge>
                )}
              </div>
              <div className="grid flex-1 gap-4 md:grid-cols-2">
                <Card className="overflow-hidden">
                  <CardHeader>
                    <CardTitle>2D outline</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[320px] p-0 sm:h-[360px]">
                    <Preview2D piece={selected} plan={plan} scalePct={effectiveScale} unit={settings.unit} />
                  </CardContent>
                </Card>
                <Card className="overflow-hidden bg-[#22160f]">
                  <CardHeader className="text-[#f4efe6]">
                    <CardTitle>3D plate</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[320px] p-0 sm:h-[360px]">
                    <Preview3D piece={selected} settings={settings} scalePct={effectiveScale} plan={plan} />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>

        <Card className="order-3">
          <CardHeader>
            <CardTitle>Plate settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              label="Scale"
              value={`${trimNum(settings.scalePct, 0)}%`}
              hint="Changes only the cut outline"
            >
              <div className="flex items-center gap-2">
                <Slider
                  min={SCALE_MIN_PCT}
                  max={SCALE_MAX_PCT}
                  step={1}
                  value={[settings.scalePct]}
                  onValueChange={([scalePct]) => setSettings((s) => ({ ...s, scalePct }))}
                />
                <Input
                  type="number"
                  min={SCALE_MIN_PCT}
                  max={SCALE_MAX_PCT}
                  step={1}
                  className="w-20"
                  value={trimNum(settings.scalePct, 0)}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      scalePct: clamp(Number(e.target.value) || 0, SCALE_MIN_PCT, SCALE_MAX_PCT),
                    }))
                  }
                />
              </div>
            </Field>
            <Field
              label="Drawing width"
              value={formatDim(settings.drawingWidthMm, settings.unit, settings.unit === "mm" ? 1 : 3)}
              hint="Corrects scale when the file size is untrusted"
            >
              <Input
                type="number"
                step={settings.unit === "mm" ? 0.1 : 0.01}
                value={trimNum(toDisplay(settings.drawingWidthMm), settings.unit === "mm" ? 1 : 3)}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    drawingWidthMm: clamp(fromDisplay(Number(e.target.value) || 0), 1, 4000),
                  }))
                }
              />
            </Field>
            <Field label="Seam distance" value={formatDim(settings.seamMm, settings.unit, 2)} hint="Inset from the cut edge and around holes">
              <Input
                type="number"
                step={0.1}
                value={trimNum(toDisplay(settings.seamMm), 2)}
                onChange={(e) => setSettings((s) => ({ ...s, seamMm: Math.max(0.2, fromDisplay(Number(e.target.value) || 0)) }))}
              />
            </Field>
            <Field label="Stitch-line thickness" value={formatDim(settings.lineMm, settings.unit, 2)}>
              <Input
                type="number"
                step={0.1}
                value={trimNum(toDisplay(settings.lineMm), 2)}
                onChange={(e) => setSettings((s) => ({ ...s, lineMm: Math.max(0.2, fromDisplay(Number(e.target.value) || 0)) }))}
              />
            </Field>
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label>Stitch marks</Label>
                <p className="text-xs text-muted-foreground">
                  Off: solid groove in the top face. On: through-slots.
                </p>
              </div>
              <Switch
                checked={settings.mode === "marks"}
                onCheckedChange={(checked) => setSettings((s) => ({ ...s, mode: checked ? "marks" : "solid" }))}
              />
            </div>
            {settings.mode === "marks" && (
              <>
                <Field label="Mark length" value={formatDim(settings.markLengthMm, settings.unit, 2)}>
                  <Input
                    type="number"
                    step={0.1}
                    value={trimNum(toDisplay(settings.markLengthMm), 2)}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, markLengthMm: Math.max(0.4, fromDisplay(Number(e.target.value) || 0)) }))
                    }
                  />
                </Field>
                <Field label="Gap" value={formatDim(settings.gapMm, settings.unit, 2)}>
                  <Input
                    type="number"
                    step={0.1}
                    value={trimNum(toDisplay(settings.gapMm), 2)}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, gapMm: Math.max(0.4, fromDisplay(Number(e.target.value) || 0)) }))
                    }
                  />
                </Field>
                {plan && (
                  <p className="rounded-md bg-muted px-3 py-2 text-sm">
                    {plan.markCount} marks · {formatDim(plan.pitchMm, settings.unit, 2)} pitch
                    <span className="block text-xs text-muted-foreground">
                      Pitch is mark plus gap, spaced so the last gap matches.
                    </span>
                  </p>
                )}
              </>
            )}
            <Field
              label="Plate height"
              value={formatDim(settings.plateHeightMm, settings.unit, 2)}
              hint={`${formatDim(PLATE_HEIGHT_MIN_MM, settings.unit)}–${formatDim(PLATE_HEIGHT_MAX_MM, settings.unit)}`}
            >
              <Slider
                min={PLATE_HEIGHT_MIN_MM}
                max={PLATE_HEIGHT_MAX_MM}
                step={0.1}
                value={[settings.plateHeightMm]}
                onValueChange={([plateHeightMm]) => setSettings((s) => ({ ...s, plateHeightMm }))}
              />
            </Field>
            {selectedBox && (
              <p className="text-sm text-muted-foreground">
                Selected cut {formatDim(selectedBox.width, settings.unit)} × {formatDim(selectedBox.height, settings.unit)}
              </p>
            )}
            <Separator />
            <div className="space-y-2">
              <Label>Export</Label>
              <Tabs value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
                <TabsList className="w-full">
                  <TabsTrigger value="stl">STL</TabsTrigger>
                  <TabsTrigger value="3mf">3MF</TabsTrigger>
                </TabsList>
              </Tabs>
              <p className="text-xs text-muted-foreground">
                {format === "stl"
                  ? "STL has no unit tag. Set your slicer to millimeters."
                  : "3MF records millimeters."}
              </p>
              <Button
                className="w-full"
                disabled={!selected}
                onClick={() => selected && exportPiece(selected, settings, effectiveScale, format)}
              >
                <Download /> Download selected
              </Button>
              <Button
                className="w-full"
                variant="outline"
                disabled={!pieces.some((p) => p.included)}
                onClick={() =>
                  imported && exportZip(imported.pieces, settings, effectiveScale, format, imported.sourceName)
                }
              >
                Zip included + 200 mm layout
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label>{label}</Label>
        {value ? <span className="text-sm tabular-nums">{value}</span> : null}
      </div>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
