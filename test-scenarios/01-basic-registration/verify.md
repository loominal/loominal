# Verification: Scenario 01

## Expected Results

### Agent Alpha (First to Register)
- Receives unique GUID (UUID v4 format)
- Initial discovery shows 1 agent (itself)
- Second discovery shows 2 agents
- Can retrieve Beta's info with capabilities: ["python", "documentation"]

### Agent Beta (Second to Register)
- Receives unique GUID (different from Alpha)
- Discovery immediately shows 2 agents
- Can retrieve Alpha's info with capabilities: ["typescript", "testing"]
- Capability filter for "typescript" returns only Alpha

## How to Verify

### Check NATS Directly
```bash
# View all registered agents in the KV store
nats kv get loom-agents-default --all

# Or use the NATS monitoring endpoint
curl http://localhost:8222/jsz | jq '.streams'
```

### Success Indicators
1. Both agents report successful registration
2. Both agents can see each other in discovery
3. GUIDs are unique and valid UUIDs
4. Capabilities match what was registered
5. No timeout or connection errors

## Common Issues

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| Agent not found | NATS not running | Start NATS container |
| Empty discovery | Wrong project ID | Check both use same projectId |
| Capability mismatch | Registration error | Re-register agent |
| Connection refused | MCP not configured | Add Warp MCP to settings |
