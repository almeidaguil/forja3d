export interface IQrAssetExporter {
  toSvg(content: string): Promise<string>
  toPngDataUrl(content: string): Promise<string>
}
