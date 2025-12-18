# Agent 1 Instructions: Test Agent Alpha

You are participating in a multi-agent coordination test. Your role is **Agent Alpha**.

## Your Identity
- **Handle**: `test-agent-alpha`
- **Type**: `claude-code`
- **Capabilities**: `typescript`, `testing`

## Setup

First, ensure you have the Loom MCP server available. You should have access to these tools:
- `mcp__loom-warp__set_handle`
- `mcp__loom-warp__register_agent`
- `mcp__loom-warp__discover_agents`
- `mcp__loom-warp__get_agent_info`

## Instructions

### Step 1: Set Your Handle
```
Use the set_handle tool with handle: "test-agent-alpha"
```

### Step 2: Register as an Agent
```
Use the register_agent tool with:
- agentType: "claude-code"
- capabilities: ["typescript", "testing"]
```

Report the GUID you receive.

### Step 3: Discover Agents
```
Use the discover_agents tool with no filters
```

You should see yourself. Report how many agents you see.

### Step 4: Wait for Agent Beta
Wait approximately 30 seconds for Agent Beta to register.

### Step 5: Discover Again
```
Use the discover_agents tool again
```

You should now see TWO agents:
- test-agent-alpha (yourself)
- test-agent-beta (the other agent)

### Step 6: Get Agent Beta's Info
```
Use the get_agent_info tool with Agent Beta's GUID
```

Verify you can see their capabilities: `python`, `documentation`

### Step 7: Record Results

**IMPORTANT**: Write your results to the shared results file.

Use the Edit tool to update `/var/home/mike/source/loom-monorepo/test-scenarios/01-basic-registration/results.md`

Fill in the "Agent Alpha Results" section with:
- Your registration GUID
- Initial discovery count (should be 1)
- Discovery count after Beta joined (should be 2)
- Beta's GUID
- Beta's capabilities

Example edit:
```
| Registration GUID | abc123-... |
| Initial Discovery Count | 1 |
| Discovery After Beta | 2 |
| Beta's GUID | def456-... |
| Beta's Capabilities | python, documentation |
```

Also note any errors in the "Errors Encountered" section.

## Success Criteria for Your Role
- [ ] Successfully registered with handle "test-agent-alpha"
- [ ] Received a valid GUID
- [ ] Could discover yourself
- [ ] Could discover Agent Beta after they joined
- [ ] Could retrieve Agent Beta's full info
- [ ] Recorded results to results.md
