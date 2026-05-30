import type { ExtrudeConfig, GeometryMode, IGeometryBuilder } from '../../application/ports/IGeometryBuilder'
import type { OpenScadCancelRequest, OpenScadRenderRequest, OpenScadRenderResponse } from './workerProtocol'

/** Minimal shape of the OpenSCAD WASM instance we use */
interface OpenSCADInstance {
  renderToStl(code: string): Promise<string>
  // Raw Emscripten module — available in openscad-wasm-prebuilt for --enable=manifold
  getInstance?(): {
    FS: { writeFile(path: string, data: string): void; readFile(path: string, opts: { encoding: string }): string; unlink(path: string): void }
    callMain(args: string[]): number
  }
}

type Pt = [number, number]

/**
 * Parse the simple "M x y L x y ... Z" path produced by CanvasImageTracer.
 */
function parseSimplePath(d: string): Pt[] {
  const pts: Pt[] = []
  const nums = d.replace(/[MLZ]/gi, ' ').trim().split(/[\s,]+/).filter(Boolean)
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = parseFloat(nums[i])
    const y = parseFloat(nums[i + 1])
    if (!isNaN(x) && !isNaN(y)) pts.push([x, y])
  }
  return pts
}

/**
 * Convert ASCII STL text to a binary ArrayBuffer.
 *
 * The ThreePreview and exportStl functions both expect ArrayBuffer (binary STL).
 * openscad-wasm-prebuilt's renderToStl() returns ASCII STL, so we parse it
 * and write the standard 80-byte header + triangle data format.
 */
function asciiStlToArrayBuffer(ascii: string): ArrayBuffer {
  const lines = ascii.split('\n')
  const triangles: Array<{ normal: [number, number, number]; vertices: [number, number, number][] }> = []
  let currentNormal: [number, number, number] = [0, 0, 0]
  let currentVertices: [number, number, number][] = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line.startsWith('facet normal')) {
      const parts = line.split(/\s+/)
      currentNormal = [parseFloat(parts[2]), parseFloat(parts[3]), parseFloat(parts[4])]
      currentVertices = []
    } else if (line.startsWith('vertex')) {
      const parts = line.split(/\s+/)
      currentVertices.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])])
    } else if (line.startsWith('endfacet')) {
      triangles.push({ normal: currentNormal, vertices: currentVertices })
    }
  }

  // Binary STL format: 80-byte header + 4-byte triangle count + 50 bytes per triangle
  const numTriangles = triangles.length
  const bufferSize = 80 + 4 + numTriangles * 50
  const buffer = new ArrayBuffer(bufferSize)
  const view = new DataView(buffer)

  // Header (80 bytes of zeros)
  // Triangle count
  view.setUint32(80, numTriangles, true)

  let offset = 84
  for (const tri of triangles) {
    // Normal
    view.setFloat32(offset, tri.normal[0], true); offset += 4
    view.setFloat32(offset, tri.normal[1], true); offset += 4
    view.setFloat32(offset, tri.normal[2], true); offset += 4
    // 3 vertices
    for (const v of tri.vertices) {
      view.setFloat32(offset, v[0], true); offset += 4
      view.setFloat32(offset, v[1], true); offset += 4
      view.setFloat32(offset, v[2], true); offset += 4
    }
    // Attribute byte count (unused)
    view.setUint16(offset, 0, true); offset += 2
  }

  return buffer
}

/**
 * Format polygon points as an OpenSCAD points array literal.
 * E.g., [[0,0],[10,0],[10,10],[0,10]]
 */
function scadPoints(pts: Pt[]): string {
  return '[' + pts.map(([x, y]) => `[${x.toFixed(4)},${y.toFixed(4)}]`).join(',') + ']'
}

/* ------------------------------------------------------------------ */
/*  CookieCad-style profile defaults                                  */
/* ------------------------------------------------------------------ */

const DEFAULT_TIP_WIDTH = 0.4        // mm - cutting tip at the very bottom
const DEFAULT_CHAMFER_HEIGHT = 2     // mm - height of the taper section
const DEFAULT_CHAMFER_STEPS = 4      // number of discrete layers in the taper
const DEFAULT_BLADE_THICKNESS = 0.8  // mm - wall thickness of the straight blade
const DEFAULT_BASE_WIDTH = 4         // mm - width of the handle/base ring
const DEFAULT_BASE_HEIGHT = 3.5      // mm - height of the handle/base ring
const DEFAULT_BLADE_DEPTH = 12.5     // mm - total cutter height (chamfer + blade + handle)

const DEFAULT_STAMP_IMPRINT_HEIGHT = 3    // mm - solid stamp face plate
const DEFAULT_STAMP_BACK_HEIGHT = 4.5     // mm - raised ring on stamp back
const DEFAULT_STAMP_CUTTER_TOLERANCE = 0.9 // mm - gap so stamp fits inside cutter
const OPENSCAD_WORKER_TIMEOUT_MS = 45_000

/* ------------------------------------------------------------------ */
/*  SCAD code generators                                               */
/* ------------------------------------------------------------------ */

/**
 * Generate OpenSCAD code for a cookie-cutter with CookieCad-style profile.
 *
 * Cross-section (used UPSIDE DOWN - handle on top, sharp edge at bottom):
 *
 *     +-------------+   <- Handle/base: baseWidth wide x baseHeight tall
 *     +---+     +---+
 *         |     |       <- Blade wall: bladeThickness thick
 *         |     |       <- Straight section
 *         |  /  |       <- Chamfer/taper: chamferHeight tall
 *         +-+           <- Tip: tipWidth wide
 *
 * Wall strategy: morphological opening (erode→dilate) applied to both outer and inner
 * polygons in 2D before linear_extrude. The opening removes thin protrusions
 * (whisker/detail artifacts from the tracer) that cause CGAL "mesh not closed"
 * when the self-touching segments in the extruded solid prevent Nef conversion.
 * Main features (ears, face) are much wider than the opening radius and are preserved.
 */

