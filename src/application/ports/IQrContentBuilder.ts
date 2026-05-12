export interface QrContentBuildOptions {
  type: string
  content: string
  pixKeyType: string
  value?: number
  identifier?: string
  description?: string
}

export interface IQrContentBuilder {
  build(options: QrContentBuildOptions): string
}
