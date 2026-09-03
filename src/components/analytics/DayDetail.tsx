import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { A } from './theme'
import { displayUser } from '../../lib/utils'
import type { ApprovedPr } from '../../lib/analytics'

interface Props {
  date: string
  groups: ApprovedPr[]
  onClose: () => void
}

function longDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
}

// The PRs approved on one chart day, in a native <dialog> (modal, focus
// trapped, Escape closes). Backdrop click closes too.
export default function DayDetail({ date, groups, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal()
    } else {
      dialog.setAttribute('open', '')
    }
  }, [])

  const approvalCount = groups.reduce((n, g) => n + g.approvals.length, 0)

  return (
    <dialog
      ref={ref}
      aria-labelledby="day-detail-title"
      onCancel={e => {
        e.preventDefault()
        onClose()
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="w-[min(680px,calc(100vw-32px))] max-h-[85vh] rounded-lg p-0 backdrop:bg-black/60"
      // The global reset zeroes margins, which undoes the browser's own
      // centering for modal dialogs; margin auto restores it.
      style={{ background: A.surface, color: A.text, border: `1px solid ${A.line}`, margin: 'auto' }}
    >
      <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3" style={{ borderBottom: `1px solid ${A.line}` }}>
        <div>
          <h2 id="day-detail-title" style={{ fontSize: 15, fontWeight: 600 }}>{longDate(date)}</h2>
          <p style={{ fontSize: 12 }}>
            {groups.length} PR{groups.length === 1 ? '' : 's'} approved, {approvalCount} approval{approvalCount === 1 ? '' : 's'}.
            Weekend approvals appear under the following Monday.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-md p-1.5 hover:bg-white/10"
          style={{ color: A.text }}
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="px-5 py-6" style={{ fontSize: 13 }}>No approvals on this day.</p>
      ) : (
        <ol className="max-h-[calc(85vh-88px)] overflow-y-auto px-2 py-2">
          {groups.map(g => {
            const label = g.title ?? `${g.repo ?? 'PR'} #${g.pr ?? ''}`
            return (
              <li key={`${g.repo}#${g.pr}`} className="rounded-md px-3 py-2.5 hover:bg-white/5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {g.url ? (
                      <a
                        href={g.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                        style={{ color: A.text, fontSize: 14, fontWeight: 500 }}
                      >
                        {label}
                      </a>
                    ) : (
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
                    )}
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1" style={{ fontSize: 12 }}>
                      {g.title && (
                        <span className="tabular-nums">
                          {g.repo} #{g.pr}
                        </span>
                      )}
                      {g.dependabot && (
                        <span
                          className="rounded px-1.5 py-px"
                          style={{ background: A.mutedSoft, fontSize: 11, fontWeight: 500 }}
                        >
                          Dependabot
                        </span>
                      )}
                    </div>
                  </div>
                  <ul className="shrink-0 text-right" style={{ fontSize: 12 }}>
                    {g.approvals.map((a, i) => (
                      <li key={i} className="flex items-center justify-end gap-2">
                        <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: A.up }} />
                        <span style={{ fontWeight: 500 }}>{displayUser(a.reviewer)}</span>
                        <span className="tabular-nums" style={{ opacity: 0.8 }}>{timeOf(a.at)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </dialog>
  )
}
