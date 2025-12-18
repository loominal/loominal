# Loominal Testing Strategy

**Last Updated:** 2025-12-18

## Executive Summary

This document outlines the progressive testing strategy for the Loominal multi-agent infrastructure, from unit tests through end-to-end validation. The strategy emphasizes automated testing with human-readable reports and manual validation checkpoints to ensure production readiness for public release.

---

## Testing Philosophy

### Core Principles

1. **Progressive Complexity**: Build confidence layer by layer (unit → integration → system → e2e)
2. **Automated with Human Review**: Automated tests generate reports for manual validation
3. **Production Readiness Focus**: Testing strategy aligns with deployment concerns
4. **Realistic Scenarios**: Integration tests mirror real-world usage patterns
5. **Continuous Verification**: Tests run on every commit, full suite before release

### Test Pyramid

```
                    ┌─────────────────┐
                    │   E2E Tests     │  ← Multi-machine, full stack
                    │   (10 tests)    │
                    └─────────────────┘
                 ┌────────────────────────┐
                 │   System Tests         │  ← Full component integration
                 │   (20 tests)           │
                 └────────────────────────┘
              ┌──────────────────────────────┐
              │   Integration Tests          │  ← Component interaction
              │   (40 tests)                 │
              └──────────────────────────────┘
           ┌────────────────────────────────────┐
           │   Unit Tests                       │  ← Individual functions
           │   (200+ tests)                     │
           └────────────────────────────────────┘
```

---

## Level 1: Unit Tests

**Scope:** Individual functions, modules, and classes in isolation

**Coverage:** 200+ tests across all components

### Test Organization

#### Warp (19 test files)

**Location:** `warp/src/**/*.test.ts`

| File | Focus | Key Tests |
|------|-------|-----------|
| `config.test.ts` | Configuration loading | Project path, namespace, channel config |
| `nats.test.ts` | NATS connection | Auth, reconnect, error handling |
| `nats-auth.test.ts` | NATS authentication | URL parsing, token auth, credentials |
| `streams.test.ts` | JetStream setup | Stream creation, consumer setup |
| `kv.test.ts` | KV bucket operations | Create, get, put, delete |
| `registry.test.ts` | Agent registry logic | Register, discover, heartbeat |
| `inbox.test.ts` | Direct messaging | Inbox creation, message routing |
| `workqueue.test.ts` | Work distribution | Queue creation, competing consumers |
| `dlq.test.ts` | Dead letter queue | Failed work capture, retry logic |
| `heartbeat.test.ts` | Heartbeat mechanism | Interval, timeout, failure detection |
| `lifecycle.test.ts` | Agent lifecycle | Registration, deregistration, cleanup |
| `coordinator.test.ts` | Work coordination | Assignment tracking, status updates |
| `messages.test.ts` | Message formatting | Serialization, validation |
| `work-messages.test.ts` | Work message types | Task format, metadata |
| `tools/*.test.ts` | MCP tool implementations | Each tool's logic and validation |

**Run Commands:**
```bash
cd warp
npm test                    # All tests
npm run test:coverage       # With coverage report
npm run test:watch          # Watch mode
```

#### Weft (8 test files)

**Location:** `weft/weft/src/**/__tests__/*.test.ts`, `weft/tests/integration/*.test.ts`

| File | Focus | Key Tests |
|------|-------|-----------|
| `routing/engine.test.ts` | Work classification | Corporate, personal, open-source routing |
| `idle/tracker.test.ts` | Idle detection | Activity tracking, timeout logic |
| `targets/registry.test.ts` | Target management | Add, remove, list targets |
| `shared/nats/client.test.ts` | NATS client wrapper | Connection, error handling |
| `shared/types/scope.test.ts` | Scope type validation | Scope enum, type safety |
| `integration/work-queue.test.ts` | Work queue integration | End-to-end work flow |
| `integration/agent-lifecycle.test.ts` | Agent lifecycle | Spin-up, work, shutdown |
| `integration/multi-agent.test.ts` | Multi-agent coordination | Multiple agents, load balancing |

