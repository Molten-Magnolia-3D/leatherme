# Leatherme

Leatherme turns a leather pattern into flat 3D-printable stencil plates. The outside wall of each plate is the cut line. A solid stitch guide is a groove in the top face; stitch marks are through-slots.

## What it reads

Upload **SVG**, **PDF**, **ASCII DXF**, or a **high-contrast image**. Closed outlines become separate pieces. Open fold lines are ignored. A pre-drawn stitch or fold line that sits a short, even distance inside an outline (about 0.4–12 mm and roughly parallel) is ignored so it is not treated as another piece. Smaller outlines inside a piece, such as slots, become holes. A filled compound SVG path with `evenodd` fill treats inner subpaths as holes.

## Size

Physical size is read from the file when it is present.

- SVG `width` and `height` units (`mm`, `cm`, `in`, `pt`) map through the `viewBox`.
- Illustrator `px` is treated as points (1/72 inch), and the workbench says so.
- A unitless SVG treats 1 unit as 1 mm and asks you to confirm the drawing width.
- DXF uses `$INSUNITS`. If that is unitless, it falls back to `$MEASUREMENT` (0 means inches, otherwise millimeters).
- A PDF page is 72 points to an inch. The UI warns that a fit-to-page pattern may be the wrong size.
- An image has no scale and starts at an assumed 200 mm picture width.

After the pattern is read, **scale** (10%–400%) changes only the cut outline. Seam distance, line thickness, mark length, and gap stay in real millimeters or inches. **Drawing width** corrects the scale when the file size is untrusted.

## Plate settings

Defaults: seam 3.5 mm, stitch line 0.9 mm, solid guide, mark length 2.5 mm, gap 2.5 mm, plate height 3 mm (1.6–8 mm).

Stitch marks are spaced evenly around the closed loop so the last gap matches. The workbench shows mark count and pitch (mark plus gap).

## Export

Export **STL** or **3MF** in millimeters. STL has no unit tag — set the slicer to millimeters. 3MF records millimeters. Download the selected piece, or a zip of the included pieces plus a layout packed on a 200 mm bed with an 8 mm gap.

Meshes are generated in the browser.

## Sample

A built-in card-sleeve sample lives at `public/samples/card-sleeve.svg`. The file note says the SVG width is 220 mm. At 100% it has four pieces and ignores an open fold line on the body:

- Card Body 100 × 72 mm
- Flap about 94 × 56 mm
- Strap 150 × 22 mm with one slot
- Keeper 40 × 16 mm

At 110% the body cuts at 110 × 79.2 mm while stitch spacing stays in millimeters.

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

The workbench starts on [http://localhost:4733](http://localhost:4733).

## Download the app

Get the desktop app from [GitHub Releases](https://github.com/Molten-Magnolia-3D/leatherme/releases):

- Windows: `Leatherme-*-win.exe`
- macOS: `Leatherme-*-mac.dmg`
- Linux: `Leatherme-*-linux.AppImage`

The in-app [Releases](/releases) page lists the same GitHub downloads. Pushing to `main` publishes a new GitHub Release and uploads those builds. An installed copy updates itself from GitHub.

To package locally:

```bash
npm run dist
```

## Test

```bash
npm test
```

## Stack

Next.js, TypeScript, Tailwind CSS, and shadcn/ui. Package name: `leatherme`. Visible title: **Leatherme**.
