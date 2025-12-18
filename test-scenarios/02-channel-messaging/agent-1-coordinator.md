# Agent 1 Instructions: Coordinator

You are the **Coordinator** in a channel messaging test.

## Your Identity
- **Handle**: `coordinator`
- **Role**: Task assignment and monitoring

## Setup

You should have access to these Loom tools:
- `mcp__loom-warp__set_handle`
- `mcp__loom-warp__register_agent`
- `mcp__loom-warp__list_channels`
- `mcp__loom-warp__send_message`
- `mcp__loom-warp__read_messages`
- `mcp__loom-warp__discover_agents`

## Instructions

### Step 1: Set Your Handle
```
Use set_handle with handle: "coordinator"
```

### Step 2: Register
```
Use register_agent with:
- agentType: "coordinator"
- capabilities: ["task-assignment", "monitoring"]
```

### Step 3: List Available Channels
```
Use list_channels to see available channels
```

You should see: `roadmap`, `parallel-work`, `errors`

### Step 4: Wait for Workers to Register

**IMPORTANT**: Use `discover_agents` with retry to confirm workers are online before posting tasks.

```
Retry loop (max 6 attempts, 10 seconds apart):
1. Use discover_agents with agentType: "developer"
2. If you see 2 agents with handles "worker-1" and "worker-2", proceed
3. Otherwise wait 10 seconds and retry
```

Only proceed when BOTH workers are registered.

### Step 5: Post Tasks to Roadmap

Once both workers are confirmed:
```
Use send_message with:
- channel: "roadmap"
- message: "TASK-001: Implement the user authentication feature. Priority: HIGH. Deadline: EOD."
```

Then immediately:
```
Use send_message with:
- channel: "roadmap"
- message: "TASK-002: Write unit tests for the payment module. Priority: MEDIUM."
```

### Step 6: Announce in Parallel-Work
```
Use send_message with:
- channel: "parallel-work"
- message: "COORDINATOR: Tasks posted to roadmap. Workers please check and claim."
```

### Step 7: Wait and Monitor

Wait 45 seconds for workers to claim and report progress.

### Step 8: Read Parallel-Work Channel (with retry)

```
Retry loop (max 3 attempts, 15 seconds apart):
1. Use read_messages with channel: "parallel-work", limit: 30
2. If you see messages from BOTH worker-1 AND worker-2, proceed
3. Otherwise wait 15 seconds and retry
```

### Step 9: Record Results

**IMPORTANT**: Write your results to the shared results file.

Use the Write tool to create `/var/home/mike/source/loom-monorepo/test-scenarios/02-channel-messaging/results.md` if it doesn't exist, or Edit to update it.

Fill in the "Coordinator Results" section with:
- Your registration GUID
- Channels listed
- Workers discovered (handles and GUIDs)
- Whether tasks posted successfully
- Worker responses you saw in parallel-work (paste ALL messages)
- Any errors

## Success Criteria
- [ ] Listed all 3 channels
- [ ] Confirmed both workers registered before posting
- [ ] Successfully posted 2 tasks to roadmap
- [ ] Saw responses from BOTH workers in parallel-work
- [ ] Messages had correct sender handles
- [ ] Recorded results to results.md
