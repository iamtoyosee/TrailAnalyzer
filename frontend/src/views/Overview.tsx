import type { Report, TrailEvent } from '../types'
import type { ReportIndex } from '../lib/report'
import { SEVERITY_ORDER, fmtDate, fmtTime } from '../lib/report'
import { Chain, buildChain } from '../components/Chain'
import { ActorMix, SeverityTag } from '../components/bits'
import type { Tab } from '../App'

const STEPS = [
  {
    title: 'Read the trail',
    body: 'Load CloudTrail events from an exported JSON file, an S3 trail, or the last 90 days of LookupEvents.',
  },
  {
    title: 'Decide who acted',
    body: 'Each event is classified as a person, an AI agent working for a person, an agent with no person, automation, or unknown. Every decision lists the signals behind it.',
  },
  {
    title: 'Connect the chain',
    body: 'Events are grouped into sessions so you can follow person → agent → role → action from start to finish.',
  },
  {
    title: 'Flag what needs a look',
    body: 'Rules catch shared roles, agents acting with no person behind them, and agents doing things their person never does, each with a suggested IAM fix.',
  },
]

export function Overview({ report, idx, go }: { report: Report; idx: ReportIndex; go: (t: Tab) => void }) {
  const top = [...report.findings].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  )
  // Hero example: prefer a flagged change made by an agent for a person, since that is
  // the case this tool exists for. Skip AssumeRole: it is plumbing, not the action.
  const flagged = new Set(top.flatMap((f) => f.event_ids))
  const bySeverity = top.flatMap((f) => f.event_ids)
  const isAction = (e: TrailEvent) => !e.read_only && !e.event_name.startsWith('AssumeRole')
  const heroEvent =
    bySeverity
      .map((id) => idx.events.get(id))
      .find((e) => e && e.classification.actor_type === 'agent_on_behalf' && isAction(e)) ??
    report.events.find((e) => e.classification.actor_type === 'agent_on_behalf' && isAction(e) && flagged.has(e.event_id)) ??
    report.events.find((e) => e.classification.actor_type.startsWith('agent') && isAction(e)) ??
    report.events.find(isAction) ??
    report.events[0]
  const heroActor = heroEvent ? idx.actors.get(heroEvent.actor_id) : undefined

  return (
    <div className="overview">
      <section className="hero">
        <h1 className="hero__title">Who did this: a person, or their AI agent?</h1>
        <p className="hero__lede">
          AI agents now call AWS with the same roles people use, so CloudTrail often can’t tell them apart.
          TrailAnalyzer reads your trail, works out who was really behind each action, and flags the places
          where nobody is accountable.
        </p>
        {heroEvent && heroActor && (
          <figure className="hero__figure">
            <Chain nodes={buildChain(heroActor, idx, heroEvent)} size="lg" animate />
            <figcaption>
              One event from this report, traced back to the person behind it. {fmtTime(heroEvent.event_time)}.
            </figcaption>
          </figure>
        )}
      </section>

      <section className="panel">
        <header className="panel__head">
          <h2>In this report</h2>
          <p className="muted">
            {report.events.length} events across {report.sessions.length} sessions,{' '}
            {fmtDate(report.source.time_range.start)}, {fmtTime(report.source.time_range.start)} to{' '}
            {fmtTime(report.source.time_range.end)}
            {report.source.account_id ? `, account ${report.source.account_id}` : ''}.
          </p>
        </header>
        <ActorMix report={report} />
      </section>

      <section className="panel">
        <header className="panel__head panel__head--row">
          <h2>Needs a look</h2>
          {top.length > 0 && (
            <button type="button" className="btn btn--quiet" onClick={() => go('findings')}>
              See all {top.length} findings
            </button>
          )}
        </header>
        {top.length === 0 ? (
          <p className="muted">No findings. Every action in this report has someone accountable behind it.</p>
        ) : (
          <ul className="toplist">
            {top.slice(0, 3).map((f) => (
              <li key={f.id}>
                <button type="button" className="toplist__item" onClick={() => go('findings')}>
                  <SeverityTag severity={f.severity} />
                  <span className="toplist__title">{f.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <header className="panel__head">
          <h2>How it works</h2>
        </header>
        <ol className="steps">
          {STEPS.map((s) => (
            <li key={s.title}>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
