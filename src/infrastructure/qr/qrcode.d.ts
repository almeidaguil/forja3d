declare module 'qrcode' {
  interface QRData { modules: { data: Uint8ClampedArray; size: number } }
  interface Options { errorCorrectionLevel?: 'L'|'M'|'Q'|'H'; margin?: number; width?: number; type?: string }
  function create(text: string, opts?: Options): QRData
  function toString(text: string, opts?: Options): Promise<string>
  function toDataURL(text: string, opts?: Options): Promise<string>
}
