# Multi-Agent Timing & Synchronization Notes

## Problem Discovered

During Scenario 02 (Channel Messaging), we observed that agents missed messages from other agents. This was **not a bug in loom-warp** but rather a test design issue.

### Symptoms
- Worker-2 read the roadmap channel but found it empty
- Worker-1 read parallel-work but didn't see Worker-2's messages
- Coordinator only saw partial worker responses

### Root Cause
Agents were reading channels **before** other agents had posted. The channel messaging system works correctly - messages are delivered and persisted - but agents need to coordinate their timing.

## Solution: Retry Logic

Multi-agent scenarios require explicit synchronization. Agents should **poll with retries** rather than read once and assume data is there.

### Pattern: Retry Loop for Channel Reads

```
Retry loop (max N attempts, X seconds apart):
1. Read channel
2. Check if expected content is present
3. If yes, proceed
4. If no, wait X seconds and retry
```

### Pattern: Discovery-Based Synchronization

For coordinators that need to wait for workers:

```
1. Register self
2. Poll discover_agents until expected agents are online
3. Only then post tasks/messages
```

## Recommended Retry Parameters

| Scenario | Max Attempts | Delay Between |
|----------|--------------|---------------|
| Waiting for agent registration | 6 | 10 seconds |
| Waiting for channel messages | 6 | 10 seconds |
| Final read to capture full thread | 3 | 15 seconds |

## Key Insight

Channel messaging is **not real-time push** to agents - agents must poll. This is by design (agents are independent processes). The test scenarios initially assumed synchronous execution order, but agents run asynchronously and may execute steps at different speeds.

## Applied To

- **Scenario 02**: Updated all three agent instructions with retry loops
- **Scenario 03+**: Should follow same patterns

## Checklist for Future Scenarios

- [ ] Coordinator waits for workers via `discover_agents` before posting
- [ ] Workers retry channel reads until expected content appears
- [ ] Add "announcement" messages to signal state changes
- [ ] Final reads should retry to ensure full thread capture
- [ ] Document expected message flow in scenario.md
