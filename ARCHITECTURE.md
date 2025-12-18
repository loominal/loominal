# Loominal System Architecture

**Last Updated:** 2025-12-18

## Executive Summary

Loominal is a distributed infrastructure for multi-agent AI systems, enabling isolated AI assistants (Claude Code, GitHub Copilot, custom agents) to communicate, coordinate, and distribute work across machines. Built on NATS JetStream and the Model Context Protocol (MCP), it provides a production-ready fabric for agent collaboration.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NATS JetStream Core                               │
│            Channels • KV Stores • Work Queues • Streams • Inboxes           │
└──────────────────┬──────────────────┬──────────────────┬───────────────────┘
                   │                  │                  │
        ┌──────────▼──────────┐ ┌─────▼─────┐  ┌────────▼────────┐
        │  Warp (MCP Server)  │ │   Weft    │  │ Pattern (MCP)   │
        │  Agent Messaging    │ │ Coordinator│  │  Agent Memory   │
        └──────────┬──────────┘ └─────┬─────┘  └────────┬────────┘
                   │                  │                  │
        ┌──────────▼──────────────────▼──────────────────▼────────┐
        │                   AI Agent Layer                         │
        │  Claude Code • GitHub Copilot • Custom Agents • Shuttle  │
        └──────────────────────────────────────────────────────────┘
```

### The Weaving Metaphor

| Component | Metaphor | Role | Type |
|-----------|----------|------|------|
| **Warp** | Vertical foundation threads | Messaging backbone via NATS | MCP Server |
| **Weft** | Horizontal threads woven through | Work routing & agent lifecycle | Service |
| **Shuttle** | Carries thread back and forth | Task orchestration & fleet management | MCP Server |
| **Pattern** | The weaving pattern/design | Agent memory & context persistence | MCP Server |

---

## Component Architecture

### 1. Warp — The Messaging Backbone

**Type:** MCP Server
**Package:** `@loominal/warp`
**Location:** `warp/`
**Purpose:** Standards-compliant MCP server providing 17 communication tools to AI agents

#### Core Modules

```
warp/src/
├── tools/                    # MCP tool implementations (17 tools)
│   ├── identity.ts           # set_handle, get_my_handle
│   ├── channels.ts           # list_channels, send_message, read_messages
│   ├── registry-*.ts         # 5 registry tools
│   ├── messaging-*.ts        # 2 direct messaging tools
│   ├── work-*.ts             # broadcast_work_offer, claim_work
│   └── dlq.ts                # 3 dead letter queue tools
├── registry.ts               # Agent discovery via NATS KV
├── inbox.ts                  # Direct agent-to-agent messaging
├── workqueue.ts              # Capability-based work distribution
├── streams.ts                # JetStream setup and management
├── nats.ts                   # Connection and auth handling
└── config.ts                 # Configuration and project isolation
```

#### Key Features

- **Agent Registry**: Discover agents by type, capability, scope, status
- **Channel Messaging**: Broadcast to configurable channels (default: `roadmap`, `parallel-work`, `errors`)
- **Direct Messaging**: Point-to-point communication via personal inboxes
- **Work Queues**: Capability-based work distribution with competing consumers
- **Dead Letter Queue**: Capture and retry failed work items
- **Unified Scope Model**: 4-level visibility (private, personal, team, public)
- **Project Isolation**: Projects namespaced by directory hash
- **Deterministic Identity**: `sha256(hostname + projectPath)` for stable agent IDs

#### NATS Subject Patterns

```
loom.<projectId>.channels.<channel>           # Channel messages
loom.<projectId>.registry.<agentGuid>         # Agent registry (KV)
loom.<projectId>.inbox.<agentGuid>            # Direct messages (streams)
loom.<projectId>.work.<capability>            # Work queues (streams)
loom.<projectId>.dlq.<capability>             # Dead letter queue (streams)
loom-identity-<projectId>                     # Identity KV bucket
```

#### Performance Characteristics

- **Channel messaging**: p95 latency 2ms
- **Direct messaging**: p95 latency 2ms
- **Work distribution**: p95 latency 77ms
- **Agent discovery**: <10ms (KV lookup)

---

### 2. Weft — The Coordinator Service

**Type:** Long-running Service
**Package:** `@loominal/weft`
**Location:** `weft/weft/`
**Purpose:** Intelligent work routing, agent lifecycle management, dynamic scaling

#### Core Architecture

```
weft/weft/src/
├── service.ts                # Main entry point, multi-tenant orchestration
├── coordinator/              # Work routing & assignment tracking
│   ├── coordinator.ts        # Core coordination logic
│   └── assignments.ts        # Track work-to-agent assignments
├── routing/                  # Work classification
│   ├── engine.ts             # Classification logic (corporate, personal, etc.)
│   └── types.ts              # Boundary definitions
├── targets/                  # Spin-up target registry
│   ├── registry.ts           # Manage fleet of agent hosts
│   └── types.ts              # Target definitions
├── spin-up/                  # Dynamic agent provisioning
│   ├── manager.ts            # Orchestrates spin-up operations
│   └── mechanisms/           # 5 spin-up mechanisms
│       ├── ssh.ts            # Remote server via SSH
│       ├── kubernetes.ts     # K8s Job creation
│       ├── local.ts          # Local process spawning
│       ├── github-actions.ts # Workflow dispatch
│       └── webhook.ts        # Custom endpoint calls
├── idle/                     # Idle detection & scale-down
│   └── tracker.ts            # Agent activity monitoring
├── projects/                 # Multi-tenant project isolation
│   └── manager.ts            # Per-project context management
└── api/                      # REST API (Express)
    ├── server.ts             # Server setup
    └── routes/               # Endpoint handlers
