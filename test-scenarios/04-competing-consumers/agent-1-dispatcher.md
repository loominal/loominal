# Agent 1 Instructions: Dispatcher

You broadcast work to test competing consumers.

## Your Identity
- **Handle**: `dispatcher`

## Instructions

### Step 1: Setup
```
Use set_handle with handle: "dispatcher"
Use register_agent with agentType: "dispatcher", capabilities: ["work-distribution"]
```

### Step 2: Wait for Workers
Wait 30 seconds for all 3 workers (worker-a, worker-b, worker-c) to register.

### Step 3: Verify Workers Ready
```
Use discover_agents with capability: "general"
```

You should see 3 agents with "general" capability.

### Step 4: Broadcast 6 Work Items
Broadcast all 6 rapidly (don't wait between them):

```
broadcast_work_offer: taskId: "task-001", description: "Process batch 1", requiredCapability: "general", priority: 5
broadcast_work_offer: taskId: "task-002", description: "Process batch 2", requiredCapability: "general", priority: 5
broadcast_work_offer: taskId: "task-003", description: "Process batch 3", requiredCapability: "general", priority: 5
broadcast_work_offer: taskId: "task-004", description: "Process batch 4", requiredCapability: "general", priority: 5
broadcast_work_offer: taskId: "task-005", description: "Process batch 5", requiredCapability: "general", priority: 5
broadcast_work_offer: taskId: "task-006", description: "Process batch 6", requiredCapability: "general", priority: 5
```

### Step 5: Confirm All Queued
All 6 broadcasts should succeed.

### Step 6: Record Results

**IMPORTANT**: Write your results to the shared results file.

Use the Edit tool to update `/var/home/mike/source/loom-monorepo/test-scenarios/04-competing-consumers/results.md`

Fill in the "Dispatcher Results" section with:
- Your registration GUID
- Number of workers discovered with "general" capability
- Success/failure of each of the 6 broadcasts
- Any errors

## Success Criteria
- [ ] All 6 work items broadcast successfully
- [ ] Saw 3 workers with "general" capability
- [ ] Recorded results to results.md