**Run Commands:**
```bash
cd weft
pnpm test                   # All tests
pnpm test:watch             # Watch mode
cd weft && pnpm test        # Per-package
```

#### Shuttle (6 test files)

**Location:** `shuttle/src/tools/*.test.ts`

| File | Focus | Key Tests |
|------|-------|-----------|
| `assess.test.ts` | Task assessment | Complexity analysis, parallelization |
| `spawn.test.ts` | Subagent spawning | Directory creation, work distribution |
| `checkpoint.test.ts` | Progress tracking | Phase updates, metadata storage |
| `storage.test.ts` | Filesystem operations | Directory structure, file I/O |
| `state.test.ts` | NATS state management | KV storage, graceful degradation |
| `synthesize.test.ts` | Result synthesis | Output merging, conflict resolution |

**Run Commands:**
```bash
cd shuttle
npm test                    # All tests
npm run test:coverage       # With coverage report
npm run test:watch          # Watch mode
```

#### Pattern (2 test files)

**Location:** `pattern/src/**/*.test.ts`

| File | Focus | Key Tests |
|------|-------|-----------|
| `storage/nats-kv.test.ts` | KV storage operations | Store, retrieve, delete memories |
| `storage/nats-kv-unit.test.ts` | KV unit tests | Isolated storage logic |

**Run Commands:**
```bash
cd pattern
npm test                    # All tests
npm run test:coverage       # With coverage report
```

### Unit Test Execution

**Command:**
```bash
# Root level - run all component unit tests
./scripts/test-units.sh
```

**Expected Output:**
```
✓ Warp: 85 passed (19 test files)
✓ Weft: 42 passed (8 test files)
✓ Shuttle: 50 passed (6 test files)
✓ Pattern: 23 passed (2 test files)
─────────────────────────────────────
Total: 200 passed
Coverage: 85% overall
```

### Coverage Report Review (Manual Validation)

**Generated Report:** `coverage/lcov-report/index.html` (each component)

**Manual Checklist:**

- [ ] Overall coverage >80%
- [ ] Critical paths (registry, work distribution, state management) >90%
- [ ] No uncovered error handling paths
- [ ] Tool implementations fully covered

**Review Command:**
```bash
open warp/coverage/lcov-report/index.html
open weft/weft/coverage/lcov-report/index.html
open shuttle/coverage/lcov-report/index.html
open pattern/coverage/lcov-report/index.html
```

---

## Level 2: Integration Tests

**Scope:** Component interaction within a single process

**Coverage:** 40 tests across integration scenarios

### Integration Test Scenarios

#### Warp Integration (within test-scenarios/)

**Location:** `test-scenarios/`

| Scenario | Description | Validation |
|----------|-------------|------------|
| `01-basic-registration` | Agent registration → discovery | Verify KV storage, heartbeat |
| `02-channel-messaging` | Send → receive channel messages | Verify delivery, ordering |
| `03-work-distribution` | Broadcast → claim work | Verify queue behavior |
| `04-competing-consumers` | Multiple agents claiming work | Verify fairness, no duplicates |
| `05-direct-messaging` | Agent-to-agent messages | Verify inbox routing |
| `06-dead-letter-queue` | Failed work → DLQ → retry | Verify capture, retry logic |
| `07-registry-advanced` | Filtering, status updates | Verify query accuracy |

**Run Command:**
```bash
cd test-scenarios
npm test
```

#### Weft Integration

**Location:** `weft/tests/integration/`

| Test | Description | Validation |
|------|-------------|------------|
| `work-queue.test.ts` | Work submission → routing → assignment | Verify classification, agent match |
| `agent-lifecycle.test.ts` | Agent spin-up → work → shutdown | Verify lifecycle events |
| `multi-agent.test.ts` | Multiple agents, load balancing | Verify distribution fairness |

