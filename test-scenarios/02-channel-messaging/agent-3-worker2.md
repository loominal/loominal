# Agent 3 Instructions: Worker 2

You are **Worker 2** in a channel messaging test.

## Your Identity
- **Handle**: `worker-2`
- **Role**: Task execution

## Setup

You should have access to these Loom tools:
- `mcp__loom-warp__set_handle`
- `mcp__loom-warp__register_agent`
- `mcp__loom-warp__send_message`
- `mcp__loom-warp__read_messages`

## Instructions

### Step 1: Set Your Handle
```
Use set_handle with handle: "worker-2"
```

### Step 2: Register
```
Use register_agent with:
- agentType: "developer"
- capabilities: ["typescript", "testing"]
```

### Step 3: Wait for Coordinator's Tasks (with retry)

**IMPORTANT**: The coordinator will wait for workers to register, then post tasks. Use retry logic.

```
Retry loop (max 6 attempts, 10 seconds apart):
1. Use read_messages with channel: "roadmap", limit: 10
2. If you see messages from "coordinator" containing TASK-001 and TASK-002, proceed
3. Otherwise wait 10 seconds and retry
```

### Step 4: Check Worker-1's Claim (with retry)

Before claiming, check what Worker-1 took:
```
Retry loop (max 4 attempts, 10 seconds apart):
1. Use read_messages with channel: "parallel-work", limit: 20
2. If you see a CLAIMING message from "worker-1", proceed
3. Otherwise wait 10 seconds and retry
```

### Step 5: Claim TASK-002

Since Worker-1 should have TASK-001, claim the remaining task:
```
Use send_message with:
- channel: "parallel-work"
- message: "CLAIMING: TASK-002 (unit tests). I have testing capability. Starting work."
```

### Step 6: Acknowledge Worker-1
```
Use send_message with:
- channel: "parallel-work"
- message: "ACK: Saw worker-1 on TASK-001. Good coordination - no conflicts!"
```

### Step 7: Simulate Progress

Wait 10 seconds, then:
```
Use send_message with:
- channel: "parallel-work"
- message: "PROGRESS: TASK-002 - Test framework setup complete. Writing payment module tests."
```

### Step 8: Report Completion

Wait 10 seconds, then:
```
Use send_message with:
- channel: "parallel-work"
- message: "COMPLETE: TASK-002 finished. All payment module tests passing."
```

### Step 9: Final Read

Wait 15 seconds for any final messages, then:
```
Use read_messages with:
- channel: "parallel-work"
- limit: 50
```

Document the full conversation thread.

### Step 10: Record Results

**IMPORTANT**: Write your results to the shared results file.

Use the Edit tool to update `/var/home/mike/source/loom-monorepo/test-scenarios/02-channel-messaging/results.md`

Fill in the "Worker-2 Results" section with:
- Your registration GUID
- Tasks seen in roadmap (paste the messages)
- Whether you saw Worker-1's claim before claiming yours
- Which task you claimed
- The full parallel-work message thread (paste ALL messages with timestamps)
- Any errors

## Success Criteria
- [ ] Saw tasks in roadmap channel (TASK-001 and TASK-002)
- [ ] Correctly identified Worker-1's claim before claiming
- [ ] Claimed unclaimed task (TASK-002)
- [ ] Acknowledged coordination with Worker-1
- [ ] Saw complete message history from all participants
- [ ] Recorded results to results.md
