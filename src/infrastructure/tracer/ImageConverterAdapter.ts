import type { ConvertImageOptions, IImageConverter } from '../../application/ports/IImageConverter'

const MAX_SVG_TRACE_DIMENSION = 2048

export class ImageConverterAdapter implements IImageConverter {
  async convert(imageData: ImageData, options: ConvertImageOptions): Promise<ArrayBuffer> {
    const { format, quality = 0.85, scale = 1 } = options

    switch (format) {
      case 'png':
        return this.convertWithCanvas(imageData, 'image/png', scale)
      case 'jpg':
      case 'jpeg':
        return this.convertWithCanvas(imageData, 'image/jpeg', scale, quality)
      case 'webp':
        return this.convertWithCanvas(imageData, 'image/webp', scale, quality)
      case 'svg':
        return this.convertToSvg(imageData)
      case 'bmp':
        return this.convertToBmp(imageData, scale)
      default:
        throw new Error(`Formato nao suportado: ${format}`)
    }
  }

  private convertWithCanvas(
    imageData: ImageData,
    mimeType: string,
    scale: number,
    quality?: number,
  ): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const canvas = this.createScaledCanvas(imageData, scale)
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error(`Falha ao converter para ${mimeType}`))
          return
        }
        blob.arrayBuffer().then(resolve).catch(reject)
      }, mimeType, quality)
    })
  }

  private convertToBmp(imageData: ImageData, scale: number): ArrayBuffer {
    const canvas = this.createScaledCanvas(imageData, scale)
    const data = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height)
    if (!data) throw new Error('Falha ao obter dados da imagem')
    return this.encodeBmp(data)
  }

  private async convertToSvg(imageData: ImageData): Promise<ArrayBuffer> {
    const tracedImage = this.prepareTraceImage(imageData)
    const pathData = this.createRunLengthPath(tracedImage)
    if (!pathData) throw new Error('Nao foi possivel gerar caminho SVG para a imagem')
    const svg = this.createVectorSvg(pathData, tracedImage.width, tracedImage.height)
    return new TextEncoder().encode(svg).buffer
  }

  private prepareTraceImage(imageData: ImageData): ImageData {
    const source = this.resizeImageDataForTrace(this.cropTransparentBounds(imageData))
    const out = new ImageData(source.width, source.height)
    for (let i = 0; i < source.data.length; i += 4) {
      const r = source.data[i]
      const g = source.data[i + 1]
      const b = source.data[i + 2]
      const a = source.data[i + 3]
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b
      const value = a > 0 && luminance < 128 ? 0 : 255
      out.data[i] = value
      out.data[i + 1] = value
      out.data[i + 2] = value
      out.data[i + 3] = 255
    }
    return out
  }

  private cropTransparentBounds(imageData: ImageData): ImageData {
    let minX = imageData.width
    let minY = imageData.height
    let maxX = -1
    let maxY = -1

    for (let y = 0; y < imageData.height; y += 1) {
      for (let x = 0; x < imageData.width; x += 1) {
        if (imageData.data[(y * imageData.width + x) * 4 + 3] === 0) continue
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }

    if (maxX < minX || maxY < minY) return imageData

    const canvas = this.createCanvasFromImageData(imageData)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Falha ao obter contexto 2D do canvas')
    return ctx.getImageData(minX, minY, maxX - minX + 1, maxY - minY + 1)
  }

  private resizeImageDataForTrace(imageData: ImageData): ImageData {
    const maxDimension = Math.max(imageData.width, imageData.height)
    if (maxDimension <= MAX_SVG_TRACE_DIMENSION) return imageData

    const scale = MAX_SVG_TRACE_DIMENSION / maxDimension
    const width = Math.max(1, Math.round(imageData.width * scale))
    const height = Math.max(1, Math.round(imageData.height * scale))
    const sourceCanvas = this.createCanvasFromImageData(imageData)
    const targetCanvas = document.createElement('canvas')
    targetCanvas.width = width
    targetCanvas.height = height
    const ctx = targetCanvas.getContext('2d')
    if (!ctx) throw new Error('Falha ao obter contexto 2D do canvas')
    ctx.drawImage(sourceCanvas, 0, 0, width, height)
    return ctx.getImageData(0, 0, width, height)
  }

  private createRunLengthPath(imageData: ImageData): string {
    const commands: string[] = []
    for (let y = 0; y < imageData.height; y += 1) {
      let x = 0
      while (x < imageData.width) {
        while (x < imageData.width && !this.isFilledPixel(imageData, x, y)) x += 1
        if (x >= imageData.width) break

        const startX = x
        while (x < imageData.width && this.isFilledPixel(imageData, x, y)) x += 1
        commands.push(`M${startX} ${y}H${x}V${y + 1}H${startX}Z`)
      }
    }
    return commands.join('')
  }

  private isFilledPixel(imageData: ImageData, x: number, y: number): boolean {
    return imageData.data[(y * imageData.width + x) * 4] === 0
  }

  private createVectorSvg(pathData: string, width: number, height: number): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><path d="${pathData}" fill="#000000" fill-rule="evenodd"/></svg>`
  }

  private createScaledCanvas(imageData: ImageData, scale: number): HTMLCanvasElement {
    const sourceCanvas = this.createCanvasFromImageData(imageData)

    if (scale === 1) return sourceCanvas

    const scaledCanvas = document.createElement('canvas')
    scaledCanvas.width = Math.round(imageData.width * scale)
    scaledCanvas.height = Math.round(imageData.height * scale)
    const scaledCtx = scaledCanvas.getContext('2d')
    if (!scaledCtx) throw new Error('Falha ao obter contexto 2D do canvas escalado')
    scaledCtx.drawImage(sourceCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height)
    return scaledCanvas
  }

  private createCanvasFromImageData(imageData: ImageData): HTMLCanvasElement {
    const sourceCanvas = document.createElement('canvas')
    sourceCanvas.width = imageData.width
    sourceCanvas.height = imageData.height
    const sourceCtx = sourceCanvas.getContext('2d')
    if (!sourceCtx) throw new Error('Falha ao obter contexto 2D do canvas')
    sourceCtx.putImageData(imageData, 0, 0)
    return sourceCanvas
  }

  private encodeBmp(imageData: ImageData): ArrayBuffer {
    const bytesPerPixel = 3
    const headerSize = 54
    const rowStride = Math.ceil((imageData.width * bytesPerPixel) / 4) * 4
    const imageSize = rowStride * imageData.height
    const buffer = new ArrayBuffer(headerSize + imageSize)
    const view = new DataView(buffer)
    const bytes = new Uint8Array(buffer)

    this.writeBmpHeader(view, bytes, imageData.width, imageData.height, imageSize)
    this.writeBmpPixels(bytes, imageData.data, imageData.width, imageData.height, rowStride)

    return buffer
  }

  private writeBmpHeader(
    view: DataView,
    bytes: Uint8Array,
    width: number,
    height: number,
    imageSize: number,
  ): void {
    bytes[0] = 0x42
    bytes[1] = 0x4d
    view.setUint32(2, 54 + imageSize, true)
    view.setUint32(10, 54, true)
    view.setUint32(14, 40, true)
    view.setInt32(18, width, true)
    view.setInt32(22, -height, true)
    view.setUint16(26, 1, true)
    view.setUint16(28, 24, true)
    view.setUint32(34, imageSize, true)
  }

  private writeBmpPixels(
    bytes: Uint8Array,
    data: Uint8ClampedArray,
    width: number,
    height: number,
    rowStride: number,
  ): void {
    for (let y = 0; y < height; y += 1) {
      const rowOffset = 54 + y * rowStride
      for (let x = 0; x < width; x += 1) {
        const source = (y * width + x) * 4
        const target = rowOffset + x * 3
        bytes[target] = data[source + 2]
        bytes[target + 1] = data[source + 1]
        bytes[target + 2] = data[source]
      }
    }
  }
}