/**
 * Returns SCAD for the INNER boundary of the cutter ring — the cleaned silhouette.
 * Uses morphological opening (erode then dilate) to remove thin protrusions
 * (whisker/detail artifacts) that cause CGAL "mesh not closed".
 * The inner boundary defines the exact cookie shape.
 */
function scadInner(m: number): string {
  return `offset(r = ${m.toFixed(4)}, $fn = 16) offset(r = ${(-m).toFixed(4)}, $fn = 16) polygon(points = pts)`
}

/**
 * Returns SCAD for the OUTER boundary of the cutter ring — silhouette expanded outward.
 * Positive offset is always clean (no self-intersections), no sanitization needed.
 * The outer boundary is silhouette + expansion, so the wall extends OUTWARD.
 */
function scadOuter(expansion: number): string {
  return `offset(r = ${expansion.toFixed(4)}, $fn = 32) polygon(points = pts)`
}

function generateCutterScad(
  pts: Pt[],
  depth: number,
  bladeThickness: number,
  tipWidth: number,
  chamferHeight: number,
  chamferSteps: number,
  baseWidth: number,
  baseHeight: number,
): string {
  const points = scadPoints(pts)
  const bladeHeight = depth - chamferHeight - baseHeight
  const safeBladeHeight = Math.max(0.01, bladeHeight)
  // Opening radius to sanitize inner polygon (removes whisker artifacts < ~1mm wide)
  const m = 0.5

  const chamferLines: string[] = []
  for (let i = 0; i < chamferSteps; i++) {
    // Wall expands OUTWARD from silhouette: tipWidth at tip → bladeThickness at blade
    const wall = tipWidth + (bladeThickness - tipWidth) * (i / chamferSteps)
    const zOffset = chamferHeight * (i / chamferSteps)
    const layerHeight = chamferHeight / chamferSteps
    chamferLines.push(`  // Chamfer step ${i + 1}/${chamferSteps} (wall=${wall.toFixed(3)}mm)`)
    chamferLines.push(`  translate([0, 0, ${zOffset.toFixed(4)}])`)
    chamferLines.push(`    linear_extrude(height = ${layerHeight.toFixed(4)})`)
    chamferLines.push(`      difference() {`)
    chamferLines.push(`        ${scadOuter(wall)};`)
    chamferLines.push(`        ${scadInner(m)};`)
    chamferLines.push(`      }`)
    chamferLines.push('')
  }

  return `
// Cookie cutter with CookieCad-style profile - generated by Forja3D
// Wall extends OUTWARD from silhouette — inner edge = exact cookie shape.
// Profile: tip (tipWidth outward) -> blade (bladeThickness outward) -> base (baseWidth outward)
$fn = 32;

pts = ${points};

union() {
  // --- Layer 1: Chamfer/taper at cutting edge (bottom) ---
  // Gradually transitions from tipWidth (${tipWidth}mm) to bladeThickness (${bladeThickness}mm)
${chamferLines.join('\n')}

  // --- Layer 2: Straight blade wall ---
  translate([0, 0, ${chamferHeight.toFixed(4)}])
    linear_extrude(height = ${safeBladeHeight.toFixed(4)})
      difference() {
        ${scadOuter(bladeThickness)};
        ${scadInner(m)};
      }

  // --- Layer 3: Handle/base at top (wider ring extending outward for grip) ---
  translate([0, 0, ${(depth - baseHeight).toFixed(4)}])
    linear_extrude(height = ${baseHeight.toFixed(4)})
      difference() {
        ${scadOuter(baseWidth)};
        ${scadInner(m)};
      }
}
`
}

/**
 * Generate OpenSCAD code for cutter + stamp combo with CookieCad-style profile.
 *
 * CUTTER: same layered profile as generateCutterScad.
 * STAMP: solid base plate + raised ring outline on top.
 *   - The stamp is offset inward by stampCutterTolerance so it fits inside the cutter.
 *   - Placed to the right of the cutter with a gap.
 */
