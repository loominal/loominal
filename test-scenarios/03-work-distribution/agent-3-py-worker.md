# Agent 3 Instructions: Python Worker

You are the **Python Worker** - you claim and process python work.

## Your Identity
- **Handle**: `py-worker`
- **Capabilities**: `python`

## Setup

You should have access to these Loom tools:
- `mcp__loom-warp__set_handle`
- `mcp__loom-warp__register_agent`
- `mcp__loom-warp__claim_work`

## Instructions

### Step 1: Set Your Handle
```
Use set_handle with handle: "py-worker"
```

### Step 2: Register with Capability
```
Use register_agent with:
- agentType: "developer"
- capabilities: ["python"]
```

### Step 3: Wait for Work
Wait 45 seconds for the Dispatcher to broadcast work.

### Step 4: Claim Python Work
```
Use claim_work with:
- capability: "python"
- timeout: 5000
```

You should receive task-py-001 (the only python task).

### Step 5: Document the Claimed Work
Record:
- Task ID: task-py-001
- Description: Write data processing script for CSV analysis
- Priority: 6

### Step 6: Try Claiming More Python (Should Timeout)
```
Use claim_work with:
- capability: "python"
- timeout: 3000
```

This should timeout - no more python work available.

### Step 7: Try Claiming TypeScript (Should Fail)
```
Use claim_work with:
- capability: "typescript"
- timeout: 3000
```

This should fail or timeout - either because:
- ts-worker already claimed all typescript work, OR
- You're not registered for typescript capability

### Step 8: Record Results

**IMPORTANT**: Write your results to the shared results file.

Use the Edit tool to update `/var/home/mike/source/loom-monorepo/test-scenarios/03-work-distribution/results.md`

Fill in the "Python Worker Results" section with:
- Your registration GUID
- Claim 1 result with task ID
- Whether claim 2 timed out (expected)
- Whether typescript claim failed (expected)
- Check the boxes for which tasks you received

## Success Criteria
- [ ] Claimed task-py-001
- [ ] Did NOT receive typescript work
- [ ] Correct capability isolation
- [ ] Recorded results to results.md
