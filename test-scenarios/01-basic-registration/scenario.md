# Scenario 01: Basic Agent Registration

## Purpose
Verify that two agents can:
1. Register themselves in the Loom system
2. Discover each other
3. See each other's capabilities and status

## Agents Involved

| Agent | Handle | Type | Capabilities |
|-------|--------|------|--------------|
| Agent 1 | `test-agent-alpha` | claude-code | typescript, testing |
| Agent 2 | `test-agent-beta` | claude-code | python, documentation |

## Expected Flow

1. Agent 1 registers first
2. Agent 1 discovers agents (should see only itself)
3. Agent 2 registers
4. Agent 2 discovers agents (should see both)
5. Agent 1 discovers agents again (should now see both)
6. Both agents verify they can see each other's details

## Success Criteria

- [ ] Both agents register successfully with unique GUIDs
- [ ] Agent discovery returns accurate agent counts
- [ ] Capabilities are correctly reported
- [ ] Status shows "online" for both agents
- [ ] No errors in NATS communication