function generateCutterStampScad(
  pts: Pt[],
  depth: number,
  bladeThickness: number,
  tipWidth: number,
  chamferHeight: number,
  chamferSteps: number,
  baseWidth: number,
  baseHeight: number,
  stampImprintHeight: number,
  stampBackHeight: number,
  stampCutterTolerance: number,
): string {
  const points = scadPoints(pts)
  const bladeHeight = Math.max(0.01, depth - chamferHeight - baseHeight)
  const m = 0.5 // same opening radius as standalone cutter

  const chamferLines: string[] = []
  for (let i = 0; i < chamferSteps; i++) {
    const wall = tipWidth + (bladeThickness - tipWidth) * (i / chamferSteps)
    const zOffset = chamferHeight * (i / chamferSteps)
    const layerHeight = chamferHeight / chamferSteps
    chamferLines.push(`  // Chamfer step ${i + 1}/${chamferSteps} (wall=${wall.toFixed(3)}mm)`)
    chamferLines.push(`  translate([0, 0, ${zOffset.toFixed(4)}])`)
    chamferLines.push(`    linear_extrude(height = ${layerHeight.toFixed(4)})`)
    chamferLines.push(`      difference() {`)
    chamferLines.push(`        ${scadOuter(wall)};`)
    chamferLines.push(`        ${scadInner(m)};`)
    chamferLines.push(`      }`)
    chamferLines.push('')
  }

  const xs = pts.map(([x]) => x)
  const stampOffset = (Math.max(...xs) - Math.min(...xs) + 5).toFixed(2)

  return `
// Cookie cutter + stamp with CookieCad-style profile - generated by Forja3D
$fn = 32;

pts = ${points};

// --- Cutter (left) ---
union() {
  // Layer 1: Chamfer/taper at cutting edge (bottom)
${chamferLines.join('\n')}

  // Layer 2: Straight blade wall
  translate([0, 0, ${chamferHeight.toFixed(4)}])
    linear_extrude(height = ${bladeHeight.toFixed(4)})
      difference() {
        ${scadOuter(bladeThickness)};
        ${scadInner(m)};
      }

  // Layer 3: Handle/base at top
  translate([0, 0, ${(depth - baseHeight).toFixed(4)}])
    linear_extrude(height = ${baseHeight.toFixed(4)})
      difference() {
        ${scadOuter(baseWidth)};
        ${scadInner(m)};
      }
}

// --- Stamp (right) ---
// Stamp = cleaned inner silhouette shrunk by stampCutterTolerance so it fits inside cutter.
translate([${stampOffset}, 0, 0]) {
  // Solid base (stamp face) — shrunk by tolerance to fit inside cutter opening
  linear_extrude(height = ${stampImprintHeight.toFixed(4)})
    offset(r = ${(-stampCutterTolerance).toFixed(4)}, $fn = 32)
      ${scadInner(m)};

  // Raised ring on back (handle)
  translate([0, 0, ${stampImprintHeight.toFixed(4)}])
    linear_extrude(height = ${stampBackHeight.toFixed(4)})
      difference() {
        offset(r = ${(-stampCutterTolerance).toFixed(4)}, $fn = 32)
          ${scadInner(m)};
        offset(r = ${(-(stampCutterTolerance + bladeThickness)).toFixed(4)}, $fn = 32)
          ${scadInner(m)};
      }
}
`
}

/**
 * Generate OpenSCAD code for a solid extrusion.
 */
function generateSolidScad(pts: Pt[], depth: number): string {
  const points = scadPoints(pts)
  return `
// Solid extrusion generated by Forja3D
$fn = 32;

linear_extrude(height = ${depth.toFixed(2)}) {
  polygon(points = ${points});
}
`
}

function generatePhoneStandScad(params: PhoneStandParams): string {
  const deviceWidth = finiteNumber(params.deviceWidth, 75, 55, 120)
  const deviceThickness = finiteNumber(params.deviceThickness, 10, 6, 20)
  const standAngle = finiteNumber(params.standAngle, 65, 45, 80)
  const baseDepth = finiteNumber(params.baseDepth, 90, 65, 140)
  const lipHeight = finiteNumber(params.lipHeight, 12, 6, 20)
  const cableSlotWidth = finiteNumber(params.cableSlotWidth, 14, 8, 30)
  const wallThickness = finiteNumber(params.wallThickness, 4, 3, 8)

  const sideGap = 8
  const standWidth = deviceWidth + sideGap * 2
  const slotHeight = Math.max(deviceThickness + 1.2, wallThickness + 2)
  const slotDepth = 18
  const backHeight = baseDepth * 0.88
  const supportDepth = baseDepth * 0.6

  return `
// Suporte para celular/tablet — gerado pelo Forja3D
$fn = 48;

module stand_profile() {
  polygon(points = [
    [0, 0],
    [${baseDepth.toFixed(2)}, 0],
    [${supportDepth.toFixed(2)}, ${backHeight.toFixed(2)}],
    [${(supportDepth - wallThickness).toFixed(2)}, ${backHeight.toFixed(2)}],
    [${(wallThickness * 1.2).toFixed(2)}, ${(lipHeight + slotHeight).toFixed(2)}],
    [0, ${lipHeight.toFixed(2)}]
  ]);
}

difference() {
  union() {
    linear_extrude(height = ${standWidth.toFixed(2)}, center = true)
      stand_profile();

    translate([0, 0, 0])
      linear_extrude(height = ${standWidth.toFixed(2)}, center = true)
        square([${(slotDepth + wallThickness).toFixed(2)}, ${lipHeight.toFixed(2)}]);
  }

  // Canal de apoio para o aparelho
  rotate([0, 0, ${(90 - standAngle).toFixed(2)}])
    translate([${(-slotDepth).toFixed(2)}, ${lipHeight.toFixed(2)}, ${(-standWidth / 2).toFixed(2)}])
      cube([${slotDepth.toFixed(2)}, ${slotHeight.toFixed(2)}, ${standWidth.toFixed(2)}]);

  // Abertura frontal para cabo
  translate([${(slotDepth * 0.25).toFixed(2)}, -0.1, ${(-cableSlotWidth / 2).toFixed(2)}])
    cube([${(slotDepth * 0.8).toFixed(2)}, ${(lipHeight + 0.2).toFixed(2)}, ${cableSlotWidth.toFixed(2)}]);
}
`
}

/* ------------------------------------------------------------------ */
/*  Keychain text template                                             */
/* ------------------------------------------------------------------ */

