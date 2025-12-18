# Agent 2 Instructions: TypeScript Worker

You are the **TypeScript Worker** - you claim and process typescript work.

## Your Identity
- **Handle**: `ts-worker`
- **Capabilities**: `typescript`

## Setup

You should have access to these Loom tools:
- `mcp__loom-warp__set_handle`
- `mcp__loom-warp__register_agent`
- `mcp__loom-warp__claim_work`

## Instructions

### Step 1: Set Your Handle
```
Use set_handle with handle: "ts-worker"
```

### Step 2: Register with Capability
```
Use register_agent with:
- agentType: "developer"
- capabilities: ["typescript"]
```

This capability registration is critical - it determines what work you can claim.

### Step 3: Wait for Work
Wait 45 seconds for the Dispatcher to broadcast work.

### Step 4: Claim First TypeScript Work
```
Use claim_work with:
- capability: "typescript"
- timeout: 5000
```

You should receive one of the typescript tasks (task-ts-001 or task-ts-002).

### Step 5: Document the Claimed Work
Record:
- Task ID received
- Description
- Priority

### Step 6: Claim Second TypeScript Work
```
Use claim_work with:
- capability: "typescript"
- timeout: 5000
```

You should receive the other typescript task.

### Step 7: Try Claiming More (Should Fail)
```
Use claim_work with:
- capability: "typescript"
- timeout: 3000
```

This should timeout - no more typescript work available.

### Step 8: Try Claiming Python (Should Fail)
```
Use claim_work with:
- capability: "python"
- timeout: 3000
```

This should also fail - you're not registered for python capability.

### Step 9: Record Results

**IMPORTANT**: Write your results to the shared results file.

Use the Edit tool to update `/var/home/mike/source/loom-monorepo/test-scenarios/03-work-distribution/results.md`

Fill in the "TypeScript Worker Results" section with:
- Your registration GUID
- Each claim result with task ID
- Whether claim 3 timed out (expected)
- Whether python claim failed (expected)
- Check the boxes for which tasks you received

## Success Criteria
- [ ] Claimed task-ts-001
- [ ] Claimed task-ts-002
- [ ] Did NOT receive python work
- [ ] Timeout when queue empty
- [ ] Recorded results to results.md