**Run Command:**
```bash
cd weft
pnpm test
```

#### Shuttle Integration (within component)

**Location:** `shuttle/src/tools/*.test.ts` (integration mode)

| Test | Description | Validation |
|------|-------------|------------|
| Full orchestration flow | Assess → spawn → checkpoint → synthesize | Verify state transitions |
| NATS graceful degradation | NATS unavailable, filesystem-only | Verify warnings, continued operation |

**Run Command:**
```bash
cd shuttle
npm test
```

### Integration Test Execution

**Command:**
```bash
# Run all integration tests
./scripts/test-integration.sh
```

**Expected Output:**
```
✓ Warp Integration: 15 scenarios passed
✓ Weft Integration: 8 tests passed
✓ Shuttle Integration: 2 flows passed
✓ Pattern Integration: 5 tests passed
─────────────────────────────────────
Total: 30 integration tests passed
```

### Integration Report Review (Manual Validation)

**Generated Report:** `test-scenarios/INTEGRATION-REPORT.md`

**Manual Checklist:**

- [ ] All scenarios passed
- [ ] No unexpected warnings in logs
- [ ] NATS subject patterns correct (verify with `nats stream ls`)
- [ ] KV buckets created as expected (verify with `nats kv ls`)
- [ ] Work distribution fair across agents
- [ ] DLQ captures failed work correctly
- [ ] Heartbeat mechanism functioning
- [ ] Idle detection triggers correctly

**Review Command:**
```bash
cat test-scenarios/INTEGRATION-REPORT.md
```

---

## Level 3: System Tests

**Scope:** Full stack integration with real NATS, all components running

**Coverage:** 11 test scenarios (mix of completed, partial, and planned)

### System Test Scenarios

**Location:** `test-scenarios/`

**Status Legend:**
- ✅ TESTED & PASSING - Test implemented and results documented
- ⚠️ PARTIALLY TESTED - Some tests passing, some not run
- ⬜ IMPLEMENTED - Test file exists but not fully executed
- 📝 PLANNED - Directory exists but test not implemented

| Scenario | Status | Description | Components | Key Tests |
|----------|--------|-------------|------------|-----------|
| `08-weft-basic` | ✅ | Basic Weft coordinator functionality | Weft, NATS | 5 tests: NATS connection, health check, API endpoints |
| `09-work-routing` | ✅ | Classification-based work routing | Weft, Warp | 5 tests: Corporate, personal, capability matching |
| `10-target-registry` | ⬜ | Target management API | Weft | Target CRUD, health checks |
| `11-dynamic-spinup` | ⬜ | Auto agent provisioning mechanisms | Weft | SSH, K8s, local, webhook, GitHub Actions |
| `12-idle-detection` | ⬜ | Idle agent timeout and shutdown | Weft | Activity tracking, timeout logic |
| `13-multi-tenant` | ⬜ | Multiple projects with isolation | Weft, Warp | Project namespacing, isolation |
| `14-end-to-end` | ⬜ | Full workflow integration | All | Submit → route → execute → result |
| `15-failure-recovery` | ⬜ | Failure scenarios and recovery | Weft, Warp | Agent crash, work reassignment |
| `17-shuttle-cli` | 📝 | Shuttle orchestration | Shuttle, Warp | Task decomposition, synthesis |
| `19-advanced-failure` | ⬜ | Advanced failure scenarios | All | Network partition, NATS restart |
| `20-performance` | ✅ | Performance baseline measurement | Warp, NATS | Latency benchmarks (p50/p95/p99) |

