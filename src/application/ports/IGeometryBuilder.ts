export type GeometryMode = 'solid' | 'cutter' | 'cutter-stamp'

export interface ExtrudeConfig {
  pathData: string
  targetSize: number
  depth: number
  wallThickness?: number
  mode?: GeometryMode
  stampDepth?: number

  /** Width of the cutting tip at the very bottom (mm). Default 0.4 */
  tipWidth?: number
  /** Height of the chamfer/taper section at the cutting edge (mm). Default 2 */
  chamferHeight?: number
  /** Number of discrete steps used to approximate the chamfer taper. Default 4 */
  chamferSteps?: number
  /** Width of the handle/base ring at the top (mm). Default 4 */
  baseWidth?: number
  /** Height of the handle/base ring (mm). Default 3.5 */
  baseHeight?: number

  /** Height of the solid stamp imprint plate (mm). Default 3 */
  stampImprintHeight?: number
  /** Height of the raised ring on the stamp back (mm). Default 4.5 */
  stampBackHeight?: number
  /** Tolerance gap so the stamp fits inside the cutter (mm). Default 0.9 */
  stampCutterTolerance?: number

  // Heightmap stamp fields
  imageData?: ImageData
  stampResolution?: number
  stampRelief?: number
  mirror?: boolean

  // Potrace stamp fields
  /** Luminance threshold for Potrace binarization (0–255). Default 128 */
  threshold?: number
  /** Suppress speckles smaller than this area in pixels². Default 4 */
  turdSize?: number
  /** Sampling steps per Bézier curve segment. Default 12 */
  bezierSteps?: number

  // QR Code fields
  qrType?: string          // 'pix' | 'wifi' | 'whatsapp' | 'url' | 'text'
  qrShowBase?: boolean     // false = only raised modules (no base plate)
  qrContent?: string       // the main content (key, URL, text, etc.)
  qrPixKeyType?: string    // 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'
  qrValue?: number         // optional Pix amount
  qrIdentifier?: string    // optional txid/label
  qrDescription?: string   // optional description
}

export interface IGeometryBuilder {
  build(config: ExtrudeConfig): ArrayBuffer | Promise<ArrayBuffer>
}
