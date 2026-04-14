/**
 * Graphique radar 5 branches — Body Scan
 * Affiche : Poids, Masse grasse, Muscle, Hydratation, Viscéral
 */

interface RadarMetric {
  label: string
  value: number   // valeur brute
  max: number     // valeur max pour normalisation
  color: string
}

interface BodyScanRadarProps {
  metrics: RadarMetric[]
  size?: number
}

export function BodyScanRadar({ metrics, size = 200 }: BodyScanRadarProps) {
  const center = size / 2
  const maxR = size * 0.35
  const labelR = size * 0.46

  const count = metrics.length
  const angleStep = (2 * Math.PI) / count

  const toXY = (index: number, radius: number) => ({
    x: center + radius * Math.sin(index * angleStep),
    y: center - radius * Math.cos(index * angleStep),
  })

  // Normalize values 0-1
  const normalized = metrics.map(m => Math.min(1, Math.max(0.05, m.value / m.max)))

  // Grid levels
  const gridLevels = [0.33, 0.66, 1]

  // Data polygon
  const dataPoints = normalized.map((v, i) => toXY(i, v * maxR))
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid circles */}
      {gridLevels.map(level => {
        const points = Array.from({ length: count }, (_, i) => toXY(i, level * maxR))
        const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z'
        return <path key={level} d={path} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      })}

      {/* Axis lines */}
      {Array.from({ length: count }, (_, i) => {
        const end = toXY(i, maxR)
        return <line key={i} x1={center} y1={center} x2={end.x} y2={end.y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      })}

      {/* Data polygon fill */}
      <path d={dataPath} fill="rgba(201,168,76,0.12)" stroke="#C9A84C" strokeWidth="1.5" strokeLinejoin="round" />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={metrics[i].color} />
      ))}

      {/* Labels */}
      {metrics.map((m, i) => {
        const pos = toXY(i, labelR)
        return (
          <text
            key={m.label}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#7A8099"
            fontSize="9"
            fontFamily="DM Sans, sans-serif"
          >
            {m.label}
          </text>
        )
      })}
    </svg>
  )
}
