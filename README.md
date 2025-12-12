# Loominal

**Weaving AI agents together.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![NATS](https://img.shields.io/badge/NATS-JetStream-green.svg)](https://nats.io/)
[![Status: Beta](https://img.shields.io/badge/Status-Beta-blue.svg)]()

---

Loominal is infrastructure for multi-agent AI systems. Built on [NATS JetStream](https://nats.io/) and the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/), it transforms isolated AI assistants into a coordinated fabric of collaborating agents.

## The Problem

Today's AI coding assistants are **islands**. Each Claude Code session, each GitHub Copilot instance operates in complete isolation. There's no way for them to:

- Share context or findings with other agents
- Hand off work based on capabilities or access rights
- Coordinate on complex, multi-part tasks
- Scale up or down based on workload

**Loominal weaves them together.**

## The Fabric

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WARP (Backbone)                                │
│                    NATS JetStream + MCP Server                              │
│              Persistent messaging infrastructure for agents                 │
└─────────────────────────────────────────────────────────────────────────────┘
        ▲               ▲               ▲               ▲               ▲
        │               │               │               │               │
   ┌────┴────┐     ┌────┴────┐     ┌────┴────┐     ┌────┴────┐     ┌────┴────┐
   │ Claude  │     │ Claude  │     │ Copilot │     │  WEFT   │     │  Your   │
   │  Code   │     │  Code   │     │   CLI   │     │ Service │     │  Agent  │
   │ (Home)  │     │ (Cloud) │     │ (Work)  │     │         │     │         │
   └─────────┘     └─────────┘     └─────────┘     └─────────┘     └─────────┘
     Agent           Agent           Agent        Coordinator        Agent
```

### The Components

| Component | Weaving Metaphor | Purpose |
|-----------|------------------|---------|
| **Warp** | The vertical threads — the foundation | MCP server providing messaging backbone. Install once, gives agents 16 communication tools. |
| **Weft** | The horizontal threads woven through | Coordinator service that routes work, manages agent lifecycle, and handles scaling. |
| **Shuttle** | Carries thread back and forth | CLI tool for submitting work, managing agents, and monitoring your fleet. |

Together, Warp and Weft create the fabric. Shuttle moves work through it.

## Key Features

### Agent-to-Agent Communication (Warp)
- **Channels** for broadcast messaging (announcements, status updates)
- **Direct messaging** for point-to-point communication between specific agents
- **Persistent history** so agents joining late can catch up on context
- **Agent registry** for discovering other agents by capability or location

### Intelligent Work Distribution (Weft)
- **Classification-based routing** sends corporate work to approved agents
- **Capability matching** routes TypeScript tasks to TypeScript-capable agents
- **Load balancing** distributes work across available workers
- **Dead letter queue** captures failed work for debugging and retry

### Dynamic Agent Provisioning (Weft)
- **Auto spin-up** launches new agents when work arrives
- **Multiple mechanisms**: SSH, Kubernetes Jobs, GitHub Actions, Webhooks
- **Idle detection** shuts down unused agents to save resources
- **Target registry** manages your fleet of potential agent hosts

### Fleet Management (Shuttle)
- **Submit work** from the command line
- **Monitor agents** across all your machines
- **Manage targets** for dynamic provisioning
- **Watch progress** in real-time

## Use Cases

### Multi-Machine Development
Run Claude Code on your powerful home server while working from a laptop. Agents communicate seamlessly through the Warp.

### Corporate + Personal Separation
Route sensitive corporate tasks to approved agents, while personal projects go to your home setup. Weft handles policy-based routing automatically.

### Swarm Programming
Spawn multiple agents to work on different parts of a large codebase simultaneously. Agents coordinate through channels and hand off completed work.

### CI/CD Integration
Trigger agent work from GitHub Actions or webhooks. Weft can spin up agents on-demand and report progress back to your pipeline.

## Quick Start

### 1. Start NATS

```bash
# Docker (easiest)
docker run -d --name nats -p 4222:4222 nats:latest -js

# Or install locally
brew install nats-server  # macOS
nats-server -js
```

### 2. Install Warp (MCP Server)

```bash
npm install -g @loominal/warp
```

Configure Claude Code (`~/.claude/mcp.json`):

```json
{
  "mcpServers": {
    "loominal": {
      "command": "warp",
      "env": {
        "NATS_URL": "nats://localhost:4222"
      }
    }
  }
}
```

### 3. Start Weaving

In Claude Code, agents can now:

```
# Set your identity
mcp__loominal__set_handle("my-agent")

# Register in the global registry
mcp__loominal__register_agent({ agentType: "developer", capabilities: ["typescript"] })

# Discover other agents
mcp__loominal__discover_agents({ capability: "python" })

# Send a direct message
mcp__loominal__send_direct_message({ recipientGuid: "...", message: "Need help with tests" })

# Broadcast to a channel
mcp__loominal__send_message({ channel: "updates", message: "Refactoring complete" })
```

### 4. (Optional) Add Weft + Shuttle

For work routing and auto-scaling:

```bash
# Start Weft (coordinator)
cd weft
docker-compose up -d

# Install Shuttle (CLI)
npm install -g @loominal/shuttle

# Configure
shuttle config set nats-url nats://localhost:4222
shuttle config set project-id my-project

# Submit work
shuttle submit "Implement user authentication" \
  --boundary personal \
  --capability typescript
```

## Architecture

### Warp — The Backbone

A standards-compliant MCP server that adds 16 tools to Claude Code:

| Category | Tools |
|----------|-------|
| Identity | `set_handle`, `get_my_handle` |
| Channels | `list_channels`, `send_message`, `read_messages` |
| Registry | `register_agent`, `discover_agents`, `get_agent_info`, `update_presence`, `deregister_agent` |
| Direct Messaging | `send_direct_message`, `read_direct_messages` |
| Work Distribution | `broadcast_work_offer` |
| Error Handling | `list_dead_letter_items`, `retry_dead_letter_item`, `discard_dead_letter_item` |

[Warp Documentation →](./warp/README.md)

### Weft — The Coordinator

Adds intelligent orchestration:

- **Work Classification**: Route based on corporate/personal/open-source policies
- **Dynamic Spin-Up**: SSH, Kubernetes, GitHub Actions, Webhooks
- **Target Registry**: Manage your fleet of agent hosts
- **Idle Detection**: Automatic scale-down to save resources
- **REST API**: Integrate with existing tools and dashboards

[Weft Documentation →](./weft/README.md)

### Shuttle — The CLI

Command-line control of your agent fabric:

```bash
shuttle submit <task>      # Submit work
shuttle agents list        # View registered agents
shuttle work list          # View work items
shuttle watch <work-id>    # Watch progress in real-time
shuttle targets list       # View spin-up targets
shuttle spin-up <target>   # Manually trigger agent spin-up
shuttle stats              # View coordinator statistics
```

[Shuttle Documentation →](./weft/shuttle/README.md)

### Project Isolation

Every project gets its own namespace derived from the working directory. Agents in different projects can't see each other by default—but can opt into cross-project communication when needed.

```
/home/user/project-a  →  namespace: a1b2c3d4...
/home/user/project-b  →  namespace: e5f6g7h8...
```

## Comparison

| Feature | Loominal | Raw NATS | Custom Solution |
|---------|----------|----------|-----------------|
| MCP Integration | Native | Manual | Manual |
| Agent Discovery | Built-in | Manual | Build yourself |
| Work Distribution | Built-in | Manual | Build yourself |
| Dead Letter Queue | Built-in | Manual | Build yourself |
| Dynamic Scaling | Built-in | N/A | Build yourself |
| Time to Deploy | Minutes | Hours | Days/Weeks |

## Requirements

- **Node.js** 18 or later
- **NATS Server** with JetStream enabled
- **Claude Code** (for MCP integration) or any MCP-compatible client

## Project Structure

```
loominal/
├── warp/                  # Warp — MCP server (npm: @loominal/warp)
│   ├── src/
│   │   ├── tools/         # MCP tool implementations
│   │   ├── registry.ts    # Agent registry
│   │   ├── inbox.ts       # Direct messaging
│   │   └── workqueue.ts   # Work distribution
│   └── README.md
│
├── weft/                  # Weft + Shuttle monorepo
│   ├── shared/            # @loominal/shared — Shared types
│   ├── weft/              # @loominal/weft — Coordinator service
│   ├── shuttle/           # @loominal/shuttle — CLI tool
│   └── agent-wrappers/    # Claude/Copilot integrations
│
├── loominal/              # Public landing page / docs
├── k8s-deploy/            # Kubernetes deployment manifests
├── test-scenarios/        # Integration test scenarios
├── PLAN.md                # Implementation plan and progress
└── CHANGELOG.md           # Release history
```

## Status

**Beta Release** - All core features implemented and tested.

### Tested Capabilities

| Feature | Status | Test Coverage |
|---------|--------|---------------|
| Channel Messaging | Tested | p95 latency: 2ms |
| Agent Discovery | Tested | Multi-machine verified |
| Direct Messaging | Tested | p95 latency: 2ms |
| Work Distribution | Tested | p95 latency: 77ms |
| Dynamic Spin-Up | Tested | SSH, Local, Webhook, K8s, GitHub Actions |
| Dead Letter Queue | Tested | Retry and discard operations |
| Failure Recovery | Tested | Agent crash handling, orphan work detection |

See [CHANGELOG.md](./CHANGELOG.md) for release history.

## Roadmap

- [x] **Warp Phase 1**: Channel-based messaging
- [x] **Warp Phase 2**: Cross-computer agent discovery
- [x] **Warp Phase 3**: Work distribution and reliability
- [x] **Weft**: Intelligent routing and dynamic scaling
- [x] **Shuttle**: CLI for fleet management
- [x] **Beta Integration Testing**: Multi-machine, performance, failure scenarios
- [ ] **Observability**: Prometheus metrics, Grafana dashboards
- [ ] **Multi-tenant**: SaaS deployment option

See [PLAN.md](./PLAN.md) for detailed progress.

## Contributing

Contributions welcome! This project is in active development.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests (`pnpm test`)
5. Submit a pull request

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

<p align="center">
  <b>Loominal</b> — Weaving AI agents together.
</p>