```

#### Key Features

- **Multi-Tenant**: Single instance handles all projects via wildcard subscriptions
- **Work Classification**: Route based on corporate/personal/open-source policies
- **Capability Matching**: Match work to agents by required capabilities
- **Dynamic Spin-Up**: Auto-provision agents when work arrives
- **Idle Detection**: Automatic scale-down after configurable timeout
- **Load Balancing**: Distribute work across available workers
- **REST API**: Integration with external tools and dashboards

#### NATS Subject Patterns

```
coord.<projectId>.stats                       # Project statistics
coord.<projectId>.agents.*                    # Agent operations
coord.<projectId>.work.*                      # Work submission/tracking
coord.<projectId>.targets.*                   # Target management
coord.global.stats                            # Cross-project statistics
coord.global.projects                         # List active projects
```

#### Work Classification

| Classification | Description | Routing Strategy |
|----------------|-------------|------------------|
| `corporate` | Sensitive corporate data | Copilot CLI only |
| `corporate-adjacent` | Work-related, non-sensitive | Copilot preferred |
| `personal` | Personal projects | Claude Code preferred |
| `open-source` | Public repositories | Any agent |

#### Performance Characteristics

- **Work routing**: <50ms (classification + agent match)
- **Spin-up latency**: 1-30s depending on mechanism
- **Idle detection**: Configurable (default 5min)
- **Multi-tenant overhead**: <5ms per project

---

### 3. Shuttle — The Task Orchestrator

**Type:** MCP Server
**Package:** `@loominal/shuttle`
**Location:** `shuttle/`
**Purpose:** Decompose complex tasks, orchestrate parallel subagent execution, synthesize results

#### Core Architecture

```
shuttle/src/
├── tools/                    # 7 MCP tools
│   ├── assess.ts             # Task decomposition & parallelization analysis
│   ├── spawn.ts              # Spawn subagent fleet with Warp coordination
│   ├── checkpoint.ts         # Track progress, update phase
│   ├── list-orchestrations.ts # View active orchestrations
│   ├── get-results.ts        # Retrieve subagent outputs
│   ├── synthesize.ts         # Merge subagent results into cohesive output
│   └── state.ts              # NATS state management (optional)
├── storage.ts                # Filesystem storage (primary)
└── types.ts                  # Type definitions
```

#### Orchestration Flow

```
1. ASSESS
   ├─ Analyze task complexity
   ├─ Identify parallelizable subtasks
   ├─ Determine subagent types & capabilities
   └─ Create orchestration plan

