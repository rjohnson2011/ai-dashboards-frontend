import Sparkline from './Sparkline'
import { A } from './theme'
import { formatCompact, percentDelta } from '../../lib/analytics'

interface Props {
  label: string
  count: number
  previous?: number
  spark?: number[]
  note?: string
  testId?: string
}

export function Delta({ count, previous, period }: { count: number; previous: number; period: string }) {
  const pct = percentDelta(count, previous)
  if (pct === null) {
    return (
      <span style={{ color: A.text, fontSize: 12 }}>
        {previous === 0 && count === 0 ? `Nothing in the ${period} either` : `Up from none in the ${period}`}
      </span>
    )
  }
  const tone = pct > 0 ? A.up : pct < 0 ? A.down : A.text
  const glyph = pct > 0 ? '▲' : pct < 0 ? '▼' : '■'
  return (
    <span style={{ fontSize: 12, color: A.text }}>
      <span style={{ color: tone, fontWeight: 600 }} aria-label={`${pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'} ${Math.abs(pct)} percent`}>
        {glyph} {Math.abs(pct)}%
      </span>{' '}
      vs the {period}
    </span>
  )
}

export default function StatTile({ label, count, previous, spark, note, testId }: Props) {
  return (
    <div
      className="flex items-end justify-between gap-3 rounded-lg px-4 py-3"
      style={{ background: A.surface, border: `1px solid ${A.line}` }}
    >
      <div className="min-w-0">
        <div style={{ color: A.text, fontSize: 12, fontWeight: 400 }}>{label}</div>
        <div data-testid={testId} style={{ color: A.text, fontSize: 26, fontWeight: 600, lineHeight: 1.15, marginTop: 2 }}>
          {formatCompact(count)}
        </div>
        <div className="mt-1 truncate">
          {previous !== undefined ? (
            <Delta count={count} previous={previous} period={note ?? 'period before'} />
          ) : (
            note && <span style={{ color: A.text, fontSize: 12 }}>{note}</span>
          )}
        </div>
      </div>
      {spark && <Sparkline values={spark} />}
    </div>
  )
}
