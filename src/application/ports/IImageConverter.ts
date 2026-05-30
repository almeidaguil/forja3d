export type ImageFormat = 'png' | 'jpg' | 'jpeg' | 'webp' | 'svg' | 'bmp'

export interface ConvertImageOptions {
  format: ImageFormat
  quality?: number
  scale?: number
}

export interface IImageConverter {
  /**
   * Converte uma imagem de um formato para outro
   * @param imageData Dados da imagem de entrada
   * @param options Opções de conversão (formato de saída, qualidade, etc)
   * @returns ArrayBuffer com a imagem convertida
   */
  convert(
    imageData: ImageData,
    options: ConvertImageOptions
  ): Promise<ArrayBuffer>
}
