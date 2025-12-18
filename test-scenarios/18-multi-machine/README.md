# Phase 8.1: Multi-Machine Integration Tests

Tests communication between agents and services running on different "machines" (simulated via Docker containers).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Network: loom-network             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐                                        │
│  │   Machine A     │                                        │
│  │  (Server)       │                                        │
│  │                 │                                        │
│  │  ┌───────────┐  │                                        │
│  │  │   NATS    │◄─┼────────────────────────────────────┐   │
│  │  │  :4222    │  │                                    │   │
│  │  └───────────┘  │                                    │   │
│  │                 │                                    │   │
│  │  ┌───────────┐  │                                    │   │
│  │  │   Weft    │  │                                    │   │
│  │  │  :3000    │  │                                    │   │
│  │  └───────────┘  │                                    │   │
│  └─────────────────┘                                    │   │
│                                                         │   │
│  ┌─────────────────┐      ┌─────────────────┐          │   │
│  │   Machine B     │      │   Machine C     │          │   │
│  │  (Client 1)     │      │  (Client 2)     │          │   │
│  │                 │      │                 │          │   │
│  │  ┌───────────┐  │      │  ┌───────────┐  │          │   │
│  │  │  Agent 1  │──┼──────┼──┤  Agent 2  │──┼──────────┘   │
│  │  │  (Warp)   │  │      │  │  (Warp)   │  │              │
│  │  └───────────┘  │      │  └───────────┘  │              │
│  │                 │      │                 │              │
│  │                 │      │  ┌───────────┐  │              │
│  │                 │      │  │  Shuttle  │  │              │
│  │                 │      │  │  (CLI)    │──┼─► Weft API   │
│  │                 │      │  └───────────┘  │              │
│  └─────────────────┘      └─────────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Start the multi-machine environment
docker-compose up -d

# Wait for services to be healthy (about 30s)
docker-compose ps

# Run the tests
node test-multi-machine.mjs

# Clean up
docker-compose down -v
```

## Test Scenarios

### REQ-MULTI-001: Cross-Machine Agent Communication
- Agent on Machine B registers via shared NATS
- Agent on Machine C registers via shared NATS
- Agents discover each other via registry
- Channel messages are visible across machines

### REQ-MULTI-002: Weft Server / Agent Clients
- Weft sees agents from both client machines
- Work routing functions across machines

### REQ-MULTI-003: Shuttle Controls Remote Weft
- Shuttle on Machine C can list agents on remote Weft
- Shuttle on Machine C can view stats on remote Weft
- Shuttle on Machine C can submit work to remote Weft

## Manual Testing

### From Machine B (agent1 container):
```bash
docker exec -it multi-agent1 sh
cd /app
# Run Warp commands...
```

### From Machine C (agent2 container):
```bash
docker exec -it multi-agent2 sh

# Test Warp
cd /app
# Run Warp commands...

# Test Shuttle
cd /shuttle
LOOM_API_URL=http://weft:3000 node dist/index.js agents list
```

### Check NATS:
```bash
# View NATS monitoring
curl http://localhost:8222/varz
curl http://localhost:8222/connz
```

## Troubleshooting

### Containers not starting
```bash
docker-compose logs -f
```

### NATS connection issues
```bash
docker exec multi-agent1 nc -zv nats 4222
```

### Weft not accessible
```bash
docker exec multi-agent2 wget -qO- http://weft:3000/health
```
