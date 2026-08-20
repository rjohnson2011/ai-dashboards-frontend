import { useMemo, useState } from 'react'
import { type PullRequest, BACKEND_REVIEWERS } from '../types/pull-request'
import {
  type FilterKey,
  type Status,
  FILTERS,
  classifyStatus,
  reviewerBadgesFor,
  absoluteTime,
  countByFilter,
  applyFilter,
  summarizeFailingChecksCompact,
  summarizeActivity,
} from '../lib/dashboard'
import { displayUser } from '../lib/utils'

interface Props {
  pullRequests: PullRequest[]
}

// ── Triage Board ────────────────────────────────────────────────────────────
// Design thesis: color is state, not decoration. Exactly three tones exist —
// one violet accent (the selected queue, and only the selected queue), one
// restrained red (genuinely broken CI), and quiet neutrals for everything
// else. The signature element is the queue rail: the active queue card and
// the table share a single accent rule, making "what am I looking at" a
// physical connection rather than a label.
//
// Structure encodes priority: four ACTION queues get full cards; the three
// informational counts (all / drafts / dependabot) are demoted to a one-line
// strip. Total PRs is deliberately the quietest number on the page.

const T = {
  bg: '#0B0E14',
  surface: '#11151D',
  surfaceUp: '#161B25',
  line: 'rgba(148,163,184,0.12)',
  text: '#E8ECF4',
  mut: '#8B93A7',
  faint: '#5A6172',
  accent: '#8B7CF6',
  accentDim: 'rgba(139,124,246,0.14)',
  red: '#F87171',
  redDim: 'rgba(248,113,113,0.12)',
  green: '#4ADE80',
  amber: '#FBBF24',
}

const ACTION_QUEUES: FilterKey[] = ['ready', 'awaiting', 'failing', 'approved']
const STRIP_QUEUES: FilterKey[] = ['all', 'drafts', 'dependabot']

const QUEUE_COPY: Record<string, { title: string; hint: string }> = {
  ready: { title: 'Ready for review', hint: 'awaiting backend approval' },
  awaiting: { title: 'Awaiting author', hint: 'reviewer requested changes' },
  failing: { title: 'Failing CI', hint: 'real check failures' },
  approved: { title: 'Approved · unmerged', hint: 'cleared, not yet merged' },
  all: { title: 'all open', hint: '' },
  drafts: { title: 'drafts', hint: '' },
  dependabot: { title: 'dependabot', hint: '' },
}

// Status tones collapse into the three-color system. Anything "waiting on a
// human" is neutral; only real breakage is red; approvals are green.
function statusTone(key: Status): string {
  if (key === 'failing') return T.red
  if (key === 'approved') return T.green
  if (key === 'changes_requested' || key === 'needs_reapproval') return T.amber
  return T.mut
}

const badgeTone: Record<string, string> = {
  approved: T.green,
  changes_requested: T.amber,
  commented: T.faint,
}