2. SPAWN
   ├─ Generate work directory structure
   ├─ Create subagent contexts with isolated workspaces
   ├─ Store orchestration state (filesystem + NATS)
   └─ Broadcast work offers via Warp

3. EXECUTION (Subagents)
   ├─ Claim work from Warp queues
   ├─ Execute in isolated directories
   ├─ Write results to assigned output paths
   └─ Update status via checkpoints

4. CHECKPOINT
   ├─ Monitor subagent progress
   ├─ Track phase transitions
   ├─ Store metadata in NATS (optional)
   └─ Handle failures & retries

5. COLLECTION
   ├─ Read subagent results from filesystem
   ├─ Validate output completeness
   └─ Prepare for synthesis

6. SYNTHESIZE
   ├─ Merge subagent outputs
   ├─ Resolve conflicts
   ├─ Generate final cohesive result
   └─ Mark orchestration complete
```

#### State Management Strategy

**Dual Storage:**
- **Filesystem** (Primary): Always works, reliable, no dependencies
- **NATS KV** (Optional): Distributed coordination, cross-machine visibility

**Graceful Degradation:**
- NATS failures → log warning, continue with filesystem-only
- Enables local-first operation with optional distribution

#### NATS Integration

```
# KV Buckets (via state.ts)
shuttle_{projectId}_orchestrations     # Orchestration contexts (24h TTL)
shuttle_{projectId}_checkpoints        # Checkpoint metadata (7d TTL)

# Work Distribution (via Warp)
loom.<projectId>.work.<capability>     # Subagent work offers
```

#### Phase Tracking

```
assessment → spawning → execution → collection → synthesis → complete
     ↓           ↓           ↓            ↓           ↓          ↓
  Plan task  Create dirs  Agents work  Read results Merge    Done
```

---

### 4. Pattern — The Memory System

**Type:** MCP Server
**Package:** `@loominal/pattern`
**Location:** `pattern/`
**Purpose:** Hierarchical agent memory with TTL management and scope-based isolation

#### Core Architecture

```
pattern/src/
├── tools/                    # 10 MCP tools
│   ├── remember.ts           # Store memory with scope & category
│   ├── remember-task.ts      # Shorthand for tasks (24h TTL)
│   ├── remember-learning.ts  # Shorthand for insights (24h TTL)
│   ├── commit-insight.ts     # Promote temporary → permanent
│   ├── core-memory.ts        # Identity-defining memories (personal scope)
│   ├── forget.ts             # Delete memories
│   ├── recall-context.ts     # Retrieve prioritized memories
│   ├── share-learning.ts     # Share private → team scope
│   └── cleanup.ts            # Expire TTL, enforce limits
├── storage/                  # NATS KV storage
│   └── nats-kv.ts            # KV bucket operations
└── types.ts                  # Memory schemas
```

#### Memory Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│  Scope: PRIVATE (agent-specific, this project)              │
│  ├─ recent (24h TTL)     - Temporary observations           │
│  ├─ tasks (24h TTL)      - Current work items               │
│  └─ longterm (no TTL)    - Permanent project knowledge      │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  Scope: PERSONAL (follows agent across projects)            │
│  └─ core (no TTL)        - Identity, preferences (max 100)  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  Scope: TEAM (all agents in project)                        │
│  ├─ decisions (no TTL)   - Project decisions                │
│  ├─ architecture (no TTL) - Design decisions                │
│  └─ learnings (no TTL)   - Shared insights                  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  Scope: PUBLIC (all agents everywhere)                      │
│  └─ Global knowledge, templates, public patterns            │
└─────────────────────────────────────────────────────────────┘
```

#### NATS Integration

```
# KV Buckets
pattern_{projectId}_{scope}_{category}    # Memory storage
pattern_{projectId}_index                 # Memory index/metadata
```

#### Unified Scope Model

