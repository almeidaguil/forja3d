import type { ChangeEvent, JSX } from 'react'
import type { ParameterSchema, ParameterValue } from '../../../shared/types'

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

function ParameterField({ param, value, onChange }: FieldProps): JSX.Element {
  switch (param.type) {
    case 'number':  return <NumberField  param={param} value={value} onChange={onChange} />
    case 'color':   return <ColorField   param={param} value={value} onChange={onChange} />
    case 'boolean': return <BooleanField param={param} value={value} onChange={onChange} />
    case 'select':  return <SelectField  param={param} value={value} onChange={onChange} />
    default:        return <StringField  param={param} value={value} onChange={onChange} />
  }
}

interface ParameterFormProps {
  parameters: ParameterSchema[]
  values: Record<string, ParameterValue>
  onChange: (key: string, value: ParameterValue) => void
}

export function ParameterForm({ parameters, values, onChange }: ParameterFormProps): JSX.Element {
  return (
    <div className="space-y-5">
      {parameters.map((param) => (
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
