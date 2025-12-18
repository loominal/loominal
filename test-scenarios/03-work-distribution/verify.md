# Verification: Scenario 03

## Expected Work Distribution

| Task ID | Capability | Expected Claimer |
|---------|------------|------------------|
| task-ts-001 | typescript | ts-worker |
| task-ts-002 | typescript | ts-worker |
| task-py-001 | python | py-worker |

## Verification Steps

### 1. Check Work Stream
```bash
# View work queue streams
nats stream ls | grep LOOM_WORK

# Check typescript queue
nats consumer info LOOM_WORK_default typescript-consumer

# Check python queue
nats consumer info LOOM_WORK_default python-consumer
```

### 2. Verify Capability Isolation
- ts-worker should ONLY receive typescript tasks
- py-worker should ONLY receive python tasks
- No cross-capability delivery

### 3. Verify Work Acknowledgment
After claiming, work should be removed from queue:
```bash
# Queue should be empty after claims
nats stream info LOOM_WORK_default
```

## Success Indicators

| Check | Expected Result |
|-------|-----------------|
| ts-worker claims | 2 typescript tasks |
| py-worker claims | 1 python task |
| Cross-capability attempts | Timeout or rejection |
| Queue empty after claims | Yes |
| Work IDs match broadcast | Yes |

## Timing Considerations

```
T+0s:    All agents register
T+30s:   Dispatcher broadcasts 3 work items
T+45s:   Workers start claiming
T+60s:   All work should be claimed
T+90s:   Workers report results
```

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| No work received | Wrong capability | Check registration |
| Work not queued | Stream not created | Check broadcast result |
| Timeout on claim | Work already claimed | Expected if queue empty |
| Wrong task received | Capability mismatch | Verify capability string |
