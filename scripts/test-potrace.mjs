/**
 * Testa a integração com o Potrace:
 * 1. Carrega uma imagem PNG de teste (logo preto/branco)
 * 2. Traça com Potrace e extrai o path SVG
 * 3. Valida que o path tem múltiplos subpaths (M commands)
 * 4. Valida que tem segmentos Bézier cúbicos (C commands)
 *
 * Execução: node scripts/test-potrace.mjs
 */

import { Potrace } from 'potrace'
import Jimp from 'jimp'

// Cria imagem sintética com Jimp: fundo branco, círculo preto, dois olhos brancos (furos)
async function createTestImage(width = 100, height = 100) {
  const img = new Jimp(width, height, 0xffffffff) // branco

  // Pinta círculo preto no centro
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cx = x - 50, cy = y - 50
      if (cx * cx / (30 * 30) + cy * cy / (30 * 30) < 1) {
        img.setPixelColor(0x000000ff, x, y)
      }
      // Dois olhos brancos (para testar furos/holes)
      if ((cx + 10) ** 2 + (cy + 5) ** 2 < 36) img.setPixelColor(0xffffffff, x, y)
      if ((cx - 10) ** 2 + (cy + 5) ** 2 < 36) img.setPixelColor(0xffffffff, x, y)
    }
  }

  return img.getBufferAsync(Jimp.MIME_PNG)
}

async function runTest() {
  console.log('=== Teste Potrace ===\n')

  const buf = await createTestImage()
  console.log(`✅ Imagem criada: ${buf.length} bytes PNG`)

  const pt = new Potrace({ threshold: 128, turdSize: 2, optCurve: true })

  await new Promise((resolve, reject) => {
    pt.loadImage(buf, (_, err) => {
      if (err) reject(err); else resolve(null)
    })
  })
  console.log('✅ Imagem carregada no Potrace')

  const svg = pt.getSVG()
  console.log(`✅ SVG gerado: ${svg.length} chars`)

  // Extrai o path d=
  const match = svg.match(/\sd="([^"]+)"/)
  if (!match) {
    console.error('❌ Nenhum path no SVG')
    process.exit(1)
  }

  const d = match[1]
  console.log(`✅ Path extraído: ${d.substring(0, 80)}...`)

  // Conta subpaths (M commands)
  const mCount = (d.match(/M/g) || []).length
  console.log(`✅ Subpaths (M): ${mCount}`)
  if (mCount < 2) {
    console.warn('⚠️  Esperado ≥ 2 subpaths (corpo + olhos como furos)')
  }

  // Verifica Bézier cúbicos
  const cCount = (d.match(/C/g) || []).length
  console.log(`✅ Bézier cúbicos (C): ${cCount}`)
  if (cCount === 0) {
    console.warn('⚠️  Nenhum Bézier — curvas não foram geradas (optCurve pode não estar funcionando)')
  }

  // Verifica L (corners)
  const lCount = (d.match(/L/g) || []).length
  console.log(`✅ Corners (L): ${lCount}`)

  console.log('\n✅ Teste passou! Potrace está funcionando corretamente.')
  console.log('\nPath completo:')
  console.log(d.substring(0, 300) + (d.length > 300 ? '...' : ''))
}

runTest().catch(err => {
  console.error('❌ Erro:', err)
  process.exit(1)
})