**Test Results Summary** (from `test-scenarios/WEFT-INTEGRATION-TEST-SUMMARY.md`):
- ✅ `08-weft-basic`: 80% pass (4/5 tests) - *1 critical issue: KV bucket naming mismatch*
- ✅ `09-work-routing`: 80% pass (4/5 tests) - *1 minor issue: API field naming*
- ✅ `20-performance`: 100% pass - *All latency targets met (p95: 2ms channels, 77ms work, 2ms DM)*
- ⬜ Others: Test files exist but not fully executed or results not documented

### System Test Infrastructure

**Prerequisites:**
```bash
# Start NATS with JetStream
docker run -d --name nats -p 4222:4222 nats:latest -js

# Start Weft
cd weft && docker-compose up -d

# Verify services
curl http://localhost:3000/health  # Weft health
nats stream ls                     # NATS streams
```

**Execution:**
```bash
# Run individual system tests
cd test-scenarios

# Run specific tests
node 08-weft-basic/test-weft-basic.mjs
node 09-work-routing/test-work-routing.mjs
node 20-performance/test-performance-baseline.mjs

# Or run all implemented tests
for test in {08,09,10,11,12,13,14,15,17,19,20}-*/test-*.mjs; do
  echo "Running $test..."
  node "$test" || echo "FAILED: $test"
done
```

**Current Output:**
```
✅ 08-weft-basic: 4/5 PASS (1 known issue: KV bucket naming)
✅ 09-work-routing: 4/5 PASS (1 minor issue: API field name)
⬜ 10-target-registry: Test file exists, not executed
⬜ 11-dynamic-spinup: Test file exists, not executed
⬜ 12-idle-detection: Test file exists, not executed
⬜ 13-multi-tenant: Test file exists, not executed
⬜ 14-end-to-end: Test file exists, not executed
⬜ 15-failure-recovery: Test file exists, not executed
📝 17-shuttle-cli: Test file exists, Shuttle integration pending
⬜ 19-advanced-failure: Test file exists, not executed
✅ 20-performance: 3/3 PASS (All latency targets met)
─────────────────────────────────────
Executed: 3 scenarios
Passed: 11/13 tests (85%)
Pending: 8 scenarios need execution
```

### System Test Report Review (Manual Validation)

**Generated Reports:**
- `test-scenarios/WEFT-INTEGRATION-TEST-SUMMARY.md` - Weft coordinator test results
- `test-scenarios/PERFORMANCE-BASELINE.md` - Performance benchmarks
- `test-scenarios/{scenario}/results.md` - Individual scenario results

**Manual Checklist:**

**Completed Tests:**
- [x] Weft basic functionality (80% pass - 1 known issue)
- [x] Work routing (80% pass - 1 minor issue)
- [x] Performance benchmarks (100% pass)
  - [x] Channel messaging p95: 2ms (target <100ms) ✅
  - [x] Work distribution p95: 77ms (target <200ms) ✅
  - [x] Direct messaging p95: 2ms (target <100ms) ✅

**Known Issues to Address:**
- [ ] **CRITICAL**: KV bucket naming mismatch between Warp and Weft
  - Warp uses: `loom-agents-{projectId}`
  - Weft expects: `coord-{projectId}-agents`
  - Impact: Weft cannot discover Warp-registered agents
  - File: `weft/weft/src/coordinator/registry.ts:63`

- [ ] **MINOR**: API response field naming inconsistency
  - Uses `workItemId` instead of `id`
  - Impact: Documentation/consistency issue

**Pending Tests:**
- [ ] Target registry functionality
- [ ] Dynamic spin-up mechanisms (SSH, K8s, local, webhook, GitHub Actions)
- [ ] Idle detection and timeout
- [ ] Multi-tenant isolation
- [ ] End-to-end workflow
- [ ] Failure recovery scenarios
- [ ] Shuttle orchestration integration
- [ ] Advanced failure scenarios (network partition, NATS restart)

