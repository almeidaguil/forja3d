import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, JSX } from 'react'
import type { ParameterSchema, ParameterValue } from '../../../shared/types'


// Display labels for each font key — kept in sync with KEYCHAIN_FONTS in OpenScadGeometryBuilder
const FONT_LABEL: Record<string, string> = {
  NotoSans: 'Noto Sans', Roboto: 'Roboto', OpenSans: 'Open Sans',
  Montserrat: 'Montserrat', Lato: 'Lato', Raleway: 'Raleway',
  Oswald: 'Oswald', Anton: 'Anton', BebasNeue: 'Bebas Neue',
  Righteous: 'Righteous', AlfaSlabOne: 'Alfa Slab One',
  Pacifico: 'Pacifico', DancingScript: 'Dancing Script', GreatVibes: 'Great Vibes',
  Sacramento: 'Sacramento', Satisfy: 'Satisfy', Lobster: 'Lobster',
  Caveat: 'Caveat', PlayfairDisplay: 'Playfair Display', Merriweather: 'Merriweather',
}

// Google Fonts CSS family names for preview (separate from TTF for WASM)
const FONT_CSS_FAMILY: Record<string, string> = {
  NotoSans: 'Noto Sans', Roboto: 'Roboto', OpenSans: 'Open Sans',
  Montserrat: 'Montserrat', Lato: 'Lato', Raleway: 'Raleway',
  Oswald: 'Oswald', Anton: 'Anton', BebasNeue: 'Bebas Neue',
  Righteous: 'Righteous', AlfaSlabOne: 'Alfa Slab One',
  Pacifico: 'Pacifico', DancingScript: 'Dancing Script', GreatVibes: 'Great Vibes',
  Sacramento: 'Sacramento', Satisfy: 'Satisfy', Lobster: 'Lobster',
  Caveat: 'Caveat', PlayfairDisplay: 'Playfair Display', Merriweather: 'Merriweather',
}

