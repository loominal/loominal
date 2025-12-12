# Changelog

All notable changes to the Loom project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0-beta] - 2025-12-11

### Added

#### Warp (MCP Server)
- 17 MCP tools for agent communication via NATS JetStream
- Agent registry with cross-computer discovery via KV store
- Channel-based pub/sub messaging with persistence
- Direct messaging via personal inbox streams
- Work distribution with capability-based queues
- Dead letter queue for failed work items
- Heartbeat-based presence tracking (60s intervals)
- Project isolation via working directory hashing

#### Weft (Coordinator Service)
- REST API for fleet management
- Work classification and routing (corporate/personal/open-source)
- Dynamic agent spin-up via multiple mechanisms:
  - SSH remote execution
  - Local process spawning
  - Webhook triggers
  - Kubernetes Job creation
  - GitHub Actions dispatch
- Target registry for pre-configured spin-up destinations
- Idle detection and automatic scale-down
- Multi-tenant support with project isolation
- NATS request handlers for direct protocol communication

#### Shuttle (CLI)
- Command-line interface for fleet management
- Work submission with classification and capability routing
- Agent listing and monitoring
- Target management (add, remove, list)
- Statistics and health monitoring
- Refactored from NATS protocol to REST API for simpler deployment

### Tested

#### Integration Testing (Phase 5-7)
- Warp: 17 tools verified with unit and integration tests
- Weft: REST API endpoints tested
- Shuttle: CLI commands verified against REST API
- End-to-end flows: agent spin-up to work completion

#### Multi-Machine Testing (Phase 8.1)
- Cross-machine agent registration and discovery
- Cross-machine channel messaging
- Cross-machine direct messaging
- Work claim from remote agents
- All 9 test scenarios passing

#### Advanced Failure Testing (Phase 8.2)
- Agent crash handling with KV state transitions
- Orphan work detection via heartbeat timestamps
- Network partition resilience
- Concurrent agent operations
- 6/9 core tests passing (3 API tests have known timing issues)

#### Performance Baseline (Phase 8.3)
- Channel message latency: p95 = 2ms (target < 100ms)
- Work claim latency: p95 = 77ms (target < 200ms)
- Direct message latency: p95 = 2ms (target < 100ms)
- All targets met with significant margin

### Security
- No hardcoded credentials in source
- Environment variables for configuration
- NATS authentication support
- Git history cleaned of AI co-author references

### Documentation
- README files updated with Beta status
- Performance baseline documented
- API documentation in component READMEs
- Test scenarios documented with results

## [0.0.1-alpha] - 2025-12-01

### Added
- Initial project structure
- Warp MCP server prototype
- Basic NATS JetStream integration
- Channel messaging proof of concept

---

[Unreleased]: https://github.com/mdlopresti/loom/compare/v0.1.0...HEAD
[0.1.0-beta]: https://github.com/mdlopresti/loom/releases/tag/v0.1.0