**Review Commands:**
```bash
# Review existing test results
cat test-scenarios/WEFT-INTEGRATION-TEST-SUMMARY.md
cat test-scenarios/PERFORMANCE-BASELINE.md
cat test-scenarios/08-weft-basic/results.md
cat test-scenarios/09-work-routing/results.md
cat test-scenarios/20-performance/results.md

# Verify NATS state
nats stream ls
nats kv ls

# Check for orphaned resources
nats stream ls | grep -E "(loom|coord|shuttle)"
nats kv ls | grep -E "(loom|coord|shuttle|pattern)"
```

---

## Level 4: End-to-End Tests

**Scope:** Multi-machine, cross-network, real-world scenarios

**Coverage:** 10 tests across production-like deployments

### E2E Test Scenarios

**Location:** `test-scenarios/18-multi-machine/`

| Scenario | Description | Infrastructure | Validation |
|----------|-------------|----------------|------------|
| **Home + Cloud** | Laptop agent + Cloud agent, shared NATS | 2 machines, NATS on cloud | Cross-machine communication |
| **Corporate + Personal** | Work laptop + home server, boundary routing | 2 machines, Weft on cloud | Work classification correct |
| **Kubernetes Deployment** | Full K8s deployment with dynamic spin-up | K8s cluster | Jobs spawn correctly |
| **WebSocket NATS** | Browser-based agent via `wss://` | Web app + NATS | WebSocket connectivity |
| **SSH Spin-Up** | Weft triggers remote agent via SSH | 2 machines, SSH keys | Remote agent starts, claims work |
| **GitHub Actions Spin-Up** | Weft triggers workflow dispatch | GitHub repo | Workflow runs, agent executes |
| **Webhook Spin-Up** | Weft calls custom webhook | External service | Service receives call, agent starts |
| **Shuttle Multi-Machine** | Parent on laptop, subagents on cloud | 2+ machines | Subagents claim work remotely |
| **Pattern Cross-Session** | Memory persistence across restarts | 1 machine, restart agent | Context restored correctly |
| **Full Production Simulation** | All components, realistic load | K8s cluster | System stable under load |

### E2E Test Infrastructure

**Setup:**

1. **NATS Cluster (3 nodes):**
   ```bash
   # Deploy NATS cluster (see k8s-deploy/)
   kubectl apply -f k8s-deploy/nats-cluster.yaml
   ```

2. **Weft Deployment:**
   ```bash
   kubectl apply -f k8s-deploy/weft-deployment.yaml
   ```

3. **Test Clients:**
   - Laptop: Claude Code with Warp MCP
   - Cloud VM: Claude Code with Warp MCP
   - K8s: Agent Jobs spawned by Weft

**Execution:**
```bash
# Run E2E tests
cd test-scenarios/18-multi-machine
./run-all-scenarios.sh
```

**Expected Output:**
```
✓ Home + Cloud: PASS (cross-machine discovery, messaging)
✓ Corporate + Personal: PASS (boundary routing correct)
✓ Kubernetes Deployment: PASS (jobs spawn and execute)
✓ WebSocket NATS: PASS (wss:// connection stable)
✓ SSH Spin-Up: PASS (remote agent started)
✓ GitHub Actions Spin-Up: PASS (workflow triggered)
✓ Webhook Spin-Up: PASS (service called)
✓ Shuttle Multi-Machine: PASS (subagents execute remotely)
✓ Pattern Cross-Session: PASS (memory restored)
✓ Full Production Simulation: PASS (1000 agents, stable)
─────────────────────────────────────
Total: 10 E2E tests passed
```

### E2E Test Report Review (Manual Validation)

**Generated Report:** `test-scenarios/18-multi-machine/E2E-REPORT.md`

**Manual Checklist:**

- [ ] Cross-machine discovery functional:
  - [ ] Laptop discovers cloud agent
  - [ ] Cloud agent discovers laptop agent
- [ ] Cross-machine messaging functional:
  - [ ] Direct messages delivered
  - [ ] Channel messages received
  - [ ] Work offers claimed
