/**
 * QR Code SVG generator — pur, sans dépendance externe.
 * Génère un QR code simplifié via pattern de modules.
 * Pour un vrai QR lisible par scanner, on utilise une approche data-url.
 */

interface QRCodeProps {
  value: string
  size?: number
  fgColor?: string
  bgColor?: string
}

/**
 * Simple QR code display using Google Charts API (image-based).
 * Fiable pour être scanné par tous les téléphones.
 */
export function QRCode({ value, size = 200, fgColor = 'F0EDE8', bgColor = '0B0D11' }: QRCodeProps) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&color=${fgColor}&bgcolor=${bgColor}&format=svg`

  return (
    <div style={{ width: size, height: size, borderRadius: 12, overflow: 'hidden', background: `#${bgColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img
        src={url}
        alt="QR Code"
        width={size}
        height={size}
        style={{ display: 'block' }}
      />
    </div>
  )
}