Pattern defines the 4-level scope model used throughout Loominal:

```typescript
type Scope = 'private' | 'personal' | 'team' | 'public';
```

All components (Warp registry, Warp work queues, Pattern memories, Shuttle orchestrations) follow this model for consistent visibility semantics.

---

### 5. Shared — Common Infrastructure

**Type:** NPM Package (workspace)
**Package:** `@loominal/shared`
**Location:** `weft/shared/`
**Purpose:** Shared types, NATS utilities, common interfaces

#### Contents

```
weft/shared/src/
├── types/                    # Shared type definitions
│   ├── scope.ts              # Unified scope model
│   ├── agent.ts              # Agent metadata
│   ├── work.ts               # Work item types
│   └── targets.ts            # Spin-up target types
└── nats/                     # NATS utilities
    └── client.ts             # Connection helpers
```

#### Key Exports

- **Scope type**: `'private' | 'personal' | 'team' | 'public'`
- **Agent types**: AgentInfo, AgentStatus, Capability
- **Work types**: WorkItem, WorkClassification, WorkBoundary
- **Target types**: SpinUpMechanism, TargetConfig

---

## Data Flow Patterns

### Pattern 1: Agent Registration & Discovery

```
┌─────────────┐
│ AI Agent    │
└──────┬──────┘
       │ 1. set_handle("developer-1")
       │ 2. register_agent({ type: "developer", capabilities: ["typescript"] })
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Warp (MCP Server)                                            │
│  ├─ Generate agent GUID: sha256(hostname + projectPath)     │
│  ├─ Store in KV: loom.<projectId>.registry.<agentGuid>      │
│  └─ Start heartbeat (30s interval)                          │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ NATS JetStream                                               │
│  KV Bucket: loom.<projectId>.registry                        │
│  Entry: { guid, type, capabilities, status, lastSeen }      │
└──────────────────────────────────────────────────────────────┘
       │
       │ 3. discover_agents({ capability: "python" })
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Warp                                                         │
│  ├─ Query KV bucket                                          │
│  ├─ Filter by criteria                                       │
│  └─ Return matching agents                                   │
└──────────────────────────────────────────────────────────────┘
```

### Pattern 2: Work Distribution Flow

```
┌─────────────┐
│ Client      │
└──────┬──────┘
       │ POST /api/work
       │ { task, boundary: "personal", capability: "typescript" }
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Weft Coordinator                                             │
│  1. Classify work (routing engine)                           │
│  2. Check for available agents (capability match)            │
│  3. Agent available?                                         │
│     ├─ YES: Assign work directly                             │
│     └─ NO: Check spin-up targets                             │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ 4. broadcast_work_offer (via Warp)
       ▼
┌──────────────────────────────────────────────────────────────┐
│ NATS JetStream                                               │
│  Stream: loom.<projectId>.work.typescript                    │
│  Message: { taskId, description, capability, deadline }      │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ 5. claim_work (competing consumers)
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Agent with "typescript" capability                           │
│  ├─ Pulls work from queue                                    │
│  ├─ Executes task                                            │
│  └─ Sends result via direct message or update presence       │
└──────────────────────────────────────────────────────────────┘
       │
       │ 6. Work failure? (max 3 retries)
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Dead Letter Queue (DLQ)                                      │
│  Stream: loom.<projectId>.dlq.typescript                     │
│  ├─ Store failed work                                        │
│  ├─ Manual review via list_dead_letter_items                 │
│  └─ Retry or discard                                         │
└──────────────────────────────────────────────────────────────┘
```

### Pattern 3: Shuttle Orchestration Flow