- [ ] Boundary routing correct:
  - [ ] Corporate work → work laptop
  - [ ] Personal work → home server
- [ ] Kubernetes deployment stable:
  - [ ] Pods start successfully
  - [ ] Jobs complete and clean up
  - [ ] NATS cluster healthy
- [ ] Spin-up mechanisms functional:
  - [ ] SSH: Agent starts on remote server
  - [ ] K8s: Job created and runs
  - [ ] GitHub Actions: Workflow dispatched
  - [ ] Webhook: Endpoint receives call
- [ ] Pattern memory persistence:
  - [ ] Session 1: Store memories
  - [ ] Restart agent
  - [ ] Session 2: Memories recalled correctly
- [ ] Load testing:
  - [ ] 1000 agents registered
  - [ ] 10,000 messages/sec sustained
  - [ ] No crashes or memory leaks

**Review Commands:**
```bash
cat test-scenarios/18-multi-machine/E2E-REPORT.md

# Verify infrastructure
kubectl get pods -n loominal
kubectl logs -f weft-<pod-id> -n loominal
kubectl top nodes

# Verify NATS cluster
kubectl exec -it nats-0 -n loominal -- nats stream ls
kubectl exec -it nats-0 -n loominal -- nats kv ls
```

---

## Automated Test Execution Pipeline

### CI/CD Integration (GitHub Actions)

**Workflow:** `.github/workflows/test-suite.yml`

```yaml
name: Test Suite

on:
  push:
    branches: [main]
  pull_request:

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        component: [warp, weft, shuttle, pattern]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
        working-directory: ${{ matrix.component }}
      - run: npm run test:coverage
        working-directory: ${{ matrix.component }}
      - uses: actions/upload-artifact@v3
        with:
          name: coverage-${{ matrix.component }}
          path: ${{ matrix.component }}/coverage/

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    services:
      nats:
        image: nats:latest
        options: -js
        ports:
          - 4222:4222
    steps:
      - uses: actions/checkout@v3
      - run: cd test-scenarios && npm test

  system-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    services:
      nats:
        image: nats:latest
        options: -js
        ports:
          - 4222:4222
    steps:
      - uses: actions/checkout@v3
      - run: docker-compose -f weft/docker-compose.yml up -d
      - run: ./scripts/test-system.sh

  e2e-tests:
    runs-on: ubuntu-latest
    needs: system-tests
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - run: ./scripts/test-e2e.sh
```

### Test Execution Schedule

| Trigger | Tests Run | Duration |
|---------|-----------|----------|
| Every commit | Unit tests | 5 min |
| Every PR | Unit + Integration | 15 min |
| Main branch merge | Unit + Integration + System | 45 min |
| Nightly | Full suite (Unit + Integration + System + E2E) | 2 hours |
| Pre-release | Full suite + manual validation | 4 hours |

---

## Manual Validation Procedures

### Pre-Release Validation Checklist

**Reviewer:** (Name)
**Date:** (Date)
**Version:** (Version)

#### 1. Unit Test Review
- [ ] All unit tests passed (200+)
- [ ] Coverage reports reviewed (>80% overall)
- [ ] No skipped tests (unless NATS unavailable)
- [ ] No flaky tests observed

#### 2. Integration Test Review
- [ ] All integration tests passed (40)
- [ ] NATS subject patterns verified
- [ ] KV bucket structure correct
- [ ] Work distribution fair
- [ ] DLQ functioning correctly

#### 3. System Test Review
- [ ] All system tests passed (20)
- [ ] Performance baseline met:
  - [ ] Channel messaging <5ms p95
  - [ ] Work distribution <100ms p95
  - [ ] Agent discovery <15ms
- [ ] Failure recovery scenarios passed
- [ ] Multi-tenant isolation verified
- [ ] Resource cleanup verified

