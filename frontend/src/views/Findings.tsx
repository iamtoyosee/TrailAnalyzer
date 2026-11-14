import { useState } from 'react'
import type { Report } from '../types'
import type { ReportIndex } from '../lib/report'
import { SEVERITY_ORDER, actionName, fmtTime } from '../lib/report'
import { ActorTag, CopyButton, SeverityTag } from '../components/bits'

export function Findings({ report, idx }: { report: Report; idx: ReportIndex }) {
  const sorted = [...report.findings].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  )
  const [open, setOpen] = useState<string | null>(sorted[0]?.id ?? null)

  if (sorted.length === 0) {
    return <p className="intro">No findings in this report.</p>
  }

  return (
    <div className="stack">
      <p className="intro">Sorted by severity. Each finding says what happened, who was involved, and how to fix it.</p>
      {sorted.map((f) => {
        const isOpen = open === f.id
        return (
          <article key={f.id} className={`card finding finding--${f.severity}${isOpen ? ' is-open' : ''}`}>
            <button type="button" className="finding__head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : f.id)}>
              <SeverityTag severity={f.severity} />
              <h3>{f.title}</h3>
              <span className="finding__rule mono muted">{f.rule_id}</span>
            </button>

            {isOpen && (
              <div className="finding__body">
                <p>{f.description}</p>

                <div className="finding__cols">
                  <div>
                    <h4>Who</h4>
                    <ul className="plain">
                      {f.actor_ids.map((id) => {
                        const a = idx.actors.get(id)
                        return a ? (
                          <li key={id} className="who">
                            <ActorTag type={a.type} />
                            <span>{a.display_name}</span>
                          </li>
                        ) : null
                      })}
                    </ul>
                  </div>
                  <div>
                    <h4>Calls involved</h4>
                    <ul className="plain">
                      {f.event_ids.map((id) => {
                        const e = idx.events.get(id)
                        return e ? (
                          <li key={id} className="evline">
                            <time className="muted">{fmtTime(e.event_time)}</time>
                            <code>{actionName(e)}</code>
                          </li>
                        ) : null
                      })}
                    </ul>
                  </div>
                </div>

                <div className="fix">
                  <h4>How to fix it</h4>
                  <p>{f.recommendation}</p>
                  {f.iam_policy_snippet && (
                    <div className="code-block">
                      <div className="code-block__bar">
                        <span className="muted">Suggested IAM policy</span>
                        <CopyButton text={f.iam_policy_snippet} label="Copy policy" />
                      </div>
                      <pre>
                        <code>{f.iam_policy_snippet}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
