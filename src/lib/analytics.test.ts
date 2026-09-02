import { describe, it, expect } from 'vitest'
import {
  type ApprovalEvent,
  dailySeries,
  windowSummary,
  leaderboardRows,
  weekdayHeatmap,
  formatCompact,
} from './analytics'

// Fixed "now": Wednesday 2026-09-02 at noon local time.
const NOW = new Date(2026, 8, 2, 12, 0, 0)

function ev(reviewer: string, daysAgo: number, dependabot = false, hoursAgo = 0): ApprovalEvent {
  const at = new Date(NOW.getTime() - daysAgo * 86_400_000 - hoursAgo * 3_600_000)
  return { reviewer, at: at.toISOString(), dependabot, pr: 1, repo: 'vets-api' }
}

describe('dailySeries', () => {
  it('buckets approvals by local day over the requested span, zero-filled, ending today', () => {
    const events = [ev('bob', 0), ev('bob', 1), ev('carol', 1, true), ev('bob', 5)]
    const series = dailySeries(events, 3, NOW)
    expect(series).toEqual([
      { date: '2026-08-31', human: 0, dependabot: 0 },
      { date: '2026-09-01', human: 1, dependabot: 1 },
      { date: '2026-09-02', human: 1, dependabot: 0 },
    ])
  })
})

describe('windowSummary', () => {
  it('counts each window and the equal-length window before it', () => {
    const events = [
      ev('bob', 0, false, 2), // today, within 24h
      ev('bob', 1, false, 6), // 30h ago: previous day, inside the week
      ev('carol', 10), // inside 30 days, outside the week
      ev('carol', 20, true),
      ev('dan', 45), // previous 30-day window
    ]
    const s = windowSummary(events, NOW)
    expect(s.day.count).toBe(1)
    expect(s.day.previous).toBe(1)
    expect(s.week.count).toBe(2)
    expect(s.week.previous).toBe(1)
    expect(s.month.count).toBe(4)
    expect(s.month.previous).toBe(1)
  })

  it('gives each window a sparkline with one point per sub-bucket', () => {
    const s = windowSummary([ev('bob', 0), ev('bob', 2)], NOW)
    expect(s.day.spark).toHaveLength(24)
    expect(s.week.spark).toHaveLength(7)
    expect(s.month.spark).toHaveLength(30)
    expect(s.day.spark[23]).toBe(1)
    expect(s.week.spark[6]).toBe(1)
    expect(s.week.spark[4]).toBe(1)
  })
})

describe('leaderboardRows', () => {
  it('merges the human and dependabot scopes per reviewer, sorted by total', () => {
    const scopes = {
      human: { week: [{ reviewer: 'bob', count: 3 }, { reviewer: 'carol', count: 1 }] },
      dependabot: { week: [{ reviewer: 'carol', count: 4 }] },
    }
    expect(leaderboardRows(scopes, 'week')).toEqual([
      { reviewer: 'carol', human: 1, dependabot: 4, total: 5 },
      { reviewer: 'bob', human: 3, dependabot: 0, total: 3 },
    ])
  })
})

describe('weekdayHeatmap', () => {
  it('counts approvals per reviewer per weekday for the busiest reviewers', () => {
    // 2026-09-02 is a Wednesday (index 3). One day earlier is Tuesday (2).
    const events = [ev('bob', 0), ev('bob', 0), ev('bob', 1), ev('carol', 1)]
    const heat = weekdayHeatmap(events, 2)
    expect(heat.reviewers).toEqual(['bob', 'carol'])
    expect(heat.rows[0]).toEqual([0, 0, 1, 2, 0, 0, 0])
    expect(heat.rows[1]).toEqual([0, 0, 1, 0, 0, 0, 0])
    expect(heat.max).toBe(2)
  })

  it('limits to the top N reviewers', () => {
    const events = [ev('a', 0), ev('a', 0), ev('b', 0), ev('c', 0)]
    expect(weekdayHeatmap(events, 1).reviewers).toEqual(['a'])
  })
})

describe('formatCompact', () => {
  it('keeps small numbers whole and compacts thousands', () => {
    expect(formatCompact(842)).toBe('842')
    expect(formatCompact(1284)).toBe('1.3K')
    expect(formatCompact(12900)).toBe('12.9K')
  })
})