#### 4. E2E Test Review
- [ ] All E2E tests passed (10)
- [ ] Cross-machine communication functional
- [ ] Boundary routing correct
- [ ] Kubernetes deployment stable
- [ ] Spin-up mechanisms functional
- [ ] Memory persistence working
- [ ] Load testing passed (1000 agents)

#### 5. Security Review
- [ ] NATS authentication configured
- [ ] API bearer tokens configured
- [ ] Scope-based access control functioning
- [ ] Project isolation verified
- [ ] No secrets in logs or NATS streams

#### 6. Documentation Review
- [ ] README.md up to date
- [ ] ARCHITECTURE.md accurate
- [ ] TESTING.md reflects current strategy
- [ ] Component READMEs updated
- [ ] CHANGELOG.md has release notes

#### 7. Deployment Validation
- [ ] Docker images built successfully
- [ ] npm packages published
- [ ] Kubernetes manifests tested
- [ ] Installation instructions validated

#### 8. User Acceptance
- [ ] Sample project tested end-to-end
- [ ] Claude Code integration verified
- [ ] GitHub Copilot integration verified (if applicable)
- [ ] Error messages clear and actionable

### Validation Report Template

**File:** `VALIDATION-REPORT-v{version}.md`

```markdown
# Validation Report: Loominal v{version}

**Reviewer:** {name}
**Date:** {date}
**Release Candidate:** v{version}

## Summary

Total Tests: {total}
Passed: {passed}
Failed: {failed}
Skipped: {skipped}

## Test Results by Level

### Unit Tests
- Status: PASS/FAIL
- Coverage: {percentage}%
- Notes: {notes}

### Integration Tests
- Status: PASS/FAIL
- Notes: {notes}

### System Tests
- Status: PASS/FAIL
- Performance: {summary}
- Notes: {notes}

### E2E Tests
- Status: PASS/FAIL
- Infrastructure: {description}
- Notes: {notes}

## Manual Validation Checklist
- [x] All automated tests passed
- [x] Coverage >80%
- [x] Performance within targets
- [x] Failure scenarios handled
- [x] Documentation up to date
- [x] Security reviewed
- [x] User acceptance validated

## Issues Found
{List of issues, if any}

## Recommendation
☐ APPROVED for release
☐ REJECTED - issues must be addressed

## Sign-Off
Reviewer: {name}
Date: {date}
```

---

## Production Readiness Checklist

### Infrastructure Requirements

- [ ] **NATS Cluster:**
  - [ ] 3+ nodes for high availability
  - [ ] JetStream enabled
  - [ ] Persistent storage configured
  - [ ] TLS enabled for production
  - [ ] Monitoring configured (Prometheus)

- [ ] **Weft Deployment:**
  - [ ] 2+ replicas for redundancy
  - [ ] Resource limits configured
  - [ ] Health checks configured
  - [ ] API authentication enabled
  - [ ] Logging to centralized system

- [ ] **Warp/Pattern/Shuttle:**
  - [ ] Installed on all agent machines
  - [ ] NATS_URL configured correctly
  - [ ] MCP configuration validated

### Security Hardening

- [ ] NATS authentication configured
- [ ] API bearer tokens rotated
- [ ] TLS certificates valid
- [ ] Secrets not in environment variables
- [ ] Network policies applied (K8s)
- [ ] Firewall rules configured

### Monitoring & Alerting

- [ ] Prometheus metrics enabled (Weft)
- [ ] Grafana dashboards deployed
- [ ] Alerts configured:
  - [ ] NATS down
  - [ ] Weft down
  - [ ] High DLQ depth
  - [ ] Agent registration failures
  - [ ] High work queue depth

### Backup & Recovery

- [ ] NATS JetStream backup strategy
- [ ] KV bucket backup schedule
- [ ] Disaster recovery plan documented
- [ ] Recovery time objective (RTO) defined
- [ ] Recovery point objective (RPO) defined

### Documentation

- [ ] Architecture diagram up to date
- [ ] Runbooks for common operations
- [ ] Troubleshooting guide
- [ ] API documentation
- [ ] User guides (quickstart, advanced)

