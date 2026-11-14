import { useState } from 'react'
import type { ActorType, Report, Severity } from '../types'
import { ACTOR_META, ACTOR_ORDER, SEVERITY_LABEL, countByActorType } from '../lib/report'

export function ActorTag({ type }: { type: ActorType }) {
  return (
    <span className={`actor-tag actor-tag--${type}`} title={ACTOR_META[type].help}>
      <span className="dot" aria-hidden="true" />
      {ACTOR_META[type].short}
    </span>
  )
}

export function SeverityTag({ severity }: { severity: Severity }) {
  return <span className={`sev sev--${severity}`}>{SEVERITY_LABEL[severity]}</span>
}

/** Parts of a whole: every event, split by who was behind it. */
export function ActorMix({ report }: { report: Report }) {
  const counts = countByActorType(report)
  const total = report.events.length || 1
  return (
    <div className="mix">
      <div className="mix__bar" role="img" aria-label="Events by who was behind them">
        {ACTOR_ORDER.filter((t) => counts[t] > 0).map((t) => (
          <span key={t} className={`mix__seg bg--${t}`} style={{ flexGrow: counts[t] }} title={`${ACTOR_META[t].label}: ${counts[t]}`} />
        ))}
      </div>
      <ul className="mix__legend">
        {ACTOR_ORDER.map((t) => (
          <li key={t} className={counts[t] === 0 ? 'is-empty' : undefined}>
            <span className={`swatch bg--${t}`} aria-hidden="true" />
            <span className="mix__label">{ACTOR_META[t].label}</span>
            <span className="mix__num">{counts[t]}</span>
            <span className="mix__pct">{Math.round((counts[t] / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="btn btn--quiet btn--small"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        } catch {
          /* clipboard blocked: leave the label as is */
        }
      }}
    >
      {copied ? 'Copied' : label}
    </button>
  )
}

export function Confidence({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const band = value >= 0.8 ? 'high' : value >= 0.5 ? 'mid' : 'low'
  return (
    <span className={`conf conf--${band}`} title={`Classifier confidence ${pct}%`}>
      <span className="conf__track" aria-hidden="true">
        <span className="conf__fill" style={{ width: `${pct}%` }} />
      </span>
      {pct}%
    </span>
  )
}