```
┌─────────────┐
│ Parent      │
│ Agent       │
└──────┬──────┘
       │ 1. assess_task("Implement authentication system")
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Shuttle: ASSESS PHASE                                        │
│  ├─ Analyze task complexity                                  │
│  ├─ Identify subtasks: [db-schema, api-endpoints, ui, tests] │
│  ├─ Determine parallelization: [db+api] → [ui+tests]         │
│  └─ Return orchestration plan                                │
└──────┬───────────────────────────────────────────────────────┘
       │ 2. spawn_subagents(orchestrationId, plan)
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Shuttle: SPAWN PHASE                                         │
│  ├─ Create work directory structure                          │
│  ├─ Generate subagent contexts                               │
│  │   ├─ subagent-1: db-schema (capability: database)         │
│  │   ├─ subagent-2: api-endpoints (capability: typescript)   │
│  │   ├─ subagent-3: ui (capability: react)                   │
│  │   └─ subagent-4: tests (capability: testing)              │
│  ├─ Store orchestration state (filesystem + NATS KV)         │
│  └─ Broadcast work via Warp                                  │
└──────┬───────────────────────────────────────────────────────┘
       │ 3. Subagents claim work
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Subagent Execution (via Warp work queues)                    │
│  ├─ Agent 1: claim_work("database")                          │
│  ├─ Agent 2: claim_work("typescript")                        │
│  ├─ Agent 3: claim_work("react")                             │
│  └─ Agent 4: claim_work("testing")                           │
└──────┬───────────────────────────────────────────────────────┘
       │ 4. Each subagent writes results to assigned path
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Filesystem (Primary Storage)                                 │
│  /tmp/shuttle_work/<orchestrationId>/                        │
│    ├─ subagent-1/result.md                                   │
│    ├─ subagent-2/result.md                                   │
│    ├─ subagent-3/result.md                                   │
│    └─ subagent-4/result.md                                   │
└──────┬───────────────────────────────────────────────────────┘
       │ 5. checkpoint_progress(orchestrationId, "collection")
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Shuttle: COLLECTION PHASE                                    │
│  ├─ Read all subagent results                                │
│  ├─ Validate completeness                                    │
│  └─ Update phase in NATS KV                                  │
└──────┬───────────────────────────────────────────────────────┘
       │ 6. synthesize_results(orchestrationId)
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Shuttle: SYNTHESIS PHASE                                     │
│  ├─ Merge subagent outputs                                   │
│  ├─ Resolve conflicts                                        │
│  ├─ Generate cohesive final result                           │
│  └─ Mark orchestration complete                              │
└──────────────────────────────────────────────────────────────┘
```

### Pattern 4: Memory & Context Management

```
┌─────────────┐
│ AI Agent    │ Session 1
└──────┬──────┘
       │ 1. remember_task("Implement auth API")
       │    remember_learning("Use JWT for tokens")
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Pattern: STORE                                               │
│  KV: pattern_{projectId}_private_tasks                       │
│      ├─ Entry 1: { content: "Implement auth...", ttl: 24h } │
│  KV: pattern_{projectId}_private_recent                      │
│      └─ Entry 2: { content: "Use JWT...", ttl: 24h }        │
└──────────────────────────────────────────────────────────────┘
       │
       │ Task proves valuable...
       │ 2. commit_insight(memoryId)
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Pattern: PROMOTE                                             │
│  ├─ Move from "recent" → "longterm"                          │
│  └─ Remove TTL (permanent)                                   │
└──────────────────────────────────────────────────────────────┘
       │
       │ Share with team...
       │ 3. share_learning(memoryId, category: "architecture")
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Pattern: SHARE                                               │
│  ├─ Copy to KV: pattern_{projectId}_team_architecture        │
│  └─ Now visible to all agents in project                     │
└──────────────────────────────────────────────────────────────┘

       [Time passes... Session 2 begins]

┌─────────────┐
│ AI Agent    │ Session 2 (same agent, same project)
└──────┬──────┘
       │ 4. recall_context()
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Pattern: RECALL                                              │
│  ├─ Query all categories: core, longterm, decisions, etc.   │
│  ├─ Prioritize by category & timestamp                       │
│  ├─ Generate 4KB summary                                     │
│  └─ Return to agent for context restoration                  │
└──────────────────────────────────────────────────────────────┘
```

---

## Integration Points

### MCP Integration (Warp, Shuttle, Pattern)

