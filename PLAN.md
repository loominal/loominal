# Loom Project Plan

**Last Updated**: 2025-12-11
**Status**: Phase 11 COMPLETE - Loom Pattern v0.1.0-beta released!

---

## Definitions and Acronyms

| Term | Definition |
|------|------------|
| **Warp** | MCP server providing 17 tools for agent communication via NATS JetStream |
| **Weft** | Coordinator service for work routing, dynamic agent lifecycle, and idle detection |
| **Shuttle** | CLI tool for fleet management and work submission |
| **MCP** | Model Context Protocol - standard for AI tool integration |
| **NATS** | Neural Autonomic Transport System - high-performance messaging system |
| **JetStream** | NATS persistence layer providing streams, consumers, and KV stores |
| **Boundary** | Work category (corporate/personal/open-source) for policy-based routing |

---

## Current State Summary

| Component | Status | Version | Maturity |
|-----------|--------|---------|----------|
| **Warp** (MCP Server) | Released | v0.1.1 | **Beta** |
| **Weft** (Coordinator) | Released | v0.1.1 | **Beta** |
| **Shuttle** (CLI) | Released | v0.1.0 | **Beta** |

---

## Phase Summary

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1-4 | ✅ Complete | Stabilization, test coverage, polish |
| Phase 4.5 | ✅ Complete | Git history cleanup |
| Phase 5 | ✅ Complete | Warp Beta (v0.1.0) |
| Phase 6 | ✅ Complete | Weft Beta (v0.1.0) |
| Phase 7 | ✅ Complete | Shuttle Beta (v0.1.0) |
| Phase 8 | ✅ Complete | Multi-machine testing, performance baseline |
| Phase 9 | ⏸️ Partial | npm on hold until Dec 16; Docker images released |
| **Phase 9.5** | ✅ Complete | NATS Authentication + WebSocket + GitHub Actions |
| Phase 10 | ✅ Mostly Complete | Repository reorganization (npm pending Dec 16) |

**Historical Details**: See `docs/ARCHIVE-phases-4-7.md` for detailed test results from completed phases.

---

## Ongoing Requirement: Commit Hygiene Verification

At the end of EVERY phase, run this check and verify 0 matches:
```bash
git log --all --format='%H %an %ae %s %b' | grep -iE 'claude|anthropic|co-authored-by.*claude|ai.assistant'
```

This check is **BLOCKING** for phase completion.

---

## Phase 9: Release Prep (Priority: MEDIUM)

### 9.1 npm Publishing

**Status**: ON HOLD - npm account locked, expected resolution: 2025-12-16

- [ ] Verify @loom scope availability on npm
- [ ] Publish @loom/warp, @loom/weft, @loom/shared, @loom/shuttle
- [ ] Update READMEs with npm install commands

### 9.2 Docker Images ✅ COMPLETE

- [x] Push `loom-warp:0.1.0` and `loom-weft:0.1.0` to ghcr.io
- [x] Tag both images as `latest`

### 9.3 Release Tags ✅ COMPLETE

- [x] Create git tags `v0.1.0` in warp and weft repos
- [x] GitHub release automation workflow added
- [x] v0.1.1 released with release automation

### 9.4 Post-Release Verification

- [ ] Verify npm packages install correctly (after 9.1)
- [ ] Verify Docker images run correctly
- [ ] Verify getting started guide works end-to-end

---

## Phase 9.5: NATS Authentication & GitHub Actions Targets (Priority: HIGH)

**Goal**: Enable authenticated NATS connections across all components to support secure GitHub Actions agent spin-up.

