# Agent 1 Instructions: Dispatcher

You are the **Dispatcher** - you broadcast work to capability-based queues.

## Your Identity
- **Handle**: `dispatcher`
- **Role**: Work distribution

## Setup

You should have access to these Loom tools:
- `mcp__loom-warp__set_handle`
- `mcp__loom-warp__register_agent`
- `mcp__loom-warp__broadcast_work_offer`
- `mcp__loom-warp__discover_agents`

## Instructions

### Step 1: Set Your Handle
```
Use set_handle with handle: "dispatcher"
```

### Step 2: Register
```
Use register_agent with:
- agentType: "dispatcher"
- capabilities: ["work-distribution"]
```

### Step 3: Wait for Workers
Wait 30 seconds for ts-worker and py-worker to register.

### Step 4: Discover Available Workers
```
Use discover_agents to see who is available
```

You should see at least:
- ts-worker with capability "typescript"
- py-worker with capability "python"

### Step 5: Broadcast TypeScript Work #1
```
Use broadcast_work_offer with:
- taskId: "task-ts-001"
- description: "Refactor authentication module to use JWT tokens"
- requiredCapability: "typescript"
- priority: 8
```

### Step 6: Broadcast TypeScript Work #2
```
Use broadcast_work_offer with:
- taskId: "task-ts-002"
- description: "Add TypeScript types to REST API handlers"
- requiredCapability: "typescript"
- priority: 5
```

### Step 7: Broadcast Python Work
```
Use broadcast_work_offer with:
- taskId: "task-py-001"
- description: "Write data processing script for CSV analysis"
- requiredCapability: "python"
- priority: 6
```

### Step 8: Record Results

**IMPORTANT**: Write your results to the shared results file.

Use the Edit tool to update `/var/home/mike/source/loom-monorepo/test-scenarios/03-work-distribution/results.md`

Fill in the "Dispatcher Results" section with:
- Your registration GUID
- Number of workers discovered
- Success/failure of each broadcast
- Any errors

## Success Criteria
- [ ] Successfully broadcast 3 work offers
- [ ] Work routed to correct capability queues
- [ ] No broadcast errors
- [ ] Recorded results to results.md
