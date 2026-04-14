export type GeometryMode = 'solid' | 'cutter' | 'cutter-stamp'

export interface ExtrudeConfig {
  pathData: string
  targetSize: number
  depth: number
  wallThickness?: number
  mode?: GeometryMode
  stampDepth?: number
}

export interface IGeometryBuilder {
  build(config: ExtrudeConfig): ArrayBuffer
}