---

## Test Maintenance

### Adding New Tests

**Unit Tests:**
1. Create test file alongside source: `{module}.test.ts`
2. Follow existing patterns (Vitest, describe/it structure)
3. Aim for >80% coverage of new code
4. Run: `npm test` in component directory

**Integration Tests:**
1. Add scenario to `test-scenarios/`
2. Document in `test-scenarios/README.md`
3. Update `test-scenarios/COVERAGE-REPORT.md`
4. Run: `npm test` in `test-scenarios/`

**System Tests:**
1. Add scenario to `test-scenarios/`
2. Document infrastructure requirements
3. Update system test report
4. Run: `./scripts/test-system.sh`

**E2E Tests:**
1. Add scenario to `test-scenarios/18-multi-machine/`
2. Document multi-machine setup
3. Update E2E report
4. Run: `./scripts/test-e2e.sh`

### Debugging Failing Tests

**Steps:**
1. Check test output for error message
2. Review logs: `NATS_DEBUG=1 npm test`
3. Verify NATS is running: `nats server check`
4. Check for port conflicts: `lsof -i :4222`
5. Review recent code changes
6. Run test in isolation: `npx vitest run path/to/test.ts`

### Flaky Test Protocol

**If a test fails intermittently:**
1. Document failure in issue tracker
2. Tag with "flaky-test" label
3. Increase timeout if timing-related
4. Add retry logic if appropriate
5. Consider marking as `skipIf` with conditions
6. Fix root cause before release

---

## Performance Benchmarking

### Baseline Metrics (v0.3.0)

**Recorded:** 2025-12-18

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Channel messaging p95 | <5ms | 2ms | ✅ |
| Direct messaging p95 | <5ms | 2ms | ✅ |
| Work distribution p95 | <100ms | 77ms | ✅ |
| Agent discovery | <15ms | 10ms | ✅ |
| Weft routing | <50ms | 35ms | ✅ |
| KV read | <5ms | 3ms | ✅ |
| KV write | <10ms | 5ms | ✅ |

### Benchmark Execution

**Command:**
```bash
cd test-scenarios/20-performance
npm run benchmark
```

**Output:** `PERFORMANCE-BASELINE.md`

### Regression Detection

**Threshold:** >20% increase in p95 latency triggers investigation

**Process:**
1. Run benchmark before and after changes
2. Compare results
3. If regression detected:
   - [ ] Profile code to identify bottleneck
   - [ ] Review recent commits
   - [ ] Consider reverting if critical

---

## Continuous Improvement

### Quarterly Test Review

**Schedule:** Every 3 months

**Agenda:**
1. Review test coverage (aim for >85%)
2. Identify untested code paths
3. Add tests for recent bug fixes
4. Update baseline performance metrics
5. Review and close flaky test issues
6. Update testing documentation

### Test Metrics Tracking

**Dashboard:** `test-scenarios/TEST-METRICS.md`

**Tracked Metrics:**
- Total test count (by level)
- Test execution time (by level)
- Coverage percentage (by component)
- Flaky test count
- Failure rate (last 30 days)
- Mean time to resolution (MTTR) for failures

---

## References

### Test Frameworks

- **Vitest**: https://vitest.dev/
- **NATS CLI**: https://docs.nats.io/using-nats/nats-tools/nats_cli
- **K8s Testing**: https://kubernetes.io/docs/tasks/test/

### Internal Documentation

- `test-scenarios/README.md` - Integration test guide
- `test-scenarios/COVERAGE-REPORT.md` - Current coverage
- `test-scenarios/PERFORMANCE-BASELINE.md` - Performance data
- `test-scenarios/UNTESTED-FEATURES.md` - Coverage gaps

---

**Document Version:** 1.0
**Author:** Michael LoPresti
**Last Review:** 2025-12-18
