# Verification: Scenario 02

## Expected Message Flow

### Roadmap Channel
```
[coordinator] TASK-001: Implement the user authentication feature. Priority: HIGH. Deadline: EOD.
[coordinator] TASK-002: Write unit tests for the payment module. Priority: MEDIUM.
```

### Parallel-Work Channel
```
[worker-1] CLAIMING: TASK-001 (user authentication). I have authentication capability. Starting work.
[worker-2] CLAIMING: TASK-002 (unit tests). I have testing capability. Starting work.
[worker-2] ACK: Saw worker-1 on TASK-001. Good coordination - no conflicts!
[worker-1] PROGRESS: TASK-001 - Completed auth middleware setup. Moving to session handling.
[worker-2] PROGRESS: TASK-002 - Test framework setup complete. Writing payment module tests.
```

## Verification Steps

### 1. Check Message Persistence
```bash
# View roadmap stream
nats stream view LOOM_ROADMAP_default

# View parallel-work stream
nats stream view LOOM_PARALLEL_WORK_default
```

### 2. Verify Message Attributes
Each message should have:
- Correct sender handle
- Timestamp
- Proper channel routing

### 3. Timing Verification
- Coordinator posts should appear first
- Worker claims should follow coordinator
- Progress updates should be last

## Success Indicators

| Check | Expected |
|-------|----------|
| Roadmap messages | 2 (from coordinator) |
| Parallel-work messages | 5+ (claims + acks + progress) |
| Unique senders | 3 (coordinator, worker-1, worker-2) |
| No duplicate claims | Each task claimed once |
| Message ordering | Chronological |

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Messages not appearing | Stream not created | Wait for first message |
| Wrong channel | Typo in channel name | Use exact names: roadmap, parallel-work |
| Missing messages | Read limit too low | Increase limit parameter |
| Sender is "unknown" | Handle not set | Call set_handle first |