// Curated fonts for 3D printed keychains — served from public/fonts/ (no CDN dependency).
// Each entry: [display name, internal key, local font filename in public/fonts/]
// Run `node scripts/download-fonts.mjs` to populate public/fonts/.
export const KEYCHAIN_FONTS: [string, string, string][] = [
  // ── Sans-serif (clean, legible at any size) ──
  ['Noto Sans',       'NotoSans',      'NotoSans-Bold.ttf'],
  ['Roboto',          'Roboto',        'Roboto-Bold.ttf'],
  ['Open Sans',       'OpenSans',      'OpenSans-Bold.ttf'],
  ['Montserrat',      'Montserrat',    'Montserrat[wght].ttf'],
  ['Lato',            'Lato',          'Lato-Bold.ttf'],
  ['Raleway',         'Raleway',       'Raleway[wght].ttf'],
  // ── Display / Impact (strong, great for names) ──
  ['Oswald',          'Oswald',        'Oswald-Bold.ttf'],
  ['Anton',           'Anton',         'Anton-Regular.ttf'],
  ['Bebas Neue',      'BebasNeue',     'BebasNeue-Regular.ttf'],
  ['Righteous',       'Righteous',     'Righteous-Regular.ttf'],
  ['Alfa Slab One',   'AlfaSlabOne',   'AlfaSlabOne-Regular.ttf'],
  // ── Script / Cursiva (elegante, ideal para nomes e presentes) ──
  ['Pacifico',        'Pacifico',      'Pacifico-Regular.ttf'],
  ['Dancing Script',  'DancingScript', 'DancingScript[wght].ttf'],
  ['Great Vibes',     'GreatVibes',    'GreatVibes-Regular.ttf'],
  ['Sacramento',      'Sacramento',    'Sacramento-Regular.ttf'],
  ['Satisfy',         'Satisfy',       'Satisfy-Regular.ttf'],
  ['Lobster',         'Lobster',       'Lobster-Regular.ttf'],
  ['Caveat',          'Caveat',        'Caveat-Bold.ttf'],
  // ── Serif / Clássicas ──
  ['Playfair Display','PlayfairDisplay','PlayfairDisplay[wght].ttf'],
]

interface KeychainParams {
  text: string; text2: string; fontSize: number
  shape: string; thickness: number; textDepth: number
  padding: number; holeDiameter: number; addNfc: boolean
  fontName?: string  // OpenSCAD font name — must match KEYCHAIN_FONTS entry
}

interface NfcTagKeychainParams {
  text: string
  shape: string
  nfcMountMode: string
  width: number
  height: number
  thickness: number
  textDepth: number
  fontSize: number
  holeDiameter: number
  nfcDiameter: number
  nfcClearance: number
  cavityDepth: number
  coverThickness: number
  topCoverThickness: number
  epoxyBorder: boolean
  borderHeight: number
  fontName?: string
}

interface PhoneStandParams {
  deviceWidth: number
  deviceThickness: number
  standAngle: number
  baseDepth: number
  lipHeight: number
  cableSlotWidth: number
  wallThickness: number
}

const NFC_MIN_WIDTH = 42
const NFC_MAX_WIDTH = 80
const NFC_MIN_HEIGHT = 54
const NFC_MAX_HEIGHT = 90
const NFC_MIN_TAG_DIAMETER = 18
const NFC_MAX_TAG_DIAMETER = 35
const NFC_SIDE_WALL = 2
const NFC_HOLE_GAP = 2

function generateKeychainScad(p: KeychainParams): string {
  const { text, text2, fontSize, shape, thickness, textDepth, padding, holeDiameter, addNfc } = p
  const hasText2 = text2.trim().length > 0
  const borderWidth = 1.5  // mm — decorative border frame around plate edge

  // Auto-dimensions: plate width adapts to longest text line
  const longestLen = Math.max(text.length, text2.length)
  const K = 0.65
  const autoWidth = fontSize * longestLen * K + 2 * padding + holeDiameter + 3
  const plateWidth = Math.max(40, autoWidth)

  const lineSpacing = fontSize * 0.4
  const textBlockH  = hasText2 ? (2 * fontSize + lineSpacing) : fontSize
  const holeMargin  = holeDiameter / 2 + 3
  const plateHeight = Math.max(30, textBlockH + 2 * padding + holeDiameter + holeMargin)

  const r = Math.min(plateWidth, plateHeight) * 0.15
  const holeCy = plateHeight / 2 - holeDiameter / 2 - 3

  const textCenterY  = hasText2 ? (lineSpacing / 2 + fontSize / 2) : 0
  const text2CenterY = -(lineSpacing / 2 + fontSize / 2)

  // Shape module — reused for plate, border, and NFC check
  const shapeModule = shape === 'retangular'
    ? `square([${plateWidth.toFixed(2)}, ${plateHeight.toFixed(2)}], center = true)`
    : shape === 'oval'
      ? `scale([${(plateWidth / plateHeight).toFixed(4)}, 1]) circle(d = ${plateHeight.toFixed(2)})`
      : `offset(r = ${r.toFixed(2)}) square([${(plateWidth - 2 * r).toFixed(2)}, ${(plateHeight - 2 * r).toFixed(2)}], center = true)`

  const t = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const t2 = text2.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

  const fontAttr = p.fontName ? `, font = "${p.fontName}"` : ''

  return `
// Chaveiro com Texto — gerado pelo Forja3D
// Adaptive quality: $fa + $fs limit segment count on small font curves
// without affecting visual quality at typical keychain sizes (40-80mm).
// $fn=0 enables $fa/$fs mode; circle hole gets explicit $fn=48 override.
$fn = 0;
$fa = 5;
$fs = 0.5;

difference() {
  union() {
    // Placa base
    linear_extrude(height = ${thickness.toFixed(2)})
      ${shapeModule};

    // Borda decorativa em relevo (${borderWidth}mm)
    translate([0, 0, ${thickness.toFixed(2)}])
      linear_extrude(height = ${textDepth.toFixed(2)})
        difference() {
          ${shapeModule};
          offset(delta = ${(-borderWidth).toFixed(2)}) ${shapeModule};
        }

    // Texto linha 1 em relevo
    translate([0, ${textCenterY.toFixed(2)}, ${thickness.toFixed(2)}])
      linear_extrude(height = ${textDepth.toFixed(2)})
        text("${t}", size = ${fontSize.toFixed(2)},
             halign = "center", valign = "center"${fontAttr});
${hasText2 ? `
    // Texto linha 2 em relevo
    translate([0, ${text2CenterY.toFixed(2)}, ${thickness.toFixed(2)}])
      linear_extrude(height = ${textDepth.toFixed(2)})
        text("${t2}", size = ${fontSize.toFixed(2)},
             halign = "center", valign = "center"${fontAttr});` : ''}
  }

  // Furo para argola — $fn=48 explicit for smooth circle
  translate([0, ${holeCy.toFixed(2)}, -0.1])
    cylinder(h = ${(thickness + textDepth + 0.2).toFixed(2)}, d = ${holeDiameter.toFixed(2)}, $fn = 48);
${addNfc ? `
  // Recesso para tag NFC no verso (⌀26mm × 1.2mm)
  translate([0, 0, -0.1])
    cylinder(h = 1.3, d = 26);` : ''}
}
`
}

