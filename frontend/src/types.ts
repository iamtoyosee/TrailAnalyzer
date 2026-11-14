// The report contract between the TrailAnalyzer backend and this UI.
// The backend writes a JSON file in this shape; the UI only reads it.
// Keep in sync with /schema/report.schema.json and /docs/report-contract.md.

export const SUPPORTED_SCHEMA_VERSIONS = ['0.1'] as const

/** Who is ultimately behind an API call. */
export type ActorType =
  | 'human' // a person acting directly (console, CLI)
  | 'agent' // an AI agent with no human attributed
  | 'agent_on_behalf' // an AI agent acting for a known human
  | 'automation' // non-AI automation: CI/CD, Lambda, scheduled jobs
  | 'unknown' // not enough signal to decide

export type Severity = 'critical' | 'high' | 'medium' | 'low'

export interface Report {
  schema_version: string
  generated_at: string // ISO 8601
  source: ReportSource
  actors: Actor[]
  events: TrailEvent[]
  sessions: Session[]
  findings: Finding[]
}

export interface ReportSource {
  kind: 'file' | 's3' | 'lookup_events'
  account_id?: string
  regions?: string[]
  time_range: { start: string; end: string }
  /** Free text, e.g. the file name or bucket the trail came from. */
  description?: string
}

export interface Actor {
  id: string
  type: ActorType
  display_name: string
  /** The IAM principal AWS saw (user, role or assumed-role ARN). */
  principal_arn?: string
  /** For agent_on_behalf: the id of the human actor the agent worked for. */
  on_behalf_of?: string
  /** For agents: the client that made the call, e.g. "Claude Code", "Cursor". */
  agent_client?: string
}

export interface Signal {
  /** Machine name, e.g. "called_via_aws_mcp", "user_agent", "role_name". */
  name: string
  /** What was observed, e.g. "true", "claude-code/2.1", "agent-role-deploy". */
  value: string
  /** Which actor type this signal points to. */
  points_to: ActorType
  /** 0..1, how strongly it counted toward the classification. */
  weight: number
}

export interface TrailEvent {
  event_id: string
  event_time: string // ISO 8601
  event_source: string // e.g. "s3.amazonaws.com"
  event_name: string // e.g. "DeleteObject"
  aws_region: string
  actor_id: string
  session_id?: string
  /** The IAM principal ARN as recorded by CloudTrail. */
  principal_arn: string
  source_ip?: string
  user_agent?: string
  read_only: boolean
  resources?: { arn: string; type?: string }[]
  error_code?: string
  classification: {
    actor_type: ActorType
    confidence: number // 0..1
    signals: Signal[]
  }
}

/** A run of related events, e.g. one agent session for one human. */
export interface Session {
  session_id: string
  title?: string
  actor_id: string
  /** The role the calls went through. */
  role_arn?: string
  start: string
  end: string
  event_ids: string[]
}

export interface Finding {
  id: string
  rule_id: string // e.g. "TA-001"
  title: string
  severity: Severity
  description: string
  actor_ids: string[]
  event_ids: string[]
  recommendation: string
  /** Optional IAM policy JSON (as a string) that would fix it. */
  iam_policy_snippet?: string
}
