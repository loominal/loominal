# Loom - Untested Features Report

Based on all READMEs across the monorepo and the 4 completed integration scenarios.

## Summary

| Component | Advertised Features | Tested | Untested |
|-----------|---------------------|--------|----------|
| **Warp** (MCP Tools) | 17 tools | 11 | 6 |
| **Warp** (Advanced Features) | 8 | 3 | 5 |
| **Weft** (Coordinator) | 10 | 0 | 10 |
| **Shuttle** (CLI) | 15+ commands | 0 | 15+ |
| **Cross-System** | 5 | 1 | 4 |

---

## WARP - Untested MCP Tools

### Direct Messaging (0% tested)

| Tool | Description | Status |
|------|-------------|--------|
| `send_direct_message` | Send message to agent by GUID | ❌ NOT TESTED |
| `read_direct_messages` | Read from personal inbox | ❌ NOT TESTED |

**Advertised capabilities NOT tested:**
- Personal inboxes for agent-to-agent DMs
- Reliable delivery to specific agents
- Message filtering by type/sender
- Offline message queuing (messages delivered when agent comes online)

### Dead Letter Queue (0% tested)

| Tool | Description | Status |
|------|-------------|--------|
| `list_dead_letter_items` | List failed work items | ❌ NOT TESTED |
| `retry_dead_letter_item` | Move failed work back to queue | ❌ NOT TESTED |
| `discard_dead_letter_item` | Permanently delete failed work | ❌ NOT TESTED |

**Advertised capabilities NOT tested:**
- Failed work capture after max delivery attempts
- Retry mechanism with optional attempt reset
- Manual discard of unrecoverable work
- DLQ TTL expiration (7 days default)

### Registry (Partial)

| Tool | Description | Status |
|------|-------------|--------|
| `update_presence` | Change status/task count | ❌ NOT TESTED |

---

## WARP - Untested Advanced Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Visibility Controls** | private, user-only, public agents | ❌ Only project-only tested |
| **Custom Channels** | .loom-config.json channel definitions | ❌ Only defaults tested |
| **Retention Policies** | maxMessages, maxAge, maxBytes | ❌ Only defaults tested |
| **Heartbeat/Stale Detection** | Agents go offline after missed heartbeats | ⚠️ Implicit only |
| **Cross-Project Discovery** | Public agents visible across projects | ❌ NOT TESTED |

---

## WEFT - Entire Component Untested

The Weft coordinator has **zero integration test coverage**. All advertised features are untested:

### Work Routing

| Feature | Description | Status |
|---------|-------------|--------|
| Classification-based routing | corporate/personal/open-source → correct agents | ❌ NOT TESTED |
| Capability matching | Route to agents with required skills | ❌ NOT TESTED |
| Load balancing | Distribute across available workers | ❌ NOT TESTED |
| Policy enforcement | Corporate work only to approved agents | ❌ NOT TESTED |

### Dynamic Agent Provisioning

| Feature | Description | Status |
|---------|-------------|--------|
| Auto spin-up | Launch agents when work arrives | ❌ NOT TESTED |
| SSH mechanism | Start agents on remote servers | ❌ NOT TESTED |
| Local mechanism | Spawn local processes | ❌ NOT TESTED |
| Kubernetes mechanism | Create K8s Jobs | ❌ NOT TESTED |
| GitHub Actions mechanism | Trigger workflows | ❌ NOT TESTED |
| Webhook mechanism | Call custom endpoints | ❌ NOT TESTED |
| Idle detection | Scale down unused agents | ❌ NOT TESTED |

### Target Registry

| Feature | Description | Status |
|---------|-------------|--------|
| Add/remove targets | Manage spin-up configurations | ❌ NOT TESTED |
| Enable/disable targets | Control target availability | ❌ NOT TESTED |
| Target health checks | Verify targets are reachable | ❌ NOT TESTED |

### Multi-Tenant

| Feature | Description | Status |
|---------|-------------|--------|
| Auto project discovery | Projects created on first connect | ❌ NOT TESTED |
| Project isolation | Each project gets separate state | ❌ NOT TESTED |
| Cross-project stats | Global metrics view | ❌ NOT TESTED |

### REST API