function escapeScadText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function makeStarPoints(width: number, height: number): string {
  const outerRadius = Math.min(width, height) / 2
  const innerRadius = outerRadius * 0.45

  return Array.from({ length: 10 }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI) / 5
    const radius = index % 2 === 0 ? outerRadius : innerRadius
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    return `[${x.toFixed(2)}, ${y.toFixed(2)}]`
  }).join(', ')
}

function buildNfcTagShapeModule(shape: string, width: number, height: number): string {
  const normalizedShape = shape.toLowerCase()
  const cornerRadius = Math.min(width, height) * 0.14

  if (normalizedShape === 'round' || normalizedShape === 'redondo') {
    return `circle(d = ${Math.min(width, height).toFixed(2)}, $fn = 96)`
  }
  if (normalizedShape.includes('hex')) {
    return `circle(d = ${Math.min(width, height).toFixed(2)}, $fn = 6)`
  }
  if (normalizedShape.includes('12')) {
    return `circle(d = ${Math.min(width, height).toFixed(2)}, $fn = 12)`
  }
  if (normalizedShape.includes('estrela') || normalizedShape.includes('star')) {
    return `polygon(points = [${makeStarPoints(width, height)}])`
  }
  if (normalizedShape.includes('cora') || normalizedShape.includes('heart')) {
    return `union() {
      translate([${(-width * 0.18).toFixed(2)}, ${(height * 0.13).toFixed(2)}])
        circle(d = ${(width * 0.46).toFixed(2)}, $fn = 48);
      translate([${(width * 0.18).toFixed(2)}, ${(height * 0.13).toFixed(2)}])
        circle(d = ${(width * 0.46).toFixed(2)}, $fn = 48);
      polygon(points = [
        [${(-width * 0.43).toFixed(2)}, ${(height * 0.08).toFixed(2)}],
        [${(width * 0.43).toFixed(2)}, ${(height * 0.08).toFixed(2)}],
        [0, ${(-height * 0.46).toFixed(2)}]
      ]);
    }`
  }
  if (normalizedShape === 'shield' || normalizedShape === 'escudo') {
    return `polygon(points = [
      [${(-width / 2).toFixed(2)}, ${(height * 0.26).toFixed(2)}],
      [${(-width * 0.35).toFixed(2)}, ${(height / 2).toFixed(2)}],
      [${(width * 0.35).toFixed(2)}, ${(height / 2).toFixed(2)}],
      [${(width / 2).toFixed(2)}, ${(height * 0.26).toFixed(2)}],
      [${(width * 0.34).toFixed(2)}, ${(-height * 0.28).toFixed(2)}],
      [0, ${(-height / 2).toFixed(2)}],
      [${(-width * 0.34).toFixed(2)}, ${(-height * 0.28).toFixed(2)}]
    ])`
  }

  return `offset(r = ${cornerRadius.toFixed(2)}, $fn = 32)
    square([${(width - 2 * cornerRadius).toFixed(2)}, ${(height - 2 * cornerRadius).toFixed(2)}], center = true)`
}

function finiteNumber(value: number, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return fallback
  }
  return Math.min(max, Math.max(min, value))
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true'
  }
  return fallback
}

function isRadialNfcShape(shape: string): boolean {
  const normalizedShape = shape.toLowerCase()
  return normalizedShape === 'round'
    || normalizedShape === 'redondo'
    || normalizedShape.includes('hex')
    || normalizedShape.includes('12')
    || normalizedShape.includes('estrela')
    || normalizedShape.includes('star')
}

function fitNfcTagDiameter(
  desiredDiameter: number,
  profileWidth: number,
  profileHeight: number,
  holeDiameter: number,
): number {
  const tagY = -profileHeight * 0.08
  const holeY = profileHeight / 2 - holeDiameter / 2 - 3
  const maxByWidth = profileWidth - NFC_SIDE_WALL * 2
  const maxByBottom = (tagY + profileHeight / 2 - NFC_SIDE_WALL) * 2
  const maxByHole = (holeY - holeDiameter / 2 - NFC_HOLE_GAP - tagY) * 2
  const availableDiameter = Math.max(
    NFC_MIN_TAG_DIAMETER,
    Math.min(maxByWidth, maxByBottom, maxByHole),
  )

  return Math.min(desiredDiameter, availableDiameter)
}