export default function TriageBoard({ pullRequests }: Props) {
  const [active, setActive] = useState<FilterKey>('ready')
  const [query, setQuery] = useState('')

  const counts = useMemo(() => countByFilter(pullRequests), [pullRequests])
  const rows = useMemo(
    () => applyFilter(pullRequests, active, query),
    [pullRequests, active, query]
  )
  const activeDef = FILTERS.find(f => f.key === active)

  return (
    <div style={{ background: T.bg, color: T.text, minHeight: '100vh' }}>
      <div className="mx-auto max-w-[1480px] px-5 sm:px-7 py-6 space-y-5">
        {/* ── Tier 1: action queues ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {ACTION_QUEUES.map(key => {
            const sel = key === active
            const copy = QUEUE_COPY[key]
            const isWarn = key === 'failing'
            return (
              <button
                key={key}
                onClick={() => setActive(key)}
                className="text-left rounded-lg px-4 py-3 transition-colors focus-visible:outline focus-visible:outline-2"
                style={{
                  background: sel ? T.accentDim : T.surface,
                  border: `1px solid ${sel ? T.accent : T.line}`,
                  // The rail: selected card carries the accent rule that the
                  // table below picks up.
                  boxShadow: sel ? `inset 0 2px 0 ${T.accent}` : 'none',
                  outlineColor: T.accent,
                }}
              >
                <div
                  className="text-[11px] font-medium uppercase tracking-[0.14em]"
                  style={{ color: sel ? T.accent : T.mut }}
                >
                  {copy.title}
                </div>
                <div
                  className="mt-1 text-3xl font-semibold tabular-nums"
                  style={{ color: isWarn && counts[key] > 0 ? T.red : T.text }}
                >
                  {counts[key]}
                </div>
                <div className="mt-0.5 text-xs" style={{ color: T.faint }}>
                  {copy.hint}
                </div>
              </button>
            )
          })}
        </div>

        {/* ── Tier 2: informational strip ── */}
        <div
          className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs"
          style={{ color: T.faint }}
        >
          {STRIP_QUEUES.map(key => {
            const sel = key === active
            return (
              <button
                key={key}
                onClick={() => setActive(key)}
                className="hover:underline underline-offset-4"
                style={{ color: sel ? T.accent : T.faint }}
              >
                <span className="tabular-nums font-medium" style={{ color: sel ? T.accent : T.mut }}>
                  {counts[key]}
                </span>{' '}
                {QUEUE_COPY[key].title}
              </button>
            )
          })}
          <span className="ml-auto">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Filter by title, author, #"
              className="rounded-md px-3 py-1.5 text-xs w-56 focus:outline-none"
              style={{
                background: T.surface,
                border: `1px solid ${T.line}`,
                color: T.text,
              }}
            />
          </span>
        </div>

        {/* ── The table ── */}
        <div
          className="rounded-lg overflow-hidden"
          style={{
            background: T.surface,
            border: `1px solid ${T.line}`,
            borderTop: `2px solid ${T.accent}`,
          }}
        >
          <div
            className="flex items-baseline justify-between px-4 pt-3 pb-2"
            style={{ borderBottom: `1px solid ${T.line}` }}
          >
            <div>
              <span className="text-sm font-semibold">{activeDef?.label}</span>
              <span className="ml-2 text-xs tabular-nums" style={{ color: T.faint }}>
                {rows.length} {rows.length === 1 ? 'PR' : 'PRs'}
              </span>
            </div>
            {QUEUE_COPY[active]?.hint && (
              <span className="text-xs" style={{ color: T.faint }}>
                {QUEUE_COPY[active].hint}
              </span>
            )}
          </div>

          {/* table-fixed + w-full: the table owns 100% width; Title absorbs
              all slack. No horizontal scroll at any desktop width. */}
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col style={{ width: '84px' }} />
              <col />
              <col style={{ width: '150px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '170px' }} />
              <col style={{ width: '190px' }} />
              <col style={{ width: '110px' }} />
            </colgroup>
            <thead>
              <tr
                className="text-[11px] uppercase tracking-[0.12em]"
                style={{ color: T.faint }}
              >
                {['PR', 'Title', 'Author', 'CI', 'Approvals', 'Status', 'Updated'].map(h => (
                  <th key={h} className="text-left font-medium px-4 py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm" style={{ color: T.faint }}>
                    Nothing in this queue. Adjust the filter above, or enjoy the moment.
                  </td>
                </tr>
              )}
              {rows.map(pr => {
                const status = classifyStatus(pr)
                const badges = reviewerBadgesFor(pr).slice(0, 3)
                const activity = summarizeActivity(pr, BACKEND_REVIEWERS)
                const ci = summarizeFailingChecksCompact(pr)
                return (
                  <tr
                    key={`${pr.repository_name}-${pr.number}`}
                    className="cursor-pointer transition-colors hover:bg-white/[0.03]"
                    style={{ borderTop: `1px solid ${T.line}` }}
                    onClick={() => window.open(pr.url, '_blank', 'noopener')}
                  >
                    <td className="px-4 py-3 align-top">
                      <span className="tabular-nums font-medium" style={{ color: T.mut }}>
                        #{pr.number}
                      </span>
                      {pr.repository_name && pr.repository_name !== 'vets-api' && (
                        <span
                          className="block mt-0.5 text-[10px] truncate"
                          style={{ color: T.faint }}
                          title={pr.repository_name}
                        >
                          {pr.repository_name.replace('vets-api-', '')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="block truncate" title={pr.title}>
                        {pr.title}
                      </span>
                      <span className="block text-xs mt-0.5 truncate" style={{ color: T.faint }}>
                        {activity.latestLabel} · {activity.latestTimeAgo}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="block truncate text-xs" title={pr.author} style={{ color: T.mut }}>
                        {displayUser(pr.author)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-xs">
                      <span
                        className="block truncate"
                        title={ci}
                        style={{
                          color:
                            status.key === 'failing'
                              ? T.red
                              : pr.ci_status === 'success'
                                ? T.green
                                : T.mut,
                        }}
                      >
                        {ci}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-xs">
                      {badges.length === 0 ? (
                        <span style={{ color: T.faint }}>—</span>
                      ) : (
                        badges.map(b => (
                          <span
                            key={b.user}
                            className="block truncate"
                            title={`${b.user} (${b.state})`}
                            style={{ color: badgeTone[b.state] || T.mut }}
                          >
                            {displayUser(b.user)}
                          </span>
                        ))
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-xs">
                      <span className="inline-flex items-center gap-1.5 max-w-full">
                        <span
                          className="h-1.5 w-1.5 rounded-full shrink-0"
                          style={{ background: statusTone(status.key) }}
                        />
                        <span className="truncate" title={status.label} style={{ color: T.mut }}>
                          {status.label}
                        </span>
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 align-top text-xs tabular-nums"
                      style={{ color: T.mut }}
                      title={`opened ${absoluteTime(pr.created_at)}`}
                    >
                      {activity.latestTimeAgo.replace(' ago', '')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