| Endpoint | Description | Status |
|----------|-------------|--------|
| `GET /health` | Health check | ❌ NOT TESTED |
| `GET /api/agents` | List agents | ❌ NOT TESTED |
| `GET /api/work` | List work items | ❌ NOT TESTED |
| `POST /api/work` | Submit work | ❌ NOT TESTED |
| `GET /api/targets` | List targets | ❌ NOT TESTED |
| `POST /api/targets` | Register target | ❌ NOT TESTED |
| `GET /api/stats` | Coordinator stats | ❌ NOT TESTED |

---

## SHUTTLE - Entire Component Untested

The Shuttle CLI has **zero integration test coverage**:

### Work Commands

| Command | Status |
|---------|--------|
| `shuttle submit <task>` | ❌ NOT TESTED |
| `shuttle work list` | ❌ NOT TESTED |
| `shuttle work show <id>` | ❌ NOT TESTED |
| `shuttle watch <id>` | ❌ NOT TESTED |

### Agent Commands

| Command | Status |
|---------|--------|
| `shuttle agents list` | ❌ NOT TESTED |
| `shuttle shutdown <guid>` | ❌ NOT TESTED |
| `shuttle spin-up` | ❌ NOT TESTED |

### Target Commands

| Command | Status |
|---------|--------|
| `shuttle targets list` | ❌ NOT TESTED |
| `shuttle targets add` | ❌ NOT TESTED |
| `shuttle targets remove` | ❌ NOT TESTED |
| `shuttle targets enable/disable` | ❌ NOT TESTED |
| `shuttle targets test` | ❌ NOT TESTED |

### Other Commands

| Command | Status |
|---------|--------|
| `shuttle stats` | ❌ NOT TESTED |
| `shuttle config` | ❌ NOT TESTED |
| `shuttle projects` | ❌ NOT TESTED |

---

## Cross-System Features - Mostly Untested

| Feature | Description | Status |
|---------|-------------|--------|
| Multi-machine communication | Agents on different computers via shared NATS | ⚠️ Same machine only |
| Cross-project messaging | Public agents across projects | ❌ NOT TESTED |
| Corporate/Personal separation | Route sensitive work appropriately | ❌ NOT TESTED |
| Swarm programming | Multiple agents on same codebase | ⚠️ Partial (S04) |
| CI/CD integration | GitHub Actions triggers | ❌ NOT TESTED |

---

## Prioritized Test Gaps

### Critical (Core Features, 0% Coverage)

1. **Direct Messaging** - Advertised as key feature, completely untested
2. **Dead Letter Queue** - Reliability feature, completely untested
3. **Weft Coordinator** - Entire component untested

### High (Important Features)

4. **Work Classification/Routing** - Key differentiator, untested
5. **Dynamic Spin-Up** - Key automation feature, untested
6. **update_presence** - Basic registry tool, untested

### Medium (Advanced Features)

7. **Visibility Controls** - Security feature, only default tested
8. **Shuttle CLI** - User-facing tool, untested
9. **REST API** - Integration point, untested
10. **Multi-project** - Scalability feature, untested

### Lower (Nice to Have)

11. **Custom Channels** - Configuration feature
12. **Retention Policies** - Storage management
13. **True cross-machine testing** - Currently same-machine only

---

## Recommended Next Scenarios

| Scenario | Tests | Effort |
|----------|-------|--------|
| **05-Direct-Messaging** | send_direct_message, read_direct_messages, offline queuing | Low |
| **06-Dead-Letter-Queue** | Intentional failures, list/retry/discard DLQ items | Medium |
| **07-Weft-Basic** | Submit via Shuttle, routing, agent listing | High |
| **08-Dynamic-Spin-Up** | Target registration, auto spin-up on work | High |
| **09-Visibility-Controls** | private/public/user-only agents | Medium |

---

## What IS Working (Verified by Tests)

| Feature | Scenario |
|---------|----------|
| Agent registration & GUID assignment | S01 |
| Mutual agent discovery | S01 |
| Capability filtering | S01, S03 |
| Channel messaging (pub-sub) | S02 |
| Message persistence/history | S02 |
| Handle attribution | S02 |
| Work queue broadcasting | S03, S04 |
| Capability-based work routing | S03 |
| Competing consumers (no duplicates) | S04 |
| Load balancing across workers | S04 |
| Priority ordering | S03 |
| Empty queue timeout | S03, S04 |