let fontsLoaded = false
function loadGoogleFonts(): void {
  if (fontsLoaded || typeof document === 'undefined') return
  fontsLoaded = true
  // Load web fonts for UI preview only (WOFF2 for browser — TTF loaded separately for OpenSCAD)
  const families = [
    'Noto+Sans:wght@700', 'Roboto:wght@700', 'Open+Sans:wght@700',
    'Montserrat:wght@700', 'Lato:wght@700', 'Raleway:wght@700',
    'Oswald:wght@700', 'Anton', 'Bebas+Neue', 'Righteous', 'Alfa+Slab+One',
    'Pacifico', 'Dancing+Script:wght@700', 'Great+Vibes',
    'Sacramento', 'Satisfy', 'Lobster', 'Caveat:wght@700',
    'Playfair+Display:wght@700',
  ].join('&family=')
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`
  document.head.appendChild(link)
}

function FontPickerField({ param, value, onChange }: FieldProps): JSX.Element {
  const selected = String(value || param.default)
  const keys = param.options ?? []

  useEffect(() => { loadGoogleFonts() }, [])

  return (
    <div className="space-y-1.5">
      <span className="text-sm text-zinc-300 block">{param.label}</span>
      <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
        {keys.map((key) => {
          const family = FONT_CSS_FAMILY[key] ?? key
          const label  = FONT_LABEL[key]  ?? key
          const active = selected === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(param.key, key)}
              className={`px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                active
                  ? 'border-orange-500 bg-orange-500/10 text-orange-300'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-200 hover:border-zinc-500'
              }`}
              style={{ fontFamily: `'${family}', sans-serif` }}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface FieldProps {
  param: ParameterSchema
  value: ParameterValue
  onChange: (key: string, value: ParameterValue) => void
}

function NumberField({ param, value, onChange }: FieldProps): JSX.Element {
  const num = typeof value === 'number' ? value : (param.default as number)
  const label = param.unit ? `${param.label} (${param.unit})` : param.label
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-zinc-300">{label}</span>
        <span className="font-mono text-orange-400">{num}</span>
      </div>
      <input
        type="range"
        min={param.min}
        max={param.max}
        step={param.step ?? 1}
        value={num}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(param.key, Number(e.target.value))}
        className="w-full accent-orange-500 cursor-pointer"
      />
    </div>
  )
}

function ColorField({ param, value, onChange }: FieldProps): JSX.Element {
  const color = typeof value === 'string' ? value : String(param.default)
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-zinc-300">{param.label}</span>
      <label className="flex items-center gap-2 cursor-pointer">
        <span className="text-xs text-zinc-500 font-mono">{color}</span>
        <span
          className="w-8 h-8 rounded-md border border-zinc-600"
          style={{ backgroundColor: color }}
        />
        <input
          type="color"
          value={color}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(param.key, e.target.value)}
          className="sr-only"
        />
      </label>
    </div>
  )
}

function StringField({ param, value, onChange }: FieldProps): JSX.Element {
  const str = typeof value === 'string' ? value : String(param.default)
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-zinc-300 block">{param.label}</label>
      <input
        type="text"
        value={str}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(param.key, e.target.value)}
        className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
      />
    </div>
  )
}

function BooleanField({ param, value, onChange }: FieldProps): JSX.Element {
  const checked = typeof value === 'boolean' ? value : Boolean(param.default)
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-zinc-300">{param.label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(param.key, !checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-orange-500 ${
          checked ? 'bg-orange-500' : 'bg-zinc-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

function SelectField({ param, value, onChange }: FieldProps): JSX.Element {
  const selected = String(value)
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-zinc-300 block">{param.label}</label>
      <select
        value={selected}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(param.key, e.target.value)}
        className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
      >
        {(param.options ?? []).map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  )
}

function ImageField({ param, onChange }: FieldProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleFileChange(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0]
    if (!file) return

    const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Formato não suportado. Use PNG, JPG ou WEBP.')
      return
    }

    const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
    if (file.size > MAX_SIZE) {
      setError('Imagem muito grande. Máximo: 5 MB.')
      return
    }

    setError(null)
    setFileName(file.name)
    onChange(param.key, file as unknown as ParameterValue)
  }

  return (
    <div className="space-y-2">
      <span className="text-sm text-zinc-300 block">{param.label}</span>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          className="sr-only"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 hover:border-orange-500 transition-colors"
        >
          {fileName ? '✓ Arquivo selecionado' : 'Escolher imagem'}
        </button>
        {fileName && <span className="text-xs text-zinc-400 py-2">{fileName}</span>}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

function ParameterField({ param, value, onChange }: FieldProps): JSX.Element {
  // Font picker: special select for keychain font selection
  if (param.type === 'select' && param.key === 'fontKey') {
    return <FontPickerField param={param} value={value} onChange={onChange} />
  }
  switch (param.type) {
    case 'number':  return <NumberField  param={param} value={value} onChange={onChange} />
    case 'color':   return <ColorField   param={param} value={value} onChange={onChange} />
    case 'boolean': return <BooleanField param={param} value={value} onChange={onChange} />
    case 'select':  return <SelectField  param={param} value={value} onChange={onChange} />
    case 'image':   return <ImageField   param={param} value={value} onChange={onChange} />
    default:        return <StringField  param={param} value={value} onChange={onChange} />
  }
}

function isParameterVisible(param: ParameterSchema, values: Record<string, ParameterValue>): boolean {
  if (param.key === 'qrContent') return values.qrType !== 'Wi-Fi'
  if (param.key === 'wifiPassword') {
    return values.qrType === 'Wi-Fi' && values.wifiSecurity !== 'Sem senha'
  }
  if (['wifiSsid', 'wifiPassword', 'wifiSecurity'].includes(param.key)) {
    return values.qrType === 'Wi-Fi'
  }
  return true
}

interface ParameterFormProps {
  parameters: ParameterSchema[]
  values: Record<string, ParameterValue>
  onChange: (key: string, value: ParameterValue) => void
}

export function ParameterForm({ parameters, values, onChange }: ParameterFormProps): JSX.Element {
  return (
    <div className="space-y-5">
      {parameters.filter((param) => isParameterVisible(param, values)).map((param) => (
        <ParameterField
          key={param.key}
          param={param}
          value={values[param.key] ?? param.default}
          onChange={onChange}
        />
      ))}
    </div>
  )
}