**Background**: To enable GitHub Actions as spin-up targets, NATS must be:
1. Publicly accessible (from GitHub's infrastructure)
2. Protected with authentication (not open to the internet)
3. Encrypted (TLS) to protect credentials in transit
4. Accessible through Cloudflare proxy (to hide origin IP)

### Current Transport/Auth Support

| Component | Library | TCP | WebSocket | URL Auth | Env Vars | Status |
|-----------|---------|-----|-----------|----------|----------|--------|
| **Warp** | nats.js | ✅ | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Complete |
| **Weft** | nats.js | ✅ | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Complete |
| **Shuttle** | REST API | N/A | N/A | N/A | N/A | ✅ Uses Weft REST API |

**Key Decisions**:
- WebSocket transport enables Cloudflare proxy (keeps origin IP hidden)
- TCP transport retained for internal/local connections (better performance)
- Transport auto-detected from URL scheme: `wss://` → WebSocket, `nats://` → TCP

---

### 9.5.0 Add WebSocket Transport Support ✅ COMPLETE

**Status**: ✅ COMPLETE (2025-12-11)
**Rationale**: WebSocket allows NATS to work through Cloudflare's HTTPS proxy, keeping the origin IP hidden while providing DDoS protection.

#### Architecture

```
External (GitHub Actions):
  Agent → wss://nats.vilo.network (Cloudflare) → nginx-ingress → NATS :8080

Internal (Kubernetes):
  Weft → nats://nats.nats.svc.cluster.local:4222 (TCP direct)
```

#### 9.5.0.1 Update Warp for WebSocket Support ✅ COMPLETE

- [x] Add dependencies: `ws`, `nats.ws`
- [x] Create transport detection from URL scheme (`wss://` vs `nats://`)
- [x] Update `connectToNats()` to use dynamic import for WebSocket transport
- [x] Update `parseNatsUrl()` to handle `wss://` and `ws://` schemes
- [x] Add tests for WebSocket URL parsing
- [x] Update README with WebSocket documentation

#### 9.5.0.2 Update Weft for WebSocket Support ✅ COMPLETE

- [x] Add dependencies: `ws`, `nats.ws`
- [x] Update `createNATSClient()` with transport detection
- [x] Update `parseNatsUrl()` to handle WebSocket schemes
- [x] Add tests for WebSocket transport
- [x] Update README with WebSocket documentation

#### 9.5.0.3 Configure NATS WebSocket Listener ✅ COMPLETE

- [x] Add `websocket` block to NATS config (port 8080)
- [x] Create internal Service for WebSocket port
- [x] Create Ingress for `nats.vilo.network` → WebSocket service
- [x] Verify Cloudflare proxy works (orange cloud)

#### 9.5.0.4 Verification ✅ COMPLETE

- [x] Test TCP connection internally: `nats://nats.nats.svc.cluster.local:4222`
- [x] Test WebSocket connection externally: `wss://nats.vilo.network`
- [x] Verify Cloudflare proxy hides origin IP (external DNS resolves to Cloudflare IPs)
- [x] All existing tests pass

---

### 9.5.1 Update Warp for Authentication ✅ COMPLETE

**Priority**: P0 (Blocking for GitHub Actions targets)
**Status**: ✅ COMPLETE (2025-12-11)

**Solution**: Option A (parse URL) with fallback to Option B

#### Implementation Tasks

- [x] **9.5.1.1**: Add URL parsing utility to extract credentials from NATS URL
  - Added `parseNatsUrl()` function in `warp/src/nats.ts`
  - Handles `nats://user:pass@host:port` format
  - URL-decodes credentials for special characters

- [x] **9.5.1.2**: Update `connectToNats()` to use parsed credentials
  - Parses URL and extracts credentials if present
  - Passes `user`/`pass` to NATS `connect()` options
  - Logs `authenticated: true/false` for debugging

- [x] **9.5.1.3**: Add fallback to `NATS_USER`/`NATS_PASS` environment variables
  - URL credentials take precedence
  - Env vars used as fallback if not in URL

- [x] **9.5.1.4**: Update `warp/README.md` with authentication documentation
  - Documented all three authentication options
  - Added URL-encoding guidance for special characters
  - Added troubleshooting for AUTHORIZATION_VIOLATION

- [x] **9.5.1.5**: Add unit tests for URL parsing
  - 13 tests in `warp/src/nats-auth.test.ts`
  - Tests: simple URLs, credentials, URL-encoded chars, edge cases
  - All 502 Warp tests passing

### 9.5.2 Deploy Authenticated NATS ✅ COMPLETE

**Priority**: P0 (Blocking for GitHub Actions targets)
**Status**: ✅ COMPLETE (2025-12-11)

- [x] Created NATS deployment with auth in `k8s-deploy/nats/`
- [x] Generated production passwords for 3 users: `agent`, `admin`, `github-agent`
- [x] Deployed via ArgoCD to `nats` namespace
- [x] TLS enabled via cert-manager (`nats-tls` certificate)
- [x] Verified authentication works (unauthenticated connections rejected)

**Infrastructure**:
- Internal TCP: `nats://nats.nats.svc.cluster.local:4222`
- LoadBalancer: `192.168.7.18:4222`
- TLS Certificate: `nats.vilo.network` (Let's Encrypt)

### 9.5.3 Update Weft for Authenticated NATS ✅ COMPLETE

**Priority**: P0 (Blocking for GitHub Actions targets)
**Status**: ✅ COMPLETE (2025-12-11)

- [x] Updated Weft configmap with authenticated NATS URL
- [x] Weft connects with `authenticated: true`
- [x] Agents can register through Weft

### 9.5.4 Expose NATS Publicly ✅ COMPLETE

**Priority**: P1 (Required for GitHub Actions)
**Status**: ✅ COMPLETE (2025-12-11)

**Decision**: Use WebSocket over Cloudflare proxy (Option B modified)
- Cloudflare proxy only works for HTTP/HTTPS, not raw TCP
- WebSocket (WSS) works through Cloudflare proxy
- This keeps origin IP hidden while providing DDoS protection

- [x] Cloudflare DNS set to proxied (orange cloud) for `nats.vilo.network`
- [x] WebSocket endpoint responds (405 for non-WS requests, expected)
- [x] Origin IP hidden behind Cloudflare

### 9.5.5 Create GitHub Actions Workflow ✅ COMPLETE

**Priority**: P1 (Required for GitHub Actions targets)
**Status**: ✅ COMPLETE (2025-12-11)

- [x] **9.5.5.1**: Created workflow file `.github/workflows/agent.yml` in warp repo
  - `workflow_dispatch` trigger with configurable timeout
  - Validates NATS WebSocket connectivity through Cloudflare
  - Runs Warp Docker image to test MCP server connection

- [x] **9.5.5.2**: Updated README with secret instructions
  - `NATS_URL`: Full authenticated WebSocket URL (`wss://github-agent:pass@nats.vilo.network`)
  - Added GitHub Actions documentation section

- [x] **9.5.5.3**: Workflow uses Docker image `ghcr.io/mdlopresti/loom-warp:latest`
  - Tests connectivity by sending MCP initialize request
  - Full agent example documented in README

- [ ] **9.5.5.4**: Register GitHub Actions target in Weft (deferred - not required for Beta)

### 9.5.6 Cleanup Old NATS Deployment ✅ COMPLETE

**Priority**: P2 (After verification)
**Status**: ✅ COMPLETE (2025-12-11)

- [x] **9.5.6.1**: Verify new NATS fully operational
- [x] **9.5.6.2**: Delete old `nats-mcp` ArgoCD application
- [x] **9.5.6.3**: Delete old `nats-mcp` namespace

### 9.5.7 Phase Completion ✅ COMPLETE

- [x] All components connect to authenticated NATS
- [x] GitHub Actions workflow triggers successfully (run #20150598396)
- [x] Git hygiene check passes
- [x] Update RESUME.md with completion status

---

## Phase 10: Repository Reorganization (Priority: LOW - Post-Beta)

**Status**: ✅ MOSTLY COMPLETE (npm tasks pending Dec 16)

**Goal**: Split Shuttle into its own repository (`loom-shuttle`) for independent versioning.

**Detailed Plan**: See `/var/home/mike/source/loom-monorepo/PHASE-10-DETAILED-PLAN.md` for complete implementation roadmap.

**Dependencies**:
- Phase 9.1 complete (npm account unlocked on Dec 16)
- `@loom/shared` published to npm

**Strategy**: Publish `@loom/shared` as public npm package, migrate Shuttle to consume from npm instead of workspace.

---

### 10.1 Pre-Split Preparation

**Tasks**:
- [x] Remove unused `shuttle/src/nats/client.ts`
- [x] Audit all `@loom/shared` dependencies in Shuttle
- [x] Publish `@mdlopresti/loom-shared@0.1.0` to GitHub Packages (temporary until npm available)
- [ ] Publish `@loom/shared@0.1.0` to npm (after Dec 16)
- [x] Document Shuttle's shared dependencies (see `shuttle/SHARED_DEPENDENCIES.md`)
- [x] Draft CI/CD workflows for standalone repo (see `shuttle/.github-draft/workflows/`)

**Done When**: Cleanup complete, shared package available, dependencies documented

**Status**: ✅ COMPLETE - Using GitHub Packages until npm account unlocked (Dec 16)

---

### 10.2 Repository Creation ✅ COMPLETE

**Tasks**:
- [x] Extract Shuttle with git history using `git filter-repo`
- [x] Update Shuttle to use `@mdlopresti/loom-shared` from GitHub Packages
- [x] Update imports from `'@loom/shared'` to `'@mdlopresti/loom-shared'`
- [x] Setup CI/CD pipeline (build, test, release workflows)
- [x] Update documentation for standalone repo (CHANGELOG, tsconfig)

**Done When**: Standalone repo builds, tests pass, CI green

**Status**: ✅ COMPLETE - https://github.com/mdlopresti/loom-shuttle

---

### 10.3 Repository Publishing ✅ COMPLETE

**Tasks**:
- [x] Create GitHub repository `mdlopresti/loom-shuttle`
- [x] Push code and create `v0.2.0` tag
- [ ] Publish `@loom/shuttle@0.2.0` to npm (after Dec 16)
- [x] Create GitHub release with migration notes

**Done When**: Repository public, package on npm, installation works

**Status**: Partially complete - GitHub release available, npm publish pending (Dec 16)

---

### 10.4 Monorepo Cleanup ✅ COMPLETE

**Tasks**:
- [x] Remove `shuttle/` directory from `loom-weft` monorepo
- [x] Update monorepo documentation to link to new repo
- [ ] Deprecate old monorepo shuttle package (`@loom/shuttle@0.1.4`) - *pending npm access (Dec 16)*
- [x] Update cross-repository documentation (Weft README, CHANGELOG)

**Done When**: Monorepo cleaned, docs updated, old package deprecated

**Status**: ✅ COMPLETE - v0.1.5 released with shuttle removed

---

### 10.5 Testing & Verification ✅ COMPLETE

**Tasks**:
- [x] End-to-end testing with fresh install (CI passes on GitHub Actions)
- [x] Verify all commands work (52 tests pass in loom-shuttle)
- [x] Verify weft monorepo builds/tests (96 tests pass)
- [x] Review all documentation for accuracy (README links updated)
- [x] Git hygiene check passes (both repos clean)

**Done When**: All tests pass, documentation verified, quality gates met

**Status**: ✅ COMPLETE - Verification passed

---

### Phase 10 Completion Criteria

- [x] `loom-shuttle` repository created and published
- [ ] `@loom/shuttle@0.2.0` available on npm (blocked until Dec 16)
- [ ] `@loom/shared@0.1.0` available on npm (blocked until Dec 16)
- [x] CI/CD pipeline operational (GitHub Actions passing)
- [x] Documentation updated across all repos
- [x] Monorepo cleaned up
- [x] Migration guide published (CHANGELOG.md in loom-shuttle)
- [x] Git hygiene check passes

**Remaining**: npm publishing (after Dec 16 account unlock)
**Critical Path**: ~~Preparation → Creation → Publishing → Cleanup → Verification~~ DONE (except npm)

---

## Architecture Reference

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Agent 1   │     │   Agent 2   │     │   Agent N   │
│ (Claude)    │     │ (Copilot)   │     │ (Any MCP)   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────┬───────┴───────────────────┘
                   │
            ┌──────▼──────┐
            │    Warp     │  MCP Server (per agent)
            │  (MCP Tool) │  - Channels, Registry, Work Queues
            └──────┬──────┘
                   │
            ┌──────▼──────┐
            │    NATS     │  Message Broker (with auth)
            │  JetStream  │  - Persistence, Delivery
            └──────┬──────┘
                   │
            ┌──────▼──────┐
            │    Weft     │  Coordinator Service
            │ (Optional)  │  - Routing, Spin-up, Idle Tracking
            └─────────────┘
```

---

## Repository Map

| Repo | Path | Description |
|------|------|-------------|
| loom | `loom/` | Public README/landing page |
| loom-warp | `warp/` | MCP server for agent communication |
| loom-weft | `weft/` | Coordinator + Shuttle + Shared (monorepo) |
| loom-deploy | `k8s-deploy/` | Kubernetes deployment manifests (private) |
| test-scenarios | `test-scenarios/` | Multi-agent integration tests |

---

## Test Scenario Index

| # | Scenario | Component | Status |
|---|----------|-----------|--------|
| 01-04 | Basic Warp Tests | Warp | ✅ PASSED |
| 04.5 | Git History Audit | All | ✅ COMPLETE |
| 05-08 | Warp Integration (DM, DLQ, Registry, Config) | Warp | ✅ PASSED |
| 09-13 | Weft Integration (Basic, Routing, Targets, Spin-Up, Idle, Multi-Tenant) | Weft | ✅ PASSED |
| 14-16 | Cross-System (E2E, Failure Recovery) | All | ✅ PASSED |
| 17 | Shuttle CLI | Shuttle | ✅ PASSED |
| 18 | Multi-Machine | All | ✅ PASSED |

**Detailed test results**: See `docs/ARCHIVE-phases-4-7.md` and `test-scenarios/*/results.md`

---

## NFR Review Status

| Component | Documentation | Security | Code Quality |
|-----------|---------------|----------|--------------|
| Warp | ✅ 100% | ✅ 0 high/critical | ✅ PASS |
| Weft | ✅ 100% | ✅ 0 high/critical | ✅ PASS |
| Shuttle | ✅ 100% | ✅ 0 high/critical | ✅ PASS |

---

## Future Enhancements (V2+)

### Pluggable Storage Backends

**Idea**: Abstract storage layer across Warp, Weft, and Pattern to support multiple backends.

**Motivation**: Currently each component uses NATS directly. A pluggable backend would enable:
- Local development without NATS (file-based)
- Alternative datastores (Redis, SQLite, S3)
- Easier testing with in-memory backends

**Affected Components**:
- **Warp**: Channel history, message persistence
- **Weft**: Agent registry, work queue state
- **Pattern** (new): Memory storage (recent, longterm, core)

**Interface Sketch**:
```typescript
interface StorageBackend {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
  watch?(prefix: string): AsyncIterable<{key: string, value: any}>;
}

// Implementations
class NatsKvBackend implements StorageBackend { ... }
class FileBackend implements StorageBackend { ... }
class MemoryBackend implements StorageBackend { ... }
```

**Priority**: Low (V2) - Current NATS-based approach works well for production use cases.

---

## Phase 11 - Loom Pattern (Agent Memory)

**Goal**: Add hierarchical memory system for agents via MCP server.

**Repository**: `loom-pattern` - https://github.com/mdlopresti/loom-pattern

**Status**: ✅ COMPLETE - v0.1.0-beta released (2025-12-11)

**Estimated Effort**: 18-25 days total

---

### 11.0 Architecture Overview

**Memory Model**: Model 3 - Hybrid (Private + Shared)

```
NATS KV Bucket: loom-pattern-{projectId}

Keys:
  shared/decisions/{memoryId}      ← All agents read/write
  shared/architecture/{memoryId}
  shared/learnings/{memoryId}

  agents/{agentId}/recent/{memoryId}    ← Private, TTL: 24h
  agents/{agentId}/tasks/{memoryId}     ← Private, TTL: 24h
  agents/{agentId}/longterm/{memoryId}  ← Private, no TTL
  agents/{agentId}/core/{memoryId}      ← Private, no TTL, protected
```

**Storage**: NATS KV (V1), pluggable backends (V2 - see Future Enhancements)

---

### 11.0.1 Memory Data Model

```typescript
interface Memory {
  id: string;                    // UUID v4
  agentId: string;               // Creator agent GUID
  projectId: string;             // Project isolation
  scope: 'private' | 'shared';
  category: MemoryCategory;
  content: string;               // Max 32KB
  metadata?: MemoryMetadata;
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
  expiresAt?: string;            // ISO 8601, for TTL memories
  version: number;               // Schema version (1)
}

type MemoryCategory =
  // Private categories
  | 'recent'      // General short-term (24h TTL)
  | 'tasks'       // Current work items (24h TTL)
  | 'longterm'    // Permanent insights
  | 'core'        // Identity-defining (protected)
  // Shared categories
  | 'decisions'   // Project decisions
  | 'architecture'// Architecture choices
  | 'learnings';  // Shared knowledge

interface MemoryMetadata {
  tags?: string[];               // Max 10 tags, 50 chars each
  priority?: 1 | 2 | 3;          // 1=high, 3=low
  relatedTo?: string[];          // Related memory IDs
  source?: string;               // Where this came from
}

interface RecallResult {
  private: Memory[];
  shared: Memory[];
  summary: string;               // Concatenated key points
  counts: {
    private: number;
    shared: number;
    expired: number;             // Recently expired (info only)
  };
}
```

---

### 11.0.2 NATS KV Storage Schema

**Bucket Naming**: `loom-pattern-{projectId}`
- One bucket per project
- Created on first memory write
- History: 1 (no versioning in V1)

**Key Format**: `{scope}/{category}/{memoryId}` or `agents/{agentId}/{category}/{memoryId}`

**Examples**:
```
loom-pattern-myproject/shared/decisions/550e8400-e29b-41d4-a716-446655440000
loom-pattern-myproject/agents/agent-123/tasks/660e8400-e29b-41d4-a716-446655440001
loom-pattern-myproject/agents/agent-123/core/770e8400-e29b-41d4-a716-446655440002
```

**TTL Strategy**:
- NATS KV native TTL for `recent` and `tasks` categories (86400 seconds = 24h)
- No TTL for `longterm`, `core`, and shared categories
- Application-level cleanup as backup (via `cleanup` tool)

**Storage Limits**:
- Max memory size: 32KB per entry
- Max memories per agent: 10,000
- Max shared memories per project: 10,000
- Enforced at application level

---

### 11.0.3 Agent Identity & Authentication

**Agent ID Source** (in priority order):
1. `LOOM_AGENT_ID` environment variable
2. `agentId` from Warp session (if Pattern detects Warp)
3. Auto-generated UUID (persisted to `~/.loom/pattern/agent-id`)

**Project ID Source** (in priority order):
1. `LOOM_PROJECT_ID` environment variable
2. `projectId` from Warp session
3. Default: `"default"`

**Access Control**:
- Private memories: Only accessible by owning agent (agentId must match)
- Shared memories: All agents in same project can read/write
- Cross-project: Strictly forbidden (projectId isolation)

---

### 11.0.4 MCP Tool Specifications

#### `recall_context`
Retrieve memory summary for agent startup.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "scope": {
      "type": "string",
      "enum": ["private", "shared", "both"],
      "default": "both"
    },
    "categories": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Filter by categories (empty = all)"
    },
    "limit": {
      "type": "number",
      "default": 50,
      "maximum": 200
    },
    "since": {
      "type": "string",
      "format": "date-time",
      "description": "Only memories after this timestamp"
    }
  }
}
```

**Output**: `RecallResult` object

**Behavior**:
- Returns most recent memories up to limit
- Priority order: core > longterm > shared > recent > tasks
- Generates summary by concatenating content (truncated to 4KB)

---

#### `remember`
Store a new memory.

**Input Schema**:
```json
{
  "type": "object",
  "required": ["content"],
  "properties": {
    "content": {
      "type": "string",
      "maxLength": 32768
    },
    "scope": {
      "type": "string",
      "enum": ["private", "shared"],
      "default": "private"
    },
    "category": {
      "type": "string",
      "enum": ["recent", "tasks", "longterm", "decisions", "architecture", "learnings"],
      "default": "recent"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "tags": { "type": "array", "items": { "type": "string" } },
        "priority": { "type": "number", "enum": [1, 2, 3] },
        "relatedTo": { "type": "array", "items": { "type": "string" } }
      }
    }
  }
}
```

**Output**: `{ memoryId: string, expiresAt?: string }`

**Behavior**:
- Validates category matches scope (e.g., `tasks` only for private)
- Sets TTL for `recent` and `tasks` categories
- Returns generated memoryId

---

#### `remember_task`
Shorthand for remembering current work (24h TTL).

**Input Schema**:
```json
{
  "type": "object",
  "required": ["content"],
  "properties": {
    "content": { "type": "string", "maxLength": 32768 },
    "metadata": { "type": "object" }
  }
}
```

**Output**: `{ memoryId: string, expiresAt: string }`

**Behavior**: Equivalent to `remember(content, scope='private', category='tasks')`

---

#### `remember_learning`
Shorthand for remembering something learned (24h TTL).

**Input Schema**:
```json
{
  "type": "object",
  "required": ["content"],
  "properties": {
    "content": { "type": "string", "maxLength": 32768 },
    "metadata": { "type": "object" }
  }
}
```

**Output**: `{ memoryId: string, expiresAt: string }`

**Behavior**: Equivalent to `remember(content, scope='private', category='recent')`

---

#### `commit_insight`
Promote a temporary memory to permanent storage.

**Input Schema**:
```json
{
  "type": "object",
  "required": ["memoryId"],
  "properties": {
    "memoryId": { "type": "string" },
    "newContent": {
      "type": "string",
      "description": "Optional: update content during promotion"
    }
  }
}
```

**Output**: `{ memoryId: string, previousCategory: string }`

**Behavior**:
- Moves memory from `recent`/`tasks` to `longterm`
- Removes TTL (memory persists indefinitely)
- Optionally updates content
- Fails if memory is already `longterm` or `core`

---

#### `share_learning`
Share a private memory with all project agents.

**Input Schema**:
```json
{
  "type": "object",
  "required": ["memoryId"],
  "properties": {
    "memoryId": { "type": "string" },
    "category": {
      "type": "string",
      "enum": ["decisions", "architecture", "learnings"],
      "default": "learnings"
    },
    "keepPrivate": {
      "type": "boolean",
      "default": false,
      "description": "If true, copy to shared; if false, move"
    }
  }
}
```

**Output**: `{ sharedMemoryId: string, originalDeleted: boolean }`

**Behavior**:
- Copies or moves private memory to shared category
- Original memory deleted unless `keepPrivate=true`
- Only `longterm` and `core` memories can be shared (not ephemeral)

---

#### `core_memory`
Store an identity-defining memory (use sparingly).

**Input Schema**:
```json
{
  "type": "object",
  "required": ["content"],
  "properties": {
    "content": { "type": "string", "maxLength": 32768 },
    "metadata": { "type": "object" }
  }
}
```

**Output**: `{ memoryId: string }`

**Behavior**:
- Stored in `core` category (no TTL, protected)
- Max 100 core memories per agent (enforced)
- Cannot be deleted via `forget` (use `forget --force`)

---

#### `forget`
Delete a memory.

**Input Schema**:
```json
{
  "type": "object",
  "required": ["memoryId"],
  "properties": {
    "memoryId": { "type": "string" },
    "force": {
      "type": "boolean",
      "default": false,
      "description": "Required to delete core memories"
    }
  }
}
```

**Output**: `{ deleted: boolean, category: string }`

**Behavior**:
- Deletes memory by ID
- Requires `force=true` for core memories
- Can only delete own private memories or shared memories you created

---

#### `cleanup`
Run maintenance tasks.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "expireOnly": {
      "type": "boolean",
      "default": false,
      "description": "Only expire TTL memories, don't enforce limits"
    }
  }
}
```

**Output**: `{ expired: number, deleted: number, errors: string[] }`

**Behavior**:
- Removes memories past TTL expiration
- Enforces storage limits (oldest first if over limit)
- Returns count of affected memories

---

### 11.0.5 Error Handling

| Error Code | Condition | HTTP-like |
|------------|-----------|-----------|
| `MEMORY_NOT_FOUND` | memoryId doesn't exist | 404 |
| `ACCESS_DENIED` | Agent can't access this memory | 403 |
| `STORAGE_FULL` | Exceeded storage limits | 507 |
| `INVALID_CATEGORY` | Category doesn't match scope | 400 |
| `CORE_PROTECTED` | Attempted to delete core without force | 403 |
| `NATS_ERROR` | NATS connection/operation failed | 503 |
| `VALIDATION_ERROR` | Invalid input parameters | 400 |

---

### 11.0.6 Acceptance Criteria

**Functional**:
- [x] F-AC-1: Agent can store private memory and retrieve via `recall_context`
- [x] F-AC-2: Private memories NOT visible to other agents
- [x] F-AC-3: Shared memories visible to all agents in same project
- [x] F-AC-4: Memories with 24h TTL auto-deleted after expiration
- [x] F-AC-5: `commit_insight` promotes recent→longterm and removes TTL
- [x] F-AC-6: `share_learning` makes private memory visible to all project agents
- [x] F-AC-7: `core_memory` stores protected identity memories
- [x] F-AC-8: `forget` deletes memories (with force for core)
- [x] F-AC-9: `cleanup` removes expired memories and enforces limits
- [x] F-AC-10: Memories isolated by projectId (no cross-project access)

**Non-Functional**:
- [x] NF-AC-1: `recall_context` <100ms for typical use (10-100 memories)
- [ ] NF-AC-2: Handle 10,000 memories per project without degradation
- [x] NF-AC-3: Test coverage >90% *(90.39% achieved)*
- [x] NF-AC-4: Graceful recovery from NATS failures
- [x] NF-AC-5: Meaningful error messages on all failures
- [ ] NF-AC-6: Runs in Docker container *(Phase 11.9)*
- [ ] NF-AC-7: Integrates with Claude Code via MCP *(Phase 11.9)*
- [x] NF-AC-8: Secure (no cross-project memory access)

---

### 11.1 Foundation & Design ✅ COMPLETE

**Status**: Complete (2025-12-11)

**Tasks**:
| Task | Agent | Status |
|------|-------|--------|
| Define memory data model (see 11.0.1) | Human + Claude | ✅ Complete |
| Define NATS KV storage schema (see 11.0.2) | Human + Claude | ✅ Complete |
| Specify MCP tool schemas (see 11.0.4) | Human + Claude | ✅ Complete |
| Define authentication model (see 11.0.3) | Human + Claude | ✅ Complete |
| Define error handling (see 11.0.5) | Human + Claude | ✅ Complete |
| Write acceptance criteria (see 11.0.6) | requirements-reviewer-agent | ✅ Complete |
| Create loom-pattern repository | typescript-scaffold-agent | ✅ Complete |

**Done When**: Repository created, specs complete

---

### 11.2 Storage Layer ✅ COMPLETE

**Status**: Complete (2025-12-11)

**Tasks**:
| Task | Agent | Status |
|------|-------|--------|
| Implement storage interface | typescript-feature-implementer | ✅ Complete |
| Implement NATS KV backend | typescript-feature-implementer | ✅ Complete |
| Implement TTL management | typescript-feature-implementer | ✅ Complete (application-level, NATS KV doesn't support per-key TTL) |
| Implement projectId isolation | typescript-feature-implementer + security-evaluator-agent (review) | ✅ Complete |

**Implementation Notes**:
- Storage interface: `src/storage/interface.ts` with `buildKey()`/`parseKey()` helpers
- NATS KV backend: `src/storage/nats-kv.ts` (497 lines)
  - TCP and WebSocket transport support
  - URL-based and environment variable credential support
  - Project isolation via separate buckets (`loom-pattern-{projectId}`)
- Tests: `src/storage/nats-kv.test.ts` (30 tests passing)

**Done When**: Can CRUD memories in NATS KV, TTL works, tests pass

---

### 11.3 MCP Server Scaffold ✅ COMPLETE

**Status**: Complete (2025-12-11)

**Tasks**:
| Task | Agent | Status |
|------|-------|--------|
| Create repository structure | typescript-scaffold-agent | ✅ Complete |
| Set up TypeScript, ESLint, Prettier, Vitest | typescript-scaffold-agent | ✅ Complete |
| Implement MCP server initialization | typescript-feature-implementer | ⏳ Pending (in 11.4) |
| Implement agent identity/session management | typescript-feature-implementer | ⏳ Pending (in 11.4) |
| Add tool registration infrastructure | typescript-feature-implementer | ⏳ Pending (in 11.4) |
| Write server lifecycle tests | integration-test-writer | ⏳ Pending (in 11.4) |

**Implementation Notes**:
- Package: `@loom/pattern` v0.1.0
- Build: TypeScript 5.7 with strict mode
- Testing: Vitest with 90% coverage threshold
- Linting: ESLint 9 + Prettier
- Types: `src/types.ts` with full Memory data model
- Config: `src/config.ts` for environment configuration
- Logger: `src/logger.ts` for debug/info/warn/error logging

**Done When**: MCP server starts, connects to Claude Code, tracks session

---

### 11.4 Private Memory Tools ✅ COMPLETE

**Status**: Complete (2025-12-11)

**Tasks**:
| Task | Agent | Status |
|------|-------|--------|
| Implement `remember` tool (private) | typescript-feature-implementer | ✅ Complete |
| Implement `remember_task` tool | typescript-feature-implementer | ✅ Complete |
| Implement `remember_learning` tool | typescript-feature-implementer | ✅ Complete |
| Implement `commit_insight` tool | typescript-feature-implementer | ✅ Complete |
| Implement `core_memory` tool | typescript-feature-implementer | ✅ Complete |
| Implement `forget` tool | typescript-feature-implementer | ✅ Complete |
| Write tool tests (unit) | unit-test-writer | ⏳ Pending (in 11.8) |
| Write tool tests (integration) | integration-test-writer | ⏳ Pending (in 11.8) |

**Implementation Notes**:
- All tools in `src/tools/` directory
- Tool dispatcher in `src/tools/index.ts` with `handleToolCall()`
- MCP tool definitions in `TOOL_DEFINITIONS` array
- PatternServer (`src/server.ts`) integrates all tools
- AgentSession (`src/session.ts`) manages agent identity

**Done When**: All private tools work end-to-end, tests pass

---

### 11.5 Shared Memory Tools ✅ COMPLETE

**Status**: Complete (2025-12-11)

**Tasks**:
| Task | Agent | Status |
|------|-------|--------|
| Implement `remember` tool (shared) | typescript-feature-implementer | ✅ Complete (part of remember tool) |
| Implement `share_learning` tool | typescript-feature-implementer | ✅ Complete |
| Implement shared memory access controls | typescript-feature-implementer + security-evaluator-agent (review) | ✅ Complete |
| Write multi-agent scenario tests | integration-test-engineer-agent | ⏳ Pending (in 11.8) |

**Implementation Notes**:
- `share_learning` in `src/tools/share-learning.ts`
- Only `longterm` and `core` private memories can be shared
- Supports copy (keepPrivate=true) or move (keepPrivate=false)
- Shared categories: decisions, architecture, learnings

**Done When**: Shared memories visible across agents, access controls work

---

### 11.6 Recall & Context ✅ COMPLETE

**Status**: Complete (2025-12-11)

**Tasks**:
| Task | Agent | Status |
|------|-------|--------|
| Implement `recall_context` tool | typescript-feature-implementer | ✅ Complete |
| Implement memory filtering/query logic | typescript-feature-implementer | ✅ Complete |
| Implement context summarization | typescript-feature-implementer | ✅ Complete |
| Optimize for large memory sets | typescript-feature-implementer | ✅ Complete (limit param) |
| Write recall tests | integration-test-writer | ⏳ Pending (in 11.8) |

**Implementation Notes**:
- `recall_context` in `src/tools/recall-context.ts`
- Priority ordering: core > longterm > decisions/architecture/learnings > recent > tasks
- Filters: scope, categories, limit (max 200), since timestamp
- Summary generation with 4KB max, intelligent truncation
- Returns counts for private, shared, and expired memories

**Done When**: `recall_context` returns useful summary, <100ms typical

---

### 11.7 Cleanup & Maintenance ✅ COMPLETE

**Status**: Complete (2025-12-11)

**Tasks**:
| Task | Agent | Status |
|------|-------|--------|
| Implement `cleanup` tool | typescript-feature-implementer | ✅ Complete |
| Implement background TTL cleanup | typescript-feature-implementer | ✅ Complete (on-demand via tool) |
| Implement storage limits enforcement | typescript-feature-implementer | ✅ Complete |
| Add cleanup metrics/logging | typescript-feature-implementer | ✅ Complete |

**Implementation Notes**:
- `cleanup` in `src/tools/cleanup.ts`
- Phase 1: Expire TTL memories (expiresAt < now)
- Phase 2: Enforce limits (recent: 1000, tasks: 500, core: 100)
- Core memories cannot be auto-deleted (reports error if over limit)
- Returns counts: expired, deleted, errors array

**Done When**: Cleanup works, limits enforced, logged

---

### 11.8 Testing & Polish ✅ COMPLETE

**Status**: Complete (2025-12-11)

**Tasks**:
| Task | Agent | Status |
|------|-------|--------|
| End-to-end integration tests | integration-test-engineer-agent | ✅ Complete |
| Multi-agent scenario tests | integration-test-engineer-agent | ✅ Complete |
| Performance tests (1000s memories) | integration-test-engineer-agent | ⏳ Deferred (NF-AC-2) |
| Error scenario tests | integration-test-engineer-agent | ✅ Complete |
| Achieve >90% test coverage | code-quality-agent | ✅ Complete (90.39%) |
| Fix bugs | typescript-feature-implementer | ✅ N/A |
| Validate against acceptance criteria | pattern-evaluator-agent | ✅ Complete |

**Test Summary**:
- **373 tests pass** across 16 test files
- **90.39% code coverage** (threshold: 90%)
- All 10 functional acceptance criteria validated
- 4/8 non-functional criteria validated (Docker/MCP integration in 11.9)

**Files Added**:
- `src/config.test.ts` - Configuration tests
- `src/index.test.ts` - CLI function tests
- `src/integration.test.ts` - Multi-agent scenario tests
- `src/storage/nats-kv-unit.test.ts` - Storage unit tests
- Tool tests: cleanup, commit-insight, core-memory, forget, recall-context, remember, remember-learning, remember-task, share-learning

**Dependencies**: All previous phases (complete)

**Done When**: All tests pass, coverage >90%, no critical bugs ✅

---

### 11.9 Documentation & Release Prep ✅ COMPLETE

**Status**: Complete (2025-12-11)

**Tasks**:
| Task | Agent | Status |
|------|-------|--------|
| Write README with quick start | documentation-writer | ✅ Complete |
| Write API documentation | documentation-writer | ✅ Complete |
| Write integration guide (Warp/Weft) | documentation-writer | ✅ Complete (in README) |
| Write best practices guide | documentation-writer | ✅ Complete (in README) |
| Create usage examples | documentation-writer | ✅ Complete |
| Set up Docker build | github-actions-workflow-engineer | ✅ Complete |
| Prepare npm publish | github-actions-workflow-engineer | ✅ Complete |

**Deliverables**:
- Comprehensive README with all 10 MCP tools documented
- Dockerfile with multi-stage build (tested: `loom-pattern:test`)
- GitHub Actions CI workflow (`ci.yml`) - build, test, Docker push
- GitHub Actions release workflow (`release.yml`) - tag-based releases
- `.npmignore` and `.dockerignore` for clean packaging

**Dependencies**: Phase 11.8 complete

**Done When**: Docs complete, Docker builds, ready for release ✅

---

### 11.10 Beta Release ✅ COMPLETE

**Status**: Complete (2025-12-11)

**Tasks**:
| Task | Agent | Status |
|------|-------|--------|
| Tag v0.1.0-beta | release-manager-agent | ✅ Complete |
| Push Docker image to ghcr.io | release-manager-agent | ✅ Complete |
| Create GitHub release | release-manager-agent | ✅ Complete |
| Collect feedback | Human | ⏳ Ongoing |

**Release Artifacts**:
- Git tag: `v0.1.0-beta`
- Docker: `ghcr.io/mdlopresti/loom-pattern:0.1.0-beta` and `:latest`
- GitHub Release: https://github.com/mdlopresti/loom-pattern/releases/tag/v0.1.0-beta
- npm: Pending (Dec 16 account unlock)

**Dependencies**: Phase 11.9 complete

**Done When**: Pattern usable by Loom users ✅

---

### Phase 11 Agent Parallelization

```
                                    ┌─────────────────────────────────┐
                                    │ 11.1 Foundation (Human+Claude)  │
                                    │ + typescript-scaffold-agent     │
                                    └───────────────┬─────────────────┘
                                                    │
                    ┌───────────────────────────────┴───────────────────────────────┐
                    │                                                               │
    ┌───────────────▼───────────────┐                       ┌───────────────────────▼───────────────┐
    │ 11.2 Storage Layer            │                       │ 11.3 MCP Server Scaffold              │
    │ typescript-feature-implementer│                       │ typescript-scaffold-agent             │
    │ unit-test-writer              │                       │ typescript-feature-implementer        │
    │ security-evaluator-agent      │                       │ integration-test-writer               │
    └───────────────┬───────────────┘                       └───────────────────────┬───────────────┘
                    │                                                               │
                    └───────────────────────────────┬───────────────────────────────┘
                                                    │
                                    ┌───────────────▼───────────────┐
                                    │ 11.4 Private Memory Tools     │
                                    │ typescript-feature-implementer│
                                    │ unit-test-writer              │
                                    │ integration-test-writer       │
                                    └───────────────┬───────────────┘
                                                    │
                    ┌───────────────────────────────┼───────────────────────────────┐
                    │                               │                               │
    ┌───────────────▼───────────────┐ ┌─────────────▼─────────────┐ ┌───────────────▼───────────────┐
    │ 11.5 Shared Memory Tools      │ │ 11.7 Cleanup & Maintenance│ │ (wait for 11.5)               │
    │ typescript-feature-implementer│ │ typescript-feature-impl.  │ │                               │
    │ security-evaluator-agent      │ │                           │ │                               │
    │ integration-test-engineer     │ │                           │ │                               │
    └───────────────┬───────────────┘ └─────────────┬─────────────┘ │                               │
                    │                               │               │                               │
                    └───────────────┬───────────────┘               │                               │
                                    │                               │                               │
                    ┌───────────────▼───────────────┐               │                               │
                    │ 11.6 Recall & Context         │◀──────────────┘                               │
                    │ typescript-feature-implementer│                                               │
                    │ integration-test-writer       │                                               │
                    └───────────────┬───────────────┘                                               │
                                    │                                                               │
                                    └───────────────────────────────┬───────────────────────────────┘
                                                                    │
                                    ┌───────────────────────────────▼───────────────────────────────┐
                                    │ 11.8 Testing & Polish                                         │
                                    │ integration-test-engineer-agent, code-quality-agent           │
                                    │ pattern-evaluator-agent, typescript-feature-implementer       │
                                    └───────────────────────────────┬───────────────────────────────┘
                                                                    │
                                    ┌───────────────────────────────▼───────────────────────────────┐
                                    │ 11.9 Documentation & Release Prep                             │
                                    │ documentation-writer (docs), github-actions-workflow-engineer │
                                    └───────────────────────────────┬───────────────────────────────┘
                                                                    │
                                    ┌───────────────────────────────▼───────────────────────────────┐
                                    │ 11.10 Beta Release                                            │
                                    │ release-manager-agent + Human approval                        │
                                    └───────────────────────────────────────────────────────────────┘
```
