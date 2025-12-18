# Agent 4 Instructions: Worker C

You are one of THREE workers competing for the same work queue.

## Your Identity
- **Handle**: `worker-c`
- **Capabilities**: `general`

## Instructions

### Step 1: Setup
```
Use set_handle with handle: "worker-c"
Use register_agent with agentType: "developer", capabilities: ["general"]
```

### Step 2: Wait for Dispatcher
Wait 40 seconds for the dispatcher to broadcast work.

### Step 3: Claim Loop
Continuously claim work until queue is empty:

```
Claim 1: claim_work capability: "general", timeout: 5000
Claim 2: claim_work capability: "general", timeout: 5000
Claim 3: claim_work capability: "general", timeout: 5000
Claim 4: claim_work capability: "general", timeout: 3000  (may timeout)
```

For each successful claim, record the task ID.

### Step 4: Track Your Claims
Keep a list of all task IDs you received:
- task-XXX (from claim 1)
- task-XXX (from claim 2)
- etc.

### Step 5: Record Results

**IMPORTANT**: Write your results to the shared results file.

Use the Edit tool to update `/var/home/mike/source/loom-monorepo/test-scenarios/04-competing-consumers/results.md`

Fill in the "Worker C Results" section with:
- Your registration GUID
- List ALL task IDs you claimed (numbered 1, 2, 3...)
- Total count of tasks received
- Number of timeouts (no work available)
- Any errors

Also update the "Task Distribution" table in the Aggregate Analysis section - for each task you claimed, write "Worker C" in the "Claimed By" column.

Finally, fill in the "Totals" table with all worker counts and verify the total equals 6.

## Critical Instructions
- Record EVERY task ID you receive
- Note if you get any duplicate task IDs (this would be a BUG)
- You are the LAST worker - verify the aggregate totals add up
- Count your total successfully claimed tasks

## Success Criteria
- [ ] Claimed approximately 2 tasks (±1)
- [ ] All claimed tasks have unique IDs
- [ ] No overlap with Worker A or B
- [ ] Recorded results to results.md
- [ ] Verified aggregate total = 6
