import { describe, it, expect } from 'vitest'
import {
  type ApprovalEvent,
  weekdaySeries,
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

describe('weekdaySeries', () => {
  it('skips Saturday and Sunday, folds their approvals into Monday, and ends on the last completed day', () => {
    // NOW is Wed Sep 2. Seven days ending yesterday covers Wed Aug 26 .. Tue Sep 1.
    const events = [
      ev('bob', 7), // Wed Aug 26
      ev('bob', 4), // Sat Aug 29 -> Mon Aug 31
      ev('carol', 3, true), // Sun Aug 30 -> Mon Aug 31
      ev('bob', 2), // Mon Aug 31
      ev('bob', 0), // today: not a completed day
    ]
    expect(weekdaySeries(events, 7, NOW)).toEqual([
      { date: '2026-08-26', human: 1, dependabot: 0 },
      { date: '2026-08-27', human: 0, dependabot: 0 },
      { date: '2026-08-28', human: 0, dependabot: 0 },
      { date: '2026-08-31', human: 2, dependabot: 1 },
      { date: '2026-09-01', human: 0, dependabot: 0 },
    ])
  })

  it('holds weekend approvals for a Monday outside the range instead of showing them on the weekend', () => {
    const sunday = new Date(2026, 8, 6, 12) // Sun Sep 6
    const events = [{ reviewer: 'bob', at: new Date(2026, 8, 5, 12).toISOString(), dependabot: false, pr: 1, repo: 'r' }]
    expect(weekdaySeries(events, 3, sunday)).toEqual([
      { date: '2026-09-03', human: 0, dependabot: 0 },
      { date: '2026-09-04', human: 0, dependabot: 0 },
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

  it('gives the week a sparkline over the last seven completed weekdays, weekends folded into Monday', () => {
    // NOW is Wed Sep 2, so the completed weekdays are Mon Aug 24 .. Tue Sep 1.
    const events = [
      ev('bob', 0), // today: not a completed day
      ev('bob', 1), // Tue Sep 1 -> last point
      ev('bob', 4), // Sat Aug 29 -> Mon Aug 31
      ev('bob', 9), // Mon Aug 24 -> first point
      ev('bob', 12), // Fri Aug 21 -> before the window
    ]
    const s = windowSummary(events, NOW)
    expect(s.week.spark).toEqual([1, 0, 0, 0, 0, 1, 1])
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
