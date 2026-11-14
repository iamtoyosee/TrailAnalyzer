# Report contract (schema version 0.1)

The backend writes one JSON file. The UI reads it. That file is the only thing they share.

- Machine-readable schema: [`schema/report.schema.json`](../schema/report.schema.json) (JSON Schema 2020-12)
- TypeScript types the UI uses: [`frontend/src/types.ts`](../frontend/src/types.ts)
- A complete example: [`frontend/public/sample-report.json`](../frontend/public/sample-report.json)

Validate a report from Python:

```python
import json, jsonschema
schema = json.load(open("schema/report.schema.json"))
report = json.load(open("report.json"))
jsonschema.Draft202012Validator(schema).validate(report)
```

## Top level

| Field | Type | Notes |
| --- | --- | --- |
| `schema_version` | `"0.1"` | The UI refuses versions it doesn't know |
| `generated_at` | ISO 8601 | When the backend wrote the report |
| `source` | object | Where the trail came from (below) |
| `actors` | list | Everyone and everything that made calls |
| `events` | list | One entry per CloudTrail event |
| `sessions` | list | Runs of related events by one actor |
| `findings` | list | What needs a look |

## `source`

| Field | Required | Notes |
| --- | --- | --- |
| `kind` | yes | `file`, `s3` or `lookup_events` |
| `time_range.start`, `time_range.end` | yes | ISO 8601 |
| `account_id` | no | 12 digits |
| `regions` | no | e.g. `["us-east-1"]` |
| `description` | no | Free text shown to the user |

## `actors[]`

| Field | Required | Notes |
| --- | --- | --- |
| `id` | yes | Your own stable id, referenced by events, sessions, findings |
| `type` | yes | `human`, `agent_on_behalf`, `agent`, `automation`, `unknown` |
| `display_name` | yes | What the UI shows |
| `principal_arn` | no | User, role or assumed-role ARN |
| `on_behalf_of` | no | For `agent_on_behalf`: the `id` of the human actor |
| `agent_client` | no | For agents: e.g. `Claude Code`, `Cursor`, `Python agent (boto3)` |

## `events[]`

| Field | Required | Notes |
| --- | --- | --- |
| `event_id` | yes | CloudTrail `eventID` |
| `event_time` | yes | CloudTrail `eventTime` |
| `event_source` | yes | e.g. `s3.amazonaws.com` |
| `event_name` | yes | e.g. `DeleteObject`. The UI strips API version suffixes like `20150331v2` |
| `aws_region` | yes | |
| `actor_id` | yes | Must exist in `actors` |
| `principal_arn` | yes | `userIdentity.arn` |
| `read_only` | yes | CloudTrail `readOnly` |
| `classification.actor_type` | yes | Same values as `actors[].type` |
| `classification.confidence` | yes | 0 to 1 |
| `classification.signals[]` | yes | `{name, value, points_to, weight}`. Shown as "Why we think this is" |
| `session_id` | no | Must exist in `sessions` if set |
| `source_ip`, `user_agent` | no | |
| `resources[]` | no | `{arn, type}` |
| `error_code` | no | e.g. `AccessDenied` |

## `sessions[]`

| Field | Required | Notes |
| --- | --- | --- |
| `session_id` | yes | |
| `actor_id` | yes | |
| `start`, `end` | yes | ISO 8601 |
| `event_ids` | yes | In time order |
| `title` | no | One plain sentence, e.g. "Claude Code debugging orders-api for Maya" |
| `role_arn` | no | The role the calls went through |

## `findings[]`

| Field | Required | Notes |
| --- | --- | --- |
| `id` | yes | |
| `rule_id` | yes | e.g. `TA-001` |
| `title` | yes | One line, plain words |
| `severity` | yes | `critical`, `high`, `medium`, `low` |
| `description` | yes | What happened and why it matters |
| `actor_ids` | yes | |
| `event_ids` | yes | |
| `recommendation` | yes | How to fix it |
| `iam_policy_snippet` | no | IAM policy JSON as a string; the UI shows it with a copy button |

## Changing the contract

1. Update `schema/report.schema.json` and bump `schema_version` for breaking changes.
2. Update `frontend/src/types.ts` and `SUPPORTED_SCHEMA_VERSIONS`.
3. Regenerate or edit `frontend/public/sample-report.json` and check it still validates.
