import { A } from './theme'

interface Props {
  values: number[]
  width?: number
  height?: number
}

// Twelve-ish point sparkline: the run in de-emphasis slate, the latest
// segment and its end-dot in the accent so "now" reads at a glance.
export default function Sparkline({ values, width = 96, height = 28 }: Props) {
  if (values.length < 2) return null
  const max = Math.max(1, ...values)
  const stepX = width / (values.length - 1)
  const pad = 3
  const y = (v: number) => height - pad - (v / max) * (height - pad * 2)
  const pts = values.map((v, i) => [i * stepX, y(v)] as const)
  const path = pts.map(([x, py], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${py.toFixed(1)}`).join(' ')
  const [px, py] = pts[pts.length - 2]
  const [lx, ly] = pts[pts.length - 1]
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="shrink-0 overflow-visible">
      <path d={path} fill="none" stroke={A.muted} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <path d={`M${px.toFixed(1)},${py.toFixed(1)} L${lx.toFixed(1)},${ly.toFixed(1)}`} fill="none" stroke={A.accent} strokeWidth={2} strokeLinecap="round" />
      <circle cx={lx} cy={ly} r={4} fill={A.accent} stroke={A.surface} strokeWidth={2} />
    </svg>
  )
}
