import { Fragment, useMemo, useState } from 'react'
import type { ActorType, Report } from '../types'
import type { ReportIndex } from '../lib/report'
import { ACTOR_META, ACTOR_ORDER, actionName, countByActorType, fmtTime } from '../lib/report'
import { ActorTag, Confidence } from '../components/bits'

export function Events({ report, idx }: { report: Report; idx: ReportIndex }) {
  const [types, setTypes] = useState<Set<ActorType>>(new Set())
  const [query, setQuery] = useState('')
  const [writesOnly, setWritesOnly] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const counts = countByActorType(report)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...report.events]
      .sort((a, b) => Date.parse(a.event_time) - Date.parse(b.event_time))
      .filter((e) => types.size === 0 || types.has(e.classification.actor_type))
      .filter((e) => !writesOnly || !e.read_only)
      .filter((e) => {
        if (!q) return true
        const actor = idx.actors.get(e.actor_id)
        return [actionName(e), e.principal_arn, actor?.display_name, e.resources?.map((r) => r.arn).join(' ')]
          .join(' ')
          .toLowerCase()
          .includes(q)
      })
  }, [report, idx, types, query, writesOnly])

  const toggle = (t: ActorType) => {
    const next = new Set(types)
    if (next.has(t)) next.delete(t)
    else next.add(t)
    setTypes(next)
  }

  return (
    <div className="stack">
      <div className="filters">
        <div className="filters__chips" role="group" aria-label="Filter by who acted">
          {ACTOR_ORDER.filter((t) => counts[t] > 0).map((t) => (
            <button
              key={t}
              type="button"
              className={`chip chip--${t}`}
              aria-pressed={types.has(t)}
              onClick={() => toggle(t)}
              title={ACTOR_META[t].help}
            >
              <span className="dot" aria-hidden="true" />
              {ACTOR_META[t].short}
              <span className="chip__n">{counts[t]}</span>
            </button>
          ))}
        </div>
        <label className="check">
          <input type="checkbox" checked={writesOnly} onChange={(e) => setWritesOnly(e.target.checked)} />
          Changes only
        </label>
        <input
          className="search"
          type="search"
          placeholder="Search actions, people, ARNs"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search events"
        />
      </div>

      <div className="table-wrap card">
        <table className="events">
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Who</th>
              <th scope="col">Action</th>
              <th scope="col">Resource</th>
              <th scope="col">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const actor = idx.actors.get(e.actor_id)
              const isOpen = open === e.event_id
              return (
                <Fragment key={e.event_id}>
                  <tr
                    className={`events__row${isOpen ? ' is-open' : ''}`}
                    onClick={() => setOpen(isOpen ? null : e.event_id)}
                    tabIndex={0}
                    aria-expanded={isOpen}
                    onKeyDown={(k) => {
                      if (k.key === 'Enter' || k.key === ' ') {
                        k.preventDefault()
                        setOpen(isOpen ? null : e.event_id)
                      }
                    }}
                  >
                    <td className="muted nowrap">{fmtTime(e.event_time)}</td>
                    <td>
                      <span className="who">
                        <span className={`dot bg--${e.classification.actor_type}`} aria-hidden="true" />
                        {actor?.display_name ?? e.actor_id}
                      </span>
                    </td>
                    <td>
                      <code className={e.read_only ? undefined : 'is-write'}>{actionName(e)}</code>
                      {e.error_code && <span className="text-alert"> {e.error_code}</span>}
                    </td>
                    <td className="mono muted truncate">{e.resources?.[0]?.arn.split(':').pop() ?? ''}</td>
                    <td>
                      <Confidence value={e.classification.confidence} />
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="events__detail">
                      <td colSpan={5}>
                        <div className="detail">
                          <div>
                            <h4>Why we think this is: <ActorTag type={e.classification.actor_type} /></h4>
                            <ul className="signals">
                              {e.classification.signals.map((s, i) => (
                                <li key={i}>
                                  <span className="signals__name">{s.name.replace(/_/g, ' ')}</span>
                                  <code className="signals__value">{s.value}</code>
                                  <span className="signals__weight" title={`Weight ${s.weight}`}>
                                    <span className={`signals__bar bg--${s.points_to}`} style={{ width: `${s.weight * 100}%` }} />
                                  </span>
                                  <span className="muted signals__to">{ACTOR_META[s.points_to].short}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <dl className="kv">
                            <dt>Principal</dt>
                            <dd className="mono">{e.principal_arn}</dd>
                            {e.user_agent && (
                              <>
                                <dt>User agent</dt>
                                <dd className="mono">{e.user_agent}</dd>
                              </>
                            )}
                            {e.source_ip && (
                              <>
                                <dt>Source IP</dt>
                                <dd className="mono">{e.source_ip}</dd>
                              </>
                            )}
                            <dt>Event ID</dt>
                            <dd className="mono">{e.event_id}</dd>
                          </dl>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="empty">No events match. Clear a filter or change the search.</p>}
      </div>
    </div>
  )
}
