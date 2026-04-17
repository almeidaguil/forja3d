/**
 * Pré-processa ImageData preenchendo regiões fechadas com flood-fill inverso.
 *
 * Converte imagens de contorno (traços finos, não preenchidas) em silhuetas
 * sólidas antes do tracing, eliminando polígonos com apenas o outline que
 * causariam "mesh not closed" no OpenSCAD.
 *
 * Algoritmo:
 *   1. Binariza (foreground = pixel escuro e opaco)
 *   2. Dilata foreground 1px (4-conectividade) para fechar gaps nos traços
 *   3. BFS a partir dos pixels de borda que são background (exterior alcançável)
 *   4. Pixels background não alcançados = interiores fechados → pintados de preto
 *   5. Retorna novo ImageData; o original não é modificado
 *
 * Idempotente: imagem já sólida produz saída visualmente idêntica.
 */
export function fillEnclosedRegions(imageData: ImageData, threshold: number): ImageData {
  const { width, height, data } = imageData

  // 1. Grid binário após limiar (foreground = 1)
  const fg = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const alpha = data[i * 4 + 3]
    const luma = data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114
    fg[i] = alpha >= 128 && luma < threshold ? 1 : 0
  }

  // 2. Dilata foreground 1px — guards por eixo evitam wrap-around horizontal
  const dilated = new Uint8Array(fg)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (fg[y * width + x] !== 1) continue
      if (x > 0)          dilated[y * width + x - 1] = 1
      if (x < width - 1)  dilated[y * width + x + 1] = 1
      if (y > 0)          dilated[(y - 1) * width + x] = 1
      if (y < height - 1) dilated[(y + 1) * width + x] = 1
    }
  }

  // 3. BFS dos pixels de borda que são background (externo alcançável)
  const external = new Uint8Array(width * height)
  const queue: number[] = []

  const enqueue = (i: number): void => {
    if (dilated[i] === 0 && external[i] === 0) {
      external[i] = 1
      queue.push(i)
    }
  }

  for (let x = 0; x < width; x++) { enqueue(x); enqueue((height - 1) * width + x) }
  for (let y = 1; y < height - 1; y++) { enqueue(y * width); enqueue(y * width + width - 1) }

  let head = 0
  while (head < queue.length) {
    const i = queue[head++]
    const y = Math.floor(i / width)
    const x = i % width
    if (y > 0)          enqueue(i - width)
    if (y < height - 1) enqueue(i + width)
    if (x > 0)          enqueue(i - 1)
    if (x < width - 1)  enqueue(i + 1)
  }

  // 4. Pixels background não alcançados = interiores → pinta preto
  const out = new ImageData(new Uint8ClampedArray(data), width, height)
  for (let i = 0; i < width * height; i++) {
    if (dilated[i] === 0 && external[i] === 0) {
      out.data[i * 4]     = 0
      out.data[i * 4 + 1] = 0
      out.data[i * 4 + 2] = 0
      out.data[i * 4 + 3] = 255
    }
  }
  return out
}
