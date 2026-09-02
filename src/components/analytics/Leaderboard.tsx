import InitialsAvatar from '../InitialsAvatar'
import { A, SERIES } from './theme'
import { displayUser } from '../../lib/utils'
import type { LeaderboardRow } from '../../lib/analytics'

interface Props {
  rows: LeaderboardRow[]
  emptyNote: string
}

// Horizontal stacked bars, one per reviewer: human approvals in the accent,
// dependabot approvals in slate, a 2px surface gap between them, the total at
// the tip. Bars are 10px so the row's air, not the fill, carries the weight.
export default function Leaderboard({ rows, emptyNote }: Props) {
  const max = rows.reduce((m, r) => Math.max(m, r.total), 0)
  if (rows.length === 0) {
    return <p className="py-6" style={{ color: A.text, fontSize: 12 }}>{emptyNote}</p>
  }
  return (
    <ol className="mt-3 space-y-2.5" data-testid="leaderboard">
      {rows.map((row, i) => {
        const width = max > 0 ? (row.total / max) * 100 : 0
        const humanShare = row.total > 0 ? (row.human / row.total) * 100 : 0
        const name = displayUser(row.reviewer)
        const detail = `${name}: ${row.human} on human PRs, ${row.dependabot} on dependabot PRs`
        return (
          <li key={row.reviewer} className="flex items-center gap-3" title={detail}>
            <span className="w-5 shrink-0 text-right tabular-nums" style={{ color: A.text, fontSize: 11 }}>
              {i + 1}
            </span>
            <InitialsAvatar name={name} size={26} className="shrink-0" />
            <span className="w-[132px] shrink-0 truncate" style={{ color: A.text, fontSize: 13, fontWeight: i === 0 ? 500 : 400 }}>
              {name}
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="flex h-[10px] overflow-visible" style={{ width: `${width}%`, minWidth: row.total > 0 ? 6 : 0 }} role="img" aria-label={detail}>
                {row.human > 0 && (
                  <span
                    style={{
                      width: `${humanShare}%`,
                      background: SERIES.human.color,
                      borderRadius: row.dependabot > 0 ? 0 : '0 4px 4px 0',
                    }}
                  />
                )}
                {row.dependabot > 0 && (
                  <span
                    style={{
                      flex: 1,
                      marginLeft: row.human > 0 ? 2 : 0,
                      background: SERIES.dependabot.color,
                      borderRadius: '0 4px 4px 0',
                    }}
                  />
                )}
              </div>
              <span className="shrink-0 tabular-nums" style={{ color: A.text, fontSize: 12, fontWeight: 600 }}>
                {row.total}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
