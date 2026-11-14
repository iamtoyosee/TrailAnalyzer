import { useState } from 'react'
import type { Report } from '../types'
import type { ReportIndex } from '../lib/report'
import { actionName, fmtDuration, fmtTime } from '../lib/report'
import { Chain, buildChain } from '../components/Chain'
import { ActorTag } from '../components/bits'

export function Sessions({ report, idx }: { report: Report; idx: ReportIndex }) {
  const [open, setOpen] = useState<string | null>(null)
  const flagged = new Set(report.findings.flatMap((f) => f.event_ids))

  return (
    <div className="stack">
      <p className="intro">
        A session is a run of calls by one actor. Open one to see every call it made, in order.
      </p>
      {report.sessions.map((s) => {
        const actor = idx.actors.get(s.actor_id)
        if (!actor) return null
        const events = s.event_ids.map((id) => idx.events.get(id)).filter((e) => e !== undefined)
        const writes = events.filter((e) => !e.read_only).length
        const flaggedCount = events.filter((e) => flagged.has(e.event_id)).length
        const isOpen = open === s.session_id
        const span = Math.max(1, Date.parse(s.end) - Date.parse(s.start))

        return (
          <article key={s.session_id} className={`card session${isOpen ? ' is-open' : ''}`}>
            <button
              type="button"
              className="session__head"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : s.session_id)}
            >
              <div className="session__top">
                <h3>{s.title ?? s.session_id}</h3>
                <ActorTag type={actor.type} />
              </div>
              <Chain nodes={buildChain(actor, idx, undefined, s.role_arn)} />
              <div className="session__meta muted">
                <span>
                  {fmtTime(s.start)}, {fmtDuration(s.start, s.end)}
                </span>
                <span>
                  {events.length} calls, {writes} {writes === 1 ? 'change' : 'changes'}
                </span>
                {flaggedCount > 0 && <span className="text-alert">{flaggedCount} flagged</span>}
              </div>
              {/* Each call placed on the session's own time line: hollow = read, filled = change. */}
              <div className="ticks" aria-hidden="true">
                {events.map((e) => (
                  <span
                    key={e.event_id}
                    className={`tick${e.read_only ? '' : ' tick--write'}${flagged.has(e.event_id) ? ' tick--flag' : ''}`}
                    style={{ left: `${((Date.parse(e.event_time) - Date.parse(s.start)) / span) * 100}%` }}
                  />
                ))}
              </div>
            </button>

            {isOpen && (
              <ol className="calls">
                {events.map((e) => (
                  <li key={e.event_id} className={flagged.has(e.event_id) ? 'is-flagged' : undefined}>
                    <time className="muted">{fmtTime(e.event_time)}</time>
                    <span className={`calls__kind${e.read_only ? '' : ' calls__kind--write'}`}>
                      {e.read_only ? 'Read' : 'Change'}
                    </span>
                    <code>{actionName(e)}</code>
                    <span className="calls__res mono muted">{e.resources?.[0]?.arn.split(':').pop() ?? ''}</span>
                    {e.error_code && <span className="text-alert">{e.error_code}</span>}
                  </li>
                ))}
              </ol>
            )}
          </article>
        )
      })}
    </div>
  )
}
