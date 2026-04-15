export type GeometryMode = 'solid' | 'cutter' | 'cutter-stamp'

export interface ExtrudeConfig {
  pathData: string
  targetSize: number
  depth: number
  wallThickness?: number
  mode?: GeometryMode
  stampDepth?: number
  // Heightmap stamp fields
  imageData?: ImageData
  stampResolution?: number
  stampRelief?: number
  mirror?: boolean
}

export interface IGeometryBuilder {
  build(config: ExtrudeConfig): ArrayBuffer
}
