# Scenario 02: Channel Messaging

## Purpose
Verify that multiple agents can:
1. Send messages to shared channels
2. Read messages from channels
3. See messages from other agents in real-time

## Agents Involved

| Agent | Handle | Role |
|-------|--------|------|
| Agent 1 | `coordinator` | Sends tasks to roadmap channel |
| Agent 2 | `worker-1` | Reads tasks, reports to parallel-work |
| Agent 3 | `worker-2` | Reads tasks, reports to parallel-work |

## Channels Used
- `roadmap` - Coordinator posts tasks here
- `parallel-work` - Workers report progress here
- `errors` - Any agent reports errors here

## Expected Flow

1. All agents register
2. Coordinator posts a task to `roadmap` channel
3. Both workers read the `roadmap` channel
4. Worker-1 claims the task by posting to `parallel-work`
5. Worker-2 sees the claim and acknowledges
6. Coordinator reads `parallel-work` to see progress

## Success Criteria

- [ ] All three agents register successfully
- [ ] Coordinator's message appears in roadmap channel
- [ ] Both workers can read the roadmap message
- [ ] Worker posts are visible in parallel-work
- [ ] Message order is preserved
- [ ] Handles are correctly attributed to messages