function normalizeNfcTagKeychainParams(params: NfcTagKeychainParams): NfcTagKeychainParams {
  const shape = params.shape || 'Quadrado arredondado'
  const width = finiteNumber(params.width, 45, NFC_MIN_WIDTH, NFC_MAX_WIDTH)
  const height = finiteNumber(params.height, 58, NFC_MIN_HEIGHT, NFC_MAX_HEIGHT)
  const profileSize = isRadialNfcShape(shape) ? Math.min(width, height) : undefined
  const profileWidth = profileSize ?? width
  const profileHeight = profileSize ?? height
  const nfcClearance = finiteNumber(params.nfcClearance, 0.4, 0, 1.2)
  const holeDiameter = finiteNumber(params.holeDiameter, 5, 3, 9)
  const desiredTagDiameter = finiteNumber(
    params.nfcDiameter + nfcClearance * 2,
    25.8,
    NFC_MIN_TAG_DIAMETER,
    NFC_MAX_TAG_DIAMETER + nfcClearance * 2,
  )
  const tagDiameter = fitNfcTagDiameter(
    desiredTagDiameter,
    profileWidth,
    profileHeight,
    holeDiameter,
  )

  return {
    ...params,
    shape,
    width,
    height,
    thickness: finiteNumber(params.thickness, 4, 2.5, 8),
    textDepth: finiteNumber(params.textDepth, 1.2, 0.6, 3),
    fontSize: finiteNumber(params.fontSize, 8, 4, 16),
    holeDiameter,
    nfcDiameter: Math.max(NFC_MIN_TAG_DIAMETER, tagDiameter - nfcClearance * 2),
    nfcClearance,
    cavityDepth: finiteNumber(params.cavityDepth, 1.2, 0.6, 3),
    coverThickness: finiteNumber(params.coverThickness, 0.8, 0.4, 2),
    topCoverThickness: finiteNumber(params.topCoverThickness, 0.8, 0.4, 2),
    borderHeight: finiteNumber(params.borderHeight, 1.2, 0.4, 3),
  }
}

function generateNfcTagKeychainScad(p: NfcTagKeychainParams): string {
  const params = normalizeNfcTagKeychainParams(p)
  const profileSize = isRadialNfcShape(params.shape) ? Math.min(params.width, params.height) : undefined
  const width = profileSize ?? params.width
  const height = profileSize ?? params.height
  const isExposedRecess = params.nfcMountMode.toLowerCase().includes('recesso')
  const bottomCoverThickness = params.coverThickness
  const topCoverThickness = params.topCoverThickness
  const pocketThickness = bottomCoverThickness + params.cavityDepth + topCoverThickness
  const totalThickness = isExposedRecess
    ? Math.max(params.thickness, params.cavityDepth + 0.8)
    : Math.max(params.thickness, pocketThickness)
  const tagDiameter = params.nfcDiameter + params.nfcClearance * 2
  const safeCavityDepth = isExposedRecess
    ? Math.min(params.cavityDepth, Math.max(0.4, totalThickness - 0.4))
    : Math.min(params.cavityDepth, Math.max(0.4, totalThickness - bottomCoverThickness - topCoverThickness))
  const pauseHeight = bottomCoverThickness + safeCavityDepth
  const borderHeight = params.epoxyBorder ? params.borderHeight : 0
  const raisedHeight = Math.max(params.textDepth, borderHeight)
  const cavityZ = isExposedRecess ? totalThickness - safeCavityDepth : bottomCoverThickness
  const cavityCutHeight = isExposedRecess ? safeCavityDepth + raisedHeight + 0.2 : safeCavityDepth
  const holeY = height / 2 - params.holeDiameter / 2 - 3
  const tagY = -height * 0.08
  const textY = -height / 2 + Math.max(8, params.fontSize * 0.9)
  const t = escapeScadText(params.text)
  const fontAttr = params.fontName ? `, font = "${params.fontName}"` : ''
  const shapeModule = buildNfcTagShapeModule(params.shape, width, height)

  return `
// Porta Tag NFC — gerado pelo Forja3D
// Fluxo recomendado: pausar a impressão em Z=${pauseHeight.toFixed(2)}mm,
// inserir a tag NFC e continuar para fechar a tampa superior.
$fn = 0;
$fa = 5;
$fs = 0.5;

module tag_shape() {
  ${shapeModule};
}


difference() {
  union() {
    linear_extrude(height = ${totalThickness.toFixed(2)})
      tag_shape();

${params.epoxyBorder ? `
    translate([0, 0, ${totalThickness.toFixed(2)}])
      linear_extrude(height = ${borderHeight.toFixed(2)})
        difference() {
          tag_shape();
          offset(delta = -1.4) tag_shape();
        }` : ''}

    translate([0, ${textY.toFixed(2)}, ${totalThickness.toFixed(2)}])
      linear_extrude(height = ${params.textDepth.toFixed(2)})
        text("${t}", size = ${params.fontSize.toFixed(2)},
             halign = "center", valign = "center"${fontAttr});
  }

  translate([0, ${holeY.toFixed(2)}, -0.1])
    cylinder(h = ${(totalThickness + raisedHeight + 0.2).toFixed(2)}, d = ${params.holeDiameter.toFixed(2)}, $fn = 48);

  translate([0, ${tagY.toFixed(2)}, ${cavityZ.toFixed(2)}])
    cylinder(h = ${cavityCutHeight.toFixed(2)}, d = ${tagDiameter.toFixed(2)}, $fn = 96);
}
`
}

/* ------------------------------------------------------------------ */

/**
 * OpenSCAD WASM-based geometry builder.
 *
 * Uses OpenSCAD's robust CSG kernel (CGAL/Manifold) to produce correct
 * hollow rings from arbitrary 2D polygons. This completely bypasses the
 * earcut triangulation and three-bvh-csg issues that plague the Three.js approach.
 */
export class OpenScadGeometryBuilder implements IGeometryBuilder {
  private modulePromise: Promise<typeof import('openscad-wasm-prebuilt')> | null = null
  private worker: Worker | null = null
  private requestId = 0
  private pending = new Map<number, {
    resolve: (value: ArrayBuffer) => void
    reject: (reason?: unknown) => void
    timer: ReturnType<typeof setTimeout>
  }>()
  private activeRequestId: number | null = null

