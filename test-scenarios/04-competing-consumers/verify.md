# Verification: Scenario 04

## Data Collection

After all agents complete, collect results from each:

### From Worker A
```
Tasks: [list]
Count: X
```

### From Worker B
```
Tasks: [list]
Count: X
```

### From Worker C
```
Tasks: [list]
Count: X
```

## Verification Checks

### 1. Total Task Count
```
Worker A count + Worker B count + Worker C count = 6
```
If not 6, either tasks were lost or duplicated.

### 2. No Duplicates
Combine all task IDs from all workers:
```
All claimed: [A's tasks] + [B's tasks] + [C's tasks]
Unique count should equal total count
```

### 3. All Tasks Accounted
Expected tasks: task-001, task-002, task-003, task-004, task-005, task-006
Verify all 6 appear exactly once across all workers.

### 4. Load Balance Check
Each worker should have 1-3 tasks (ideally 2 each).

## Expected Results Table

| Worker | Expected Tasks | Actual Tasks |
|--------|----------------|--------------|
| A | ~2 | ? |
| B | ~2 | ? |
| C | ~2 | ? |
| **Total** | **6** | **?** |

## NATS Verification
```bash
# Check consumer info
nats consumer info LOOM_WORK_default general-consumer

# Pending messages should be 0 after all claims
# Delivered should equal 6
```

## Success/Failure Matrix

| Scenario | Result |
|----------|--------|
| Total = 6, no duplicates | SUCCESS |
| Total < 6 | FAILURE: Work lost |
| Total > 6 | FAILURE: Duplicate delivery |
| Any task appears twice | FAILURE: Competing consumer bug |
| One worker got all 6 | PARTIAL: Load balance issue |

## Common Issues

| Issue | Cause | Impact |
|-------|-------|--------|
| Total < 6 | Work stuck in queue | Tasks not delivered |
| Total > 6 | ACK not working | Duplicate processing |
| Uneven distribution | Timing differences | Acceptable if no duplicates |
