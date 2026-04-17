/**
 * Gera o payload EMV BR Code para Pix estático.
 *
 * Especificação: Manual BR Code v2 (BACEN) — padrão TLV (Tag-Length-Value).
 * 100% client-side, sem API. O DICT lookup acontece no app do banco do pagador
 * no momento da leitura — não na geração.
 *
 * Campos fixos internos (invisíveis ao usuário):
 * - Nome: "PIX" (conformidade EMV, banco exibe nome real via DICT)
 * - Cidade: "BRASIL"
 */

export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'

export interface PixPayloadOptions {
  key: string
  keyType?: PixKeyType    // opcional — auto-detectado se omitido
  value?: number          // opcional — 0 ou undefined = pagador define
  identifier?: string     // opcional — ex: "mesa 5", "gorjeta"
  description?: string    // opcional — mensagem exibida ao pagador
}

/**
 * Detecta o tipo de chave Pix pelo formato da string.
 * Ordem de teste: email → UUID aleatório → CPF → CNPJ → telefone → aleatório.
 */
export function detectPixKeyType(key: string): PixKeyType {
  const k = key.trim()
  if (k.includes('@')) return 'email'
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k)) return 'random'
  const digits = k.replace(/\D/g, '')
  if (digits.length === 11) return 'cpf'
  if (digits.length === 14) return 'cnpj'
  if (k.startsWith('+') || /^(\+?55)?\d{10,11}$/.test(digits)) return 'phone'
  return 'random'
}

// ── TLV helpers ──────────────────────────────────────────────────────────────

function tlv(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, '0')}${value}`
}

// ── CRC16/CCITT-FALSE ────────────────────────────────────────────────────────

function crc16(str: string): string {
  let crc = 0xffff
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0')
}

// ── Normalização da chave ────────────────────────────────────────────────────

function normalizeKey(key: string, type: PixKeyType): string {
  const clean = key.trim()
  switch (type) {
    case 'cpf':
    case 'cnpj':
      return clean.replace(/\D/g, '')
    case 'phone': {
      // BACEN exige formato +55AANNNNNNNN (sem espaços, sem traços)
      const digits = clean.replace(/\D/g, '')
      if (clean.startsWith('+')) return clean  // já formatado: +5588996002134
      if (digits.startsWith('55') && digits.length >= 12) return `+${digits}` // já tem 55: 5588996002134
      return `+55${digits}` // adiciona prefixo: 88996002134 → +5588996002134
    }
    case 'email':
      return clean.toLowerCase()
    case 'random':
      return clean
  }
}

// ── Builder principal ────────────────────────────────────────────────────────

export function buildPixPayload(opts: PixPayloadOptions): string {
  const { key, value, identifier, description } = opts
  const keyType = opts.keyType ?? detectPixKeyType(key)

  const normalizedKey = normalizeKey(key, keyType)

  // Campo 26: Merchant Account Info (subcampos GUI + chave + descrição)
  const gui     = tlv('00', 'BR.GOV.BCB.PIX')
  const pixKey  = tlv('01', normalizedKey)
  const desc    = description ? tlv('02', description.substring(0, 72)) : ''
  const field26 = tlv('26', gui + pixKey + desc)

  // Campo 62: Additional Data (txid obrigatório pelo BACEN)
  const txid     = identifier ? identifier.substring(0, 25) : '***'
  const field62  = tlv('62', tlv('05', txid))

  // Campos obrigatórios
  const payload =
    tlv('00', '01') +                                     // Payload Format Indicator
    tlv('01', '11') +                                     // Static QR (11)
    field26 +                                             // Merchant Account Info
    tlv('52', '0000') +                                   // MCC (generic)
    tlv('53', '986') +                                    // Currency BRL
    (value && value > 0 ? tlv('54', value.toFixed(2)) : '') + // Amount (optional)
    tlv('58', 'BR') +                                     // Country Code
    tlv('59', 'PIX') +                                    // Merchant Name (bank shows real name via DICT)
    tlv('60', 'BRASIL') +                                 // Merchant City (internal)
    field62 +                                             // Additional Data
    '6304'                                                // CRC16 prefix (value calculated below)

  return payload + crc16(payload)
}
