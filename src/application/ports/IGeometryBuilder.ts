export interface ExtrudeConfig {
  pathData: string
  targetSize: number
  depth: number
  wallThickness?: number
}

export interface IGeometryBuilder {
  build(config: ExtrudeConfig): ArrayBuffer
}
