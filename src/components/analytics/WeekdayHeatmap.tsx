import { A } from './theme'
import { displayUser } from '../../lib/utils'
import type { Heatmap } from '../../lib/analytics'

interface Props {
  heat: Heatmap
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Sequential single hue: the accent at rising opacity, so an empty cell
// recedes into the surface and the busiest cell is solid violet.
function fill(v: number, max: number): { background: string; color: string } {
  if (v === 0 || max === 0) return { background: 'rgba(148,163,184,0.06)', color: A.text }
  const alpha = 0.16 + 0.84 * (v / max)
  return { background: `rgba(139,124,246,${alpha.toFixed(2)})`, color: alpha > 0.62 ? A.bg : A.text }
}

export default function WeekdayHeatmap({ heat }: Props) {
  if (heat.reviewers.length === 0) {
    return <p className="py-6" style={{ color: A.text, fontSize: 12 }}>No approvals in the last 90 days.</p>
  }
  return (
    <div data-testid="heatmap" className="mt-3">
      <div className="grid gap-1" style={{ gridTemplateColumns: '120px repeat(7, minmax(0, 1fr))' }}>
        <span />
        {DAYS.map(d => (
          <span key={d} className="text-center" style={{ color: A.text, fontSize: 11 }}>{d}</span>
        ))}
        {heat.reviewers.map((reviewer, r) => {
          const name = displayUser(reviewer)
          return (
            <Row key={reviewer} name={name} values={heat.rows[r]} max={heat.max} />
          )
        })}
      </div>
      <div className="mt-3 flex items-center gap-2" style={{ color: A.text, fontSize: 11 }}>
        <span>0</span>
        <span
          aria-hidden
          className="h-2 w-24 rounded-sm"
          style={{ background: `linear-gradient(90deg, rgba(139,124,246,0.16), ${A.accent})` }}
        />
        <span>{heat.max} approvals</span>
      </div>
    </div>
  )
}

function Row({ name, values, max }: { name: string; values: number[]; max: number }) {
  return (
    <>
      <span className="truncate self-center pr-2" style={{ color: A.text, fontSize: 12 }} title={name}>
        {name}
      </span>
      {values.map((v, d) => {
        const style = fill(v, max)
        return (
          <span
            key={d}
            className="flex h-8 items-center justify-center rounded-[4px] tabular-nums"
            style={{ ...style, fontSize: 11, fontWeight: 500 }}
            title={`${name}, ${DAYS[d]}: ${v} approval${v === 1 ? '' : 's'}`}
          >
            {v > 0 ? v : ''}
          </span>
        )
      })}
    </>
  )
}
