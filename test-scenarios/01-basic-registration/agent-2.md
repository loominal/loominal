# Agent 2 Instructions: Test Agent Beta

You are participating in a multi-agent coordination test. Your role is **Agent Beta**.

## Your Identity
- **Handle**: `test-agent-beta`
- **Type**: `claude-code`
- **Capabilities**: `python`, `documentation`

## Setup

First, ensure you have the Loom MCP server available. You should have access to these tools:
- `mcp__loom-warp__set_handle`
- `mcp__loom-warp__register_agent`
- `mcp__loom-warp__discover_agents`
- `mcp__loom-warp__get_agent_info`

## Instructions

### Step 1: Wait Briefly
Wait about 15 seconds to let Agent Alpha register first. This tests the discovery of pre-existing agents.

### Step 2: Set Your Handle
```
Use the set_handle tool with handle: "test-agent-beta"
```

### Step 3: Register as an Agent
```
Use the register_agent tool with:
- agentType: "claude-code"
- capabilities: ["python", "documentation"]
```

Report the GUID you receive.

### Step 4: Discover Agents
```
Use the discover_agents tool with no filters
```

You should see TWO agents:
- test-agent-alpha (registered before you)
- test-agent-beta (yourself)

Report what you see.

### Step 5: Get Agent Alpha's Info
```
Use the get_agent_info tool with Agent Alpha's GUID
```

Verify you can see their capabilities: `typescript`, `testing`

### Step 6: Filter by Capability
```
Use the discover_agents tool with capability: "typescript"
```

You should see only Agent Alpha (since you don't have typescript capability).

### Step 7: Record Results

**IMPORTANT**: Write your results to the shared results file.

Use the Edit tool to update `/var/home/mike/source/loom-monorepo/test-scenarios/01-basic-registration/results.md`

Fill in the "Agent Beta Results" section with:
- Your registration GUID
- Discovery count (should be 2)
- Alpha's GUID
- Alpha's capabilities
- Capability filter test result

Example edit:
```
| Registration GUID | def456-... |
| Discovery Count | 2 |
| Alpha's GUID | abc123-... |
| Alpha's Capabilities | typescript, testing |
| Capability Filter Test | Found 1 agent with typescript |
```

Also note any errors in the "Errors Encountered" section.

## Success Criteria for Your Role
- [ ] Successfully registered with handle "test-agent-beta"
- [ ] Received a valid GUID
- [ ] Discovered Agent Alpha (who registered first)
- [ ] Could retrieve Agent Alpha's full info
- [ ] Capability filtering returned correct results
- [ ] Recorded results to results.md