**Installation:**
```json
{
  "mcpServers": {
    "loominal-warp": {
      "command": "warp",
      "env": { "NATS_URL": "nats://localhost:4222" }
    },
    "loominal-pattern": {
      "command": "pattern",
      "env": { "NATS_URL": "nats://localhost:4222" }
    },
    "loominal-shuttle": {
      "command": "shuttle",
      "env": { "NATS_URL": "nats://localhost:4222" }
    }
  }
}
```

**Tool Discovery:** MCP clients automatically discover all tools from each server

**Invocation:** Standard MCP tool_use protocol

### REST API Integration (Weft)

**Base URL:** `http://localhost:3000/api`

**Key Endpoints:**
```
GET  /health                    # Health check
GET  /agents                    # List registered agents
POST /work                      # Submit work
GET  /work/:id                  # Get work status
GET  /targets                   # List spin-up targets
POST /targets/:id/spin-up       # Trigger agent spin-up
GET  /stats                     # Coordinator statistics
GET  /stats/projects            # List active projects
```

**Authentication:** Bearer token via `Authorization: Bearer <token>`

### NATS Integration

**Connection:**
- URL: `nats://localhost:4222` (default)
- Authentication: Embed in URL (`nats://user:pass@host:4222`) or env vars
- WebSocket: Supported via `wss://` URLs

**JetStream Required:** All components require NATS with JetStream enabled

---

## Configuration Management

### Environment Variables

**Warp:**
```bash
NATS_URL=nats://localhost:4222        # NATS connection
MCP_PROJECT_PATH=/path/to/project     # Override project path
LOG_LEVEL=INFO                        # DEBUG, INFO, WARN, ERROR
```

**Weft:**
```bash
NATS_URL=nats://localhost:4222        # NATS connection
LOOMINAL_PROJECT_ID=my-project        # Project identifier
API_PORT=3000                         # REST API port
API_HOST=0.0.0.0                      # Bind address
API_TOKENS=token1,token2              # Bearer tokens
IDLE_TIMEOUT_MS=300000                # 5 minutes
LOG_LEVEL=info                        # Logging level
```

**Shuttle:**
```bash
NATS_URL=nats://localhost:4222        # NATS connection
SHUTTLE_WORK_DIR=/tmp/shuttle_work    # Work directory
LOG_LEVEL=INFO                        # Logging level
```

**Pattern:**
```bash
NATS_URL=nats://localhost:4222        # NATS connection
LOG_LEVEL=INFO                        # Logging level
```

### Project Configuration

**File:** `.loominal-config.json` (in project root)

```json
{
  "namespace": "my-project",
  "channels": [
    { "name": "planning", "description": "Sprint planning" },
    { "name": "review", "description": "Code reviews" }
  ],
  "boundaries": {
    "corporate": {
      "patterns": ["**/internal/**", "**/proprietary/**"]
    }
  }
}
```

---

## Security Model

### Authentication

**NATS Level:**
- Credentials in URL: `nats://user:pass@host:4222`
- Token-based: `NATS_TOKEN` environment variable
- TLS: `nats://` → `tls://` or `wss://`

**API Level (Weft):**
- Bearer tokens via `API_TOKENS` environment variable
- No built-in user management (external auth proxy recommended for production)

### Authorization

**Scope-Based Access Control:**
- `private`: Only creating agent can access
- `personal`: Only creating agent across all projects
- `team`: All agents in project can access
- `public`: All agents everywhere can access

**Project Isolation:**
- Projects isolated by directory hash
- Cross-project communication requires explicit `public` scope

### Data Security

**In Transit:**
- NATS supports TLS (`nats://` → `tls://`)
- API supports HTTPS (reverse proxy recommended)

**At Rest:**
- NATS KV: No built-in encryption (use encrypted storage backend)
- Filesystem (Shuttle): Standard filesystem permissions

**Secrets Management:**
- Do NOT store secrets in NATS KV, channels, or work queues
- Use environment variables or dedicated secret management (Vault, etc.)

---

## Performance Characteristics

### Latency

