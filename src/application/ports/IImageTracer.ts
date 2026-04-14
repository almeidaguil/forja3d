export interface TraceResult {
  pathData: string
  width: number
  height: number
}

export interface IImageTracer {
  trace(imageData: ImageData, threshold: number): Promise<TraceResult>
}