  /**
   * Lazy-loads the openscad-wasm-prebuilt module (~11 MB) on first use,
   * enabling Vite to code-split it into a separate chunk.
   * The module is cached, but a fresh OpenSCAD instance is created per render
   * because the Emscripten runtime only supports one callMain() per instance.
   */
  private async createInstance(): Promise<OpenSCADInstance> {
    if (!this.modulePromise) {
      this.modulePromise = import('openscad-wasm-prebuilt')
    }
    const mod = await this.modulePromise
    return mod.createOpenSCAD()
  }

  cancelPending(): void {
    if (this.activeRequestId === null) return
    const id = this.activeRequestId
    this.activeRequestId = null
    const pending = this.pending.get(id)
    if (pending) {
      clearTimeout(pending.timer)
      pending.reject(new Error('Geração anterior cancelada.'))
      this.pending.delete(id)
    }
    const worker = this.worker
    if (worker) {
      const cancelMessage: OpenScadCancelRequest = { type: 'cancel', id }
      worker.postMessage(cancelMessage)
    }
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker

    const worker = new Worker(new URL('./OpenScadRenderWorker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<OpenScadRenderResponse>) => {
      const response = event.data
      const pending = this.pending.get(response.id)
      if (!pending) return
      clearTimeout(pending.timer)
      this.pending.delete(response.id)
      if (this.activeRequestId === response.id) this.activeRequestId = null
      if (response.ok) pending.resolve(response.geometry)
      else pending.reject(new Error(response.error || 'Falha ao gerar STL no worker OpenSCAD.'))
    }
    worker.onerror = () => {
      this.terminateWorker('Falha no worker OpenSCAD.')
    }
    this.worker = worker
    return worker
  }

  private terminateWorker(reason: string): void {
    this.worker?.terminate()
    this.worker = null
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer)
      pending.reject(new Error(reason))
      this.pending.delete(id)
    }
    this.activeRequestId = null
  }

  async build(config: ExtrudeConfig): Promise<ArrayBuffer> {
    // --- Template dispatch (e.g. keychain) ---
    if (config.scadTemplate) {
      const params = config.templateParams ?? {}
      const scadCode = this.buildFromTemplate(config.scadTemplate, params)
      const fontKey = params.fontKey as string | undefined
      return this.renderScad(scadCode, fontKey)
    }

    const {
      pathData,
      targetSize,
      depth = DEFAULT_BLADE_DEPTH,
      wallThickness = DEFAULT_BLADE_THICKNESS,
      mode = 'solid' as GeometryMode,
      tipWidth = DEFAULT_TIP_WIDTH,
      chamferHeight = DEFAULT_CHAMFER_HEIGHT,
      chamferSteps = DEFAULT_CHAMFER_STEPS,
      baseWidth = DEFAULT_BASE_WIDTH,
      baseHeight = DEFAULT_BASE_HEIGHT,
      stampImprintHeight = DEFAULT_STAMP_IMPRINT_HEIGHT,
      stampBackHeight = DEFAULT_STAMP_BACK_HEIGHT,
      stampCutterTolerance = DEFAULT_STAMP_CUTTER_TOLERANCE,
    } = config

    // --- Parse path and scale to mm ---
    let pxPts = parseSimplePath(pathData)
    // The tracer pushes the start point twice (once at start, once when the loop closes).
    // Remove the duplicate trailing point to prevent a zero-length closing edge that
    // causes CGAL to fail with "mesh not closed".
    if (
      pxPts.length > 1 &&
      pxPts[0][0] === pxPts[pxPts.length - 1][0] &&
      pxPts[0][1] === pxPts[pxPts.length - 1][1]
    ) {
      pxPts = pxPts.slice(0, -1)
    }
    if (pxPts.length < 3) throw new Error('Insufficient path points for geometry')

    const xs = pxPts.map(([x]) => x)
    const ys = pxPts.map(([, y]) => y)
    const maxDimPx = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
    if (maxDimPx === 0) throw new Error('Degenerate path (zero bounding box)')

    const mmPerPx = targetSize / maxDimPx
    const mmPts: Pt[] = pxPts.map(([x, y]) => [x * mmPerPx, y * mmPerPx])

    // Flip Y (SVG Y-down -> OpenSCAD Y-up) and center
    const yMin = Math.min(...mmPts.map(([, y]) => y))
    const yMax = Math.max(...mmPts.map(([, y]) => y))
    const xMin = Math.min(...mmPts.map(([x]) => x))
    const xMax = Math.max(...mmPts.map(([x]) => x))
    const cxMm = (xMin + xMax) / 2
    const cyMm = (yMin + yMax) / 2

    const centeredPts: Pt[] = mmPts.map(([x, y]) => [
      x - cxMm,
      -(y - cyMm), // flip Y
    ])

    // Ensure CCW winding — OpenSCAD CGAL requires CCW for exterior polygon rings.
    // The tracer produces CW in SVG (Y-down) space; after negating Y the polygon
    // remains CW in the standard Y-up coordinate system → CGAL treats it as a
    // hole and the extruded solid becomes non-manifold ("mesh not closed").
    // Shoelace area < 0 means CW; reverse to make it CCW.
    {
      let area = 0
      for (let i = 0; i < centeredPts.length; i++) {
        const j = (i + 1) % centeredPts.length
        area += centeredPts[i][0] * centeredPts[j][1] - centeredPts[j][0] * centeredPts[i][1]
      }
      if (area < 0) centeredPts.reverse()
    }

    // --- Generate OpenSCAD code ---
    let scadCode: string
    if (mode === 'cutter') {
      scadCode = generateCutterScad(
        centeredPts, depth, wallThickness,
        tipWidth, chamferHeight, chamferSteps,
        baseWidth, baseHeight,
      )
    } else if (mode === 'cutter-stamp') {
      scadCode = generateCutterStampScad(
        centeredPts, depth, wallThickness,
        tipWidth, chamferHeight, chamferSteps,
        baseWidth, baseHeight,
        stampImprintHeight, stampBackHeight, stampCutterTolerance,
      )
    } else {
      scadCode = generateSolidScad(centeredPts, depth)
    }

    return this.renderScad(scadCode)
  }

  private buildFromTemplate(template: string, params: Record<string, unknown>): string {
    if (template === 'keychain') {
      return generateKeychainScad({
        text:         String(params.text         ?? 'Forja3D'),
        text2:        String(params.text2        ?? ''),
        fontSize:     Number(params.fontSize     ?? 8),
        shape:        String(params.shape        ?? 'retangular_arredondado'),
        thickness:    Number(params.thickness    ?? 4),
        textDepth:    Number(params.textDepth    ?? 1.5),
        padding:      Number(params.padding      ?? 4),
        holeDiameter: Number(params.holeDiameter ?? 6),
        addNfc:       Boolean(params.addNfc      ?? false),
        fontName:     params.fontKey ? String(params.fontKey) : undefined,
      })
    }
    if (template === 'nfc-tag-keychain') {
      return generateNfcTagKeychainScad({
        text:          String(params.text          ?? 'SCAN'),
        shape:         String(params.shape         ?? 'Quadrado arredondado'),
        nfcMountMode:  String(params.nfcMountMode  ?? 'Bolso interno (pausa)'),
        width:         Number(params.width         ?? 45),
        height:        Number(params.height        ?? 58),
        thickness:     Number(params.thickness     ?? 4),
        textDepth:     Number(params.textDepth     ?? 1.2),
        fontSize:      Number(params.fontSize      ?? 8),
        holeDiameter:  Number(params.holeDiameter  ?? 5),
        nfcDiameter:   Number(params.nfcDiameter   ?? 25),
        nfcClearance:  Number(params.nfcClearance  ?? 0.4),
        cavityDepth:   Number(params.cavityDepth   ?? 1.2),
        coverThickness: Number(params.coverThickness ?? 0.8),
        topCoverThickness: Number(params.topCoverThickness ?? 0.8),
        epoxyBorder:   booleanValue(params.epoxyBorder, true),
        borderHeight:  Number(params.borderHeight  ?? 1.2),
        fontName:      params.fontKey ? String(params.fontKey) : undefined,
      })
    }
    if (template === 'phone-stand') {
      return generatePhoneStandScad({
        deviceWidth: Number(params.deviceWidth ?? 75),
        deviceThickness: Number(params.deviceThickness ?? 10),
        standAngle: Number(params.standAngle ?? 65),
        baseDepth: Number(params.baseDepth ?? 90),
        lipHeight: Number(params.lipHeight ?? 12),
        cableSlotWidth: Number(params.cableSlotWidth ?? 14),
        wallThickness: Number(params.wallThickness ?? 4),
      })
    }
    throw new Error(`Unknown scadTemplate: ${template}`)
  }

  // Per-font cache: fontKey → TTF bytes
  private fontCache = new Map<string, Uint8Array>()

  /** Fetches a TTF font from public/fonts/ (same origin, no CORS) and caches it per session. */
  private async getFontData(fontKey?: string): Promise<{ data: Uint8Array; key: string } | null> {
    const entry = KEYCHAIN_FONTS.find(([, k]) => k === fontKey) ?? KEYCHAIN_FONTS[0]
    const [, key, filename] = entry

    const cached = this.fontCache.get(key)
    if (cached) return { data: cached, key }

    // Fonts are in public/fonts/ — served from the same origin at BASE_URL/fonts/
    const base = import.meta.env.BASE_URL ?? '/'
    const url = `${base}fonts/${filename}`

    try {
      const resp = await fetch(url)
      if (!resp.ok) {
        if (key !== KEYCHAIN_FONTS[0][1]) return this.getFontData(KEYCHAIN_FONTS[0][1])
        return null
      }
      const data = new Uint8Array(await resp.arrayBuffer())
      this.fontCache.set(key, data)
      return { data, key }
    } catch {
      if (key !== KEYCHAIN_FONTS[0][1]) return this.getFontData(KEYCHAIN_FONTS[0][1])
      return null
    }
  }

  private async renderScad(scadCode: string, fontKey?: string): Promise<ArrayBuffer> {
    try {
      const worker = this.ensureWorker()
      const id = ++this.requestId
      this.activeRequestId = id
      const fontData = (await this.getFontData(fontKey))?.data
      const fontPayload = fontData ? new Uint8Array(fontData).buffer : undefined
      const message: OpenScadRenderRequest = { id, scadCode, fontData: fontPayload }

      return await new Promise<ArrayBuffer>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pending.delete(id)
          if (this.activeRequestId === id) this.activeRequestId = null
          this.terminateWorker('Tempo limite do OpenSCAD excedido. Tente reduzir a complexidade do modelo.')
          reject(new Error('Tempo limite do OpenSCAD excedido. Tente reduzir a complexidade do modelo.'))
        }, OPENSCAD_WORKER_TIMEOUT_MS)

        this.pending.set(id, { resolve, reject, timer })
        worker.postMessage(message, fontPayload ? [fontPayload] : [])
      })
    } catch {
      const instance = await this.createInstance()
      const asciiStl = await instance.renderToStl(scadCode)
      if (!asciiStl || asciiStl.trim().length === 0) {
        throw new Error('OpenSCAD produced empty output.')
      }
      return asciiStlToArrayBuffer(asciiStl)
    }
  }
}
