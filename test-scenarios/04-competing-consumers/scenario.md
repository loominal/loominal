# Scenario 04: Competing Consumers

## Purpose
Test that multiple agents with the SAME capability correctly compete for work:
1. Work is distributed (not duplicated) across consumers
2. Each work item is delivered to exactly one agent
3. Load balancing occurs naturally

## Agents Involved

| Agent | Handle | Capabilities |
|-------|--------|--------------|
| Agent 1 | `dispatcher` | work-distribution |
| Agent 2 | `worker-a` | general |
| Agent 3 | `worker-b` | general |
| Agent 4 | `worker-c` | general |

## Work Items
6 tasks all requiring "general" capability:
- task-001 through task-006

## Expected Behavior

With 6 tasks and 3 workers:
- Each worker should get approximately 2 tasks
- NO task should be delivered to multiple workers
- All 6 tasks should be claimed (no orphans)

## Success Criteria

- [ ] All 6 tasks broadcast successfully
- [ ] Each task claimed by exactly ONE worker
- [ ] No duplicate deliveries
- [ ] Total claimed = 6 (sum across all workers)
- [ ] Approximate load balancing (2 ± 1 per worker)
