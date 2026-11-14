import type { Actor, ActorType, TrailEvent } from '../types'
import { actionName, roleName } from '../lib/report'
import type { ReportIndex } from '../lib/report'

type NodeKind = ActorType | 'role' | 'action' | 'missing'

interface ChainNode {
  kind: NodeKind
  caption: string
  title: string
  detail?: string
}

/**
 * The attribution chain: who started it -> what acted -> which role -> what happened.
 * This is the core picture of the product, used on every screen.
 */
export function buildChain(actor: Actor, idx: ReportIndex, event?: TrailEvent, roleArn?: string): ChainNode[] {
  const nodes: ChainNode[] = []
  const person = actor.on_behalf_of ? idx.actors.get(actor.on_behalf_of) : undefined

  switch (actor.type) {
    case 'agent_on_behalf':
      nodes.push({ kind: 'human', caption: 'Person', title: person?.display_name ?? 'Unknown person' })
      nodes.push({ kind: 'agent_on_behalf', caption: 'AI agent', title: actor.agent_client ?? actor.display_name })
      break
    case 'agent':
      nodes.push({ kind: 'missing', caption: 'Person', title: 'None found' })
      nodes.push({ kind: 'agent', caption: 'AI agent', title: actor.agent_client ?? actor.display_name })
      break
    case 'human':
      nodes.push({ kind: 'human', caption: 'Person', title: actor.display_name })
      break
    case 'automation':
      nodes.push({ kind: 'automation', caption: 'Automation', title: actor.display_name })
      break
    default:
      nodes.push({ kind: 'unknown', caption: 'Unknown', title: actor.display_name })
  }

  const role = roleName(roleArn ?? event?.principal_arn ?? actor.principal_arn)
  if (role) nodes.push({ kind: 'role', caption: 'IAM role', title: role })

  if (event) {
    const resource = event.resources?.[0]?.arn.split(':').pop()
    nodes.push({ kind: 'action', caption: event.read_only ? 'Read' : 'Change', title: actionName(event), detail: resource })
  }
  return nodes
}

export function Chain({ nodes, size = 'md', animate = false }: { nodes: ChainNode[]; size?: 'md' | 'lg'; animate?: boolean }) {
  return (
    <ol className={`chain chain--${size}${animate ? ' chain--animate' : ''}`} aria-label="Attribution chain">
      {nodes.map((n, i) => (
        <li key={i} className={`chain__node chain__node--${n.kind}`} style={{ ['--i' as string]: i }}>
          <span className="chain__caption">{n.caption}</span>
          <span className={n.kind === 'action' || n.kind === 'role' ? 'chain__title mono' : 'chain__title'}>{n.title}</span>
          {n.detail && <span className="chain__detail mono">{n.detail}</span>}
        </li>
      ))}
    </ol>
  )
}
