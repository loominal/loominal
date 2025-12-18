# Loom Multi-Agent Test Scenarios

This directory contains test scenarios for verifying the Loom multi-agent coordination system with real Claude Code instances.

## Prerequisites

1. **NATS Server Running**
   ```bash
   docker run -d --name nats -p 4222:4222 -p 8222:8222 nats:latest -js
   ```

2. **Warp MCP Server Built**
   ```bash
   cd /var/home/mike/source/loom-monorepo/warp
   npm run build
   ```

3. **Claude Code with Loom MCP**
   Each Claude Code instance needs the Warp MCP server configured in their settings.

## Test Scenarios

| Scenario | Agents | Purpose |
|----------|--------|---------|
| [01-basic-registration](./01-basic-registration/) | 2 | Verify agents can see each other |
| [02-channel-messaging](./02-channel-messaging/) | 3 | Test broadcast communication |
| [03-work-distribution](./03-work-distribution/) | 3 | Test work queue and claiming |
| [04-competing-consumers](./04-competing-consumers/) | 4 | Test load balancing across agents |

## How to Run a Scenario

1. **Open the scenario folder** (e.g., `01-basic-registration/`)

2. **Read scenario.md** to understand the test goals

3. **Open a new Claude Code terminal for each agent**

4. **Copy the agent instructions** to each Claude Code instance:
   - Agent 1: Copy contents of `agent-1.md` (or `agent-1-*.md`)
   - Agent 2: Copy contents of `agent-2.md` (or `agent-2-*.md`)
   - etc.

5. **Agents will record results** to `results.md` in the scenario folder

6. **Review results.md** after all agents complete to see aggregated outcomes

## File Structure Per Scenario

```
scenario-name/
├── scenario.md      # Overview and goals
├── agent-1.md       # Instructions for agent 1
├── agent-2.md       # Instructions for agent 2
├── ...
├── results.md       # Shared results file (agents write here)
└── verify.md        # How to verify success
```

## Results Collection

Each agent is instructed to write their results to the shared `results.md` file using the Edit tool. This creates a centralized record of:
- Each agent's registration GUID
- Tasks/messages received
- Errors encountered
- Success/failure of each step

After all agents complete, review `results.md` to verify:
- All expected agents participated
- No duplicate work delivery
- Correct capability routing
- Proper message ordering
