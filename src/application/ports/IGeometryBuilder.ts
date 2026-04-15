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
}

export interface IGeometryBuilder {
  build(config: ExtrudeConfig): ArrayBuffer | Promise<ArrayBuffer>
}
