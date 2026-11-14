import type { Actor, ActorType, Report, Severity, TrailEvent } from '../types'
import { SUPPORTED_SCHEMA_VERSIONS } from '../types'

export const ACTOR_META: Record<ActorType, { label: string; short: string; help: string }> = {
  human: {
    label: 'Person',
    short: 'Person',
    help: 'A person acting directly, in the console or the CLI.',
  },
  agent_on_behalf: {
    label: 'Agent for a person',
    short: 'Agent + person',
    help: 'An AI agent, and we can tell which person it was working for.',
  },
  agent: {
    label: 'Agent, no person found',
    short: 'Agent only',
    help: 'An AI agent with no person attributed. Nobody is accountable for these calls.',
  },
  automation: {
    label: 'Automation',
    short: 'Automation',
    help: 'Non-AI automation such as CI/CD, Lambda or a scheduled job.',
  },
  unknown: {
    label: 'Unknown',
    short: 'Unknown',
    help: 'Not enough signal to decide who is behind it.',
  },
}

/** Display order: the ones that need attention after the clear ones. */
export const ACTOR_ORDER: ActorType[] = ['human', 'agent_on_behalf', 'agent', 'automation', 'unknown']

export const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low']

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

/** "s3.amazonaws.com" + "GetFunction20150331v2" -> "lambda:GetFunction" style. */
export function actionName(e: Pick<TrailEvent, 'event_source' | 'event_name'>): string {
  const service = e.event_source.split('.')[0]
  const name = e.event_name.replace(/\d{8}(v\d+)?$/, '')
  return `${service}:${name}`
}

/** Role name from an assumed-role ARN or a role ARN, if there is one. */
export function roleName(arn?: string): string | undefined {
  if (!arn) return undefined
  const assumed = arn.match(/:assumed-role\/([^/]+)/)
  if (assumed) return assumed[1]
  const role = arn.match(/:role\/(.+)$/)
  return role ? role[1].split('/').pop() : undefined
}

/** Last path part of an ARN, for compact display. */
export function shortArn(arn: string): string {
  const afterColon = arn.split(':').slice(5).join(':')
  return afterColon || arn
}

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
const dateFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

export const fmtTime = (iso: string) => timeFmt.format(new Date(iso))
export const fmtDate = (iso: string) => dateFmt.format(new Date(iso))

export function fmtDuration(startIso: string, endIso: string): string {
  const s = Math.max(0, Math.round((Date.parse(endIso) - Date.parse(startIso)) / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rest = s % 60
  return rest ? `${m}m ${rest}s` : `${m}m`
}

export interface ReportIndex {
  actors: Map<string, Actor>
  events: Map<string, TrailEvent>
}

export function indexReport(r: Report): ReportIndex {
  return {
    actors: new Map(r.actors.map((a) => [a.id, a])),
    events: new Map(r.events.map((e) => [e.event_id, e])),
  }
}

export function countByActorType(r: Report): Record<ActorType, number> {
  const out: Record<ActorType, number> = { human: 0, agent_on_behalf: 0, agent: 0, automation: 0, unknown: 0 }
  for (const e of r.events) out[e.classification.actor_type] += 1
  return out
}

/**
 * Light structural check on an uploaded report. The backend should validate
 * against /schema/report.schema.json; this only guards the UI from crashing
 * and gives a clear message when a file is the wrong shape.
 */
export function parseReport(raw: unknown): Report {
  if (typeof raw !== 'object' || raw === null) throw new Error('The file is not a JSON object.')
  const r = raw as Partial<Report>
  if (!r.schema_version) throw new Error('Missing "schema_version". Is this a TrailAnalyzer report?')
  if (!(SUPPORTED_SCHEMA_VERSIONS as readonly string[]).includes(r.schema_version)) {
    throw new Error(
      `This UI reads schema version ${SUPPORTED_SCHEMA_VERSIONS.join(', ')}; the file says ${r.schema_version}.`,
    )
  }
  for (const key of ['actors', 'events', 'sessions', 'findings'] as const) {
    if (!Array.isArray(r[key])) throw new Error(`"${key}" must be a list.`)
  }
  if (!r.source?.time_range) throw new Error('Missing "source.time_range".')
  const actorIds = new Set(r.actors!.map((a) => a.id))
  const orphan = r.events!.find((e) => !actorIds.has(e.actor_id))
  if (orphan) throw new Error(`Event ${orphan.event_id} points to actor "${orphan.actor_id}", which is not in "actors".`)
  return r as Report
}