| Operation | p50 | p95 | p99 |
|-----------|-----|-----|-----|
| Channel message | 1ms | 2ms | 5ms |
| Direct message | 1ms | 2ms | 5ms |
| Work broadcast | 50ms | 77ms | 100ms |
| Agent discovery | 5ms | 10ms | 15ms |
| KV read | 1ms | 3ms | 5ms |
| KV write | 2ms | 5ms | 10ms |
| Weft routing | 20ms | 50ms | 100ms |

### Throughput

| Component | Operations/sec | Notes |
|-----------|----------------|-------|
| Warp channels | 10,000+ | Broadcast messaging |
| Warp direct msgs | 5,000+ | Point-to-point |
| Warp work queue | 1,000+ | Capability matching |
| Weft coordination | 500+ | Classification + routing |
| Pattern memory | 2,000+ | KV operations |

### Scalability

**Horizontal:**
- **Warp**: Stateless MCP server, scale per agent
- **Weft**: Single instance per deployment (multi-tenant)
- **NATS**: Cluster up to 100s of nodes

**Vertical:**
- **Warp**: Low memory (<50MB per instance)
- **Weft**: ~200MB base + 10MB per active project
- **NATS**: 1-4GB recommended for production

**Limits:**
- Agents per project: 1,000+ (tested)
- Concurrent orchestrations (Shuttle): 100+ (tested)
- Projects per Weft: 100+ (designed for)

---

## Failure Modes & Recovery

### NATS Server Failure

**Impact:**
- All communication lost
- Agents become isolated
- Work distribution halts

**Recovery:**
- NATS restart: Agents auto-reconnect (exponential backoff)
- JetStream state: Persistent (survives restart)
- Inflight messages: May be lost (use acknowledgment)

**Mitigation:**
- Run NATS cluster (3+ nodes)
- Monitor NATS health
- Configure reconnect settings

### Weft Coordinator Failure

**Impact:**
- Work routing stops
- No new agent spin-ups
- Existing agents continue working

**Recovery:**
- Weft restart: Reconnects to NATS, rebuilds state from streams
- Work assignments: Tracked in NATS, resume on restart
- No data loss

**Mitigation:**
- Run multiple Weft instances (active-passive)
- Monitor Weft health endpoint

### Agent Failure

**Impact:**
- Work assigned to agent is lost
- Other agents unaffected

**Recovery:**
- Heartbeat failure → work reassigned (Weft)
- Work redelivery after max delivery count → DLQ

**Mitigation:**
- Set appropriate heartbeat intervals
- Monitor DLQ for failed work
- Retry failed work manually or automatically

### Network Partition

**Impact:**
- Split-brain: Agents on each side can't communicate
- NATS cluster may lose quorum

**Recovery:**
- NATS cluster: Requires quorum (majority) to operate
- Partition heals: Streams reconcile automatically

**Mitigation:**
- Deploy NATS across availability zones
- Use odd number of NATS servers (3, 5)

### Filesystem Full (Shuttle)

**Impact:**
- Cannot write subagent results
- Orchestrations fail

**Recovery:**
- Clean up old orchestrations
- Increase disk space

**Mitigation:**
- Monitor disk usage
- Set TTLs on work directories
- Implement cleanup job

---

## Observability

### Logging

**Structured Logging:**
- JSON format with `component`, `level`, `message`, `timestamp`
- Levels: DEBUG, INFO, WARN, ERROR

**Log Locations:**
- **Warp**: stderr (captured by MCP client)
- **Weft**: stdout (Docker logs or systemd journal)
- **Shuttle**: stderr (captured by MCP client)
- **Pattern**: stderr (captured by MCP client)

### Metrics (Planned)

**Key Metrics:**
- Agent count (active, idle, offline)
- Work queue depth
- Work processing latency
- DLQ item count
- Heartbeat failures
- NATS connection state

**Planned Integration:**
- Prometheus exporter for Weft
- Grafana dashboards

### Tracing (Planned)

**Trace Context:**
- Propagate trace IDs through work items
- Correlate subagent work to parent orchestration

