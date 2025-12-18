# Agent 2 Instructions: Worker 1

You are **Worker 1** in a channel messaging test.

## Your Identity
- **Handle**: `worker-1`
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
Use set_handle with handle: "worker-1"
```

### Step 2: Register
```
Use register_agent with:
- agentType: "developer"
- capabilities: ["typescript", "authentication"]
```

### Step 3: Wait for Coordinator's Tasks (with retry)

**IMPORTANT**: The coordinator will wait for you to register, then post tasks. Use retry logic to catch the tasks.

```
Retry loop (max 6 attempts, 10 seconds apart):
1. Use read_messages with channel: "roadmap", limit: 10
2. If you see messages from "coordinator" containing TASK-001 and TASK-002, proceed
3. Otherwise wait 10 seconds and retry
```

### Step 4: Claim TASK-001

Once you see the tasks:
```
Use send_message with:
- channel: "parallel-work"
- message: "CLAIMING: TASK-001 (user authentication). I have authentication capability. Starting work."
```

### Step 5: Simulate Progress

Wait 10 seconds, then:
```
Use send_message with:
- channel: "parallel-work"
- message: "PROGRESS: TASK-001 - Completed auth middleware setup. Moving to session handling."
```

### Step 6: Wait for Worker-2

Wait 20 seconds for Worker-2 to claim and post.

### Step 7: Check for Worker-2 (with retry)

```
Retry loop (max 3 attempts, 10 seconds apart):
1. Use read_messages with channel: "parallel-work", limit: 30
2. If you see messages from "worker-2", proceed
3. Otherwise wait 10 seconds and retry
```

### Step 8: Report Completion
```
Use send_message with:
- channel: "parallel-work"
- message: "COMPLETE: TASK-001 finished. Auth system implemented."
```

### Step 9: Record Results

**IMPORTANT**: Write your results to the shared results file.

Use the Edit tool to update `/var/home/mike/source/loom-monorepo/test-scenarios/02-channel-messaging/results.md`

Fill in the "Worker-1 Results" section with:
- Your registration GUID
- Tasks seen in roadmap (paste the messages)
- Which task you claimed
- Whether you saw Worker-2's activity (paste their messages)
- Full parallel-work thread at the end
- Any errors

## Success Criteria
- [ ] Read tasks from roadmap channel (saw TASK-001 and TASK-002)
- [ ] Successfully claimed TASK-001
- [ ] Posted progress update
- [ ] Saw Worker-2's messages in parallel-work
- [ ] Recorded results to results.md
