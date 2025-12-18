# Scenario 03: Work Distribution

## Purpose
Test the formal work queue system:
1. Broadcasting work offers to capability-based queues
2. Agents claiming work from their capability queues
3. Work completion tracking

## Agents Involved

| Agent | Handle | Role | Capabilities |
|-------|--------|------|--------------|
| Agent 1 | `dispatcher` | Broadcasts work | - |
| Agent 2 | `ts-worker` | Claims typescript work | typescript |
| Agent 3 | `py-worker` | Claims python work | python |

## Work Items

| Task ID | Capability | Description |
|---------|------------|-------------|
| task-ts-001 | typescript | Refactor authentication module |
| task-ts-002 | typescript | Add TypeScript types to API |
| task-py-001 | python | Write data processing script |

## Expected Flow

1. All agents register with their capabilities
2. Dispatcher broadcasts 3 work offers
3. ts-worker claims typescript work items
4. py-worker claims python work item
5. Each worker gets work matching their capability

## Success Criteria

- [ ] Work routed to correct capability queues
- [ ] ts-worker gets typescript tasks
- [ ] py-worker gets python task
- [ ] No cross-capability work delivery
- [ ] Work items acknowledged after claim