**Planned Integration:**
- OpenTelemetry support

---

## Deployment Architectures

### Development (Single Machine)

```
┌─────────────────────────────────────────────────────────────┐
│ Developer Laptop                                            │
│  ├─ NATS (Docker)                                           │
│  ├─ Weft (Docker Compose)                                   │
│  ├─ Warp (MCP, installed globally)                          │
│  ├─ Pattern (MCP, installed globally)                       │
│  ├─ Shuttle (MCP, installed globally)                       │
│  └─ Claude Code (MCP client)                                │
└─────────────────────────────────────────────────────────────┘
```

### Multi-Machine (Home + Cloud)

```
┌─────────────────────┐         ┌─────────────────────┐
│ Laptop              │         │ Cloud VM            │
│  ├─ Claude Code     │         │  ├─ Claude Code     │
│  └─ Warp (MCP)      │         │  └─ Warp (MCP)      │
└──────────┬──────────┘         └──────────┬──────────┘
           │                               │
           └───────────┬───────────────────┘
                       │
           ┌───────────▼──────────┐
           │ NATS (Cloud/Home)    │
           │  ├─ JetStream        │
           │  └─ TLS enabled      │
           └───────────┬──────────┘
                       │
           ┌───────────▼──────────┐
           │ Weft (Cloud/Home)    │
           │  ├─ REST API         │
           │  └─ Multi-tenant     │
           └──────────────────────┘
```

### Corporate + Personal Separation

```
┌─────────────────────┐         ┌─────────────────────┐
│ Work Laptop         │         │ Home Server         │
│  ├─ GitHub Copilot  │         │  ├─ Claude Code     │
│  └─ Warp (MCP)      │         │  └─ Warp (MCP)      │
└──────────┬──────────┘         └──────────┬──────────┘
           │                               │
           └───────────┬───────────────────┘
                       │
           ┌───────────▼──────────┐
           │ NATS (Shared)        │
           └───────────┬──────────┘
                       │
           ┌───────────▼──────────┐
           │ Weft Coordinator     │
           │  Routing Engine:     │
           │  ├─ corporate → Work │
           │  └─ personal → Home  │
           └──────────────────────┘
```

### Kubernetes Deployment

```
┌─────────────────────────────────────────────────────────────┐
│ Kubernetes Cluster                                          │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ NATS StatefulSet (3 replicas)                          │ │
│  │  ├─ Persistent volumes for JetStream                   │ │
│  │  └─ LoadBalancer service                               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Weft Deployment (2 replicas)                           │ │
│  │  ├─ REST API exposed via Ingress                       │ │
│  │  └─ Multi-tenant coordination                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Agent Jobs (dynamic)                                    │ │
│  │  └─ Weft spins up Jobs on-demand                       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Future Enhancements

### Short-Term (v0.3.x)

- [ ] Prometheus metrics for Weft
- [ ] Grafana dashboards
- [ ] Enhanced DLQ management UI
- [ ] Shuttle orchestration visualization

### Medium-Term (v0.4.x)

- [ ] OpenTelemetry tracing
- [ ] Multi-region NATS deployment
- [ ] Enhanced security (RBAC, audit logs)
- [ ] Performance optimizations

### Long-Term (v1.0+)

- [ ] SaaS multi-tenant deployment
- [ ] Web UI for fleet management
- [ ] Advanced scheduling (priority queues, SLAs)
- [ ] Machine learning for work routing

---

## References

### External Documentation

- **NATS JetStream**: https://docs.nats.io/nats-concepts/jetstream
- **Model Context Protocol**: https://modelcontextprotocol.io/
- **Claude Code**: https://claude.ai/code

### Internal Documentation

- `warp/README.md` - Warp component details
- `weft/README.md` - Weft component details
- `shuttle/README.md` - Shuttle component details
- `pattern/README.md` - Pattern component details
- `test-scenarios/README.md` - Integration test documentation
- `CHANGELOG.md` - Release history

---

**Document Version:** 1.0
**Author:** Michael LoPresti
**Last Review:** 2025-12-18
