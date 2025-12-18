# Missing REST API Endpoints - Quick Reference

This document provides documentation-ready descriptions for the 10 REST API endpoints that are implemented but not currently documented in the Weft README.

---

## Agent Management

### POST /api/agents/:guid/shutdown

Request graceful or immediate shutdown of an agent.

**Request Body**:
```json
{
  "graceful": true
}
```

**Parameters**:
- `graceful` (boolean, optional): Wait for current work to complete. Default: true

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Shutdown request sent to agent abc-123-def",
  "graceful": true
}
```

**Error Responses**:
- 400: Agent GUID is required
- 404: Agent with GUID not found

**Example**:
```bash
curl -X POST http://localhost:3000/api/agents/abc-123-def/shutdown \
  -H "Content-Type: application/json" \
  -d '{"graceful": true}'
```

---

## Work Management

### POST /api/work/:id/cancel

Cancel a pending or in-progress work item.

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Work item task-456 cancelled"
}
```

**Error Responses**:
- 400: Work item ID is required
- 404: Work item with ID not found

**Example**:
```bash
curl -X POST http://localhost:3000/api/work/task-456/cancel
```

---

## Target Management

### GET /api/targets/:id

Get details of a specific spin-up target by ID or name.

**Response** (200 OK):
```json
{
  "id": "target-123",
  "name": "home-server",
  "agentType": "claude-code",
  "mechanism": "ssh",
  "capabilities": ["typescript", "python"],
  "boundaries": ["personal", "open-source"],
  "enabled": true,
  "healthStatus": "healthy",
  "config": {
    "mechanism": "ssh",
    "host": "192.168.1.100",
    "user": "developer"
  }
}
```

**Error Responses**:
- 400: Target ID or name is required
- 404: Target with ID or name not found

**Example**:
```bash
curl http://localhost:3000/api/targets/home-server
```

---

### PUT /api/targets/:id

Update target configuration.

**Request Body** (partial updates supported):
```json
{
  "capabilities": ["typescript", "python", "rust"],
  "boundaries": ["personal"],
  "config": {
    "host": "192.168.1.101"
  }
}
```

**Response** (200 OK):
```json
{
  "id": "target-123",
  "name": "home-server",
  "agentType": "claude-code",
  "mechanism": "ssh",
  "capabilities": ["typescript", "python", "rust"],
  "boundaries": ["personal"],
  "enabled": true,
  "config": {
    "mechanism": "ssh",
    "host": "192.168.1.101",
    "user": "developer"
  }
}
```

**Error Responses**:
- 400: Target ID or name is required, or invalid boundaries
- 404: Target with ID or name not found

**Example**:
```bash
curl -X PUT http://localhost:3000/api/targets/home-server \
  -H "Content-Type: application/json" \
  -d '{"capabilities": ["typescript", "python", "rust"]}'
```

---

### DELETE /api/targets/:id

Remove a target from the registry.

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Target home-server removed"
}
```

**Error Responses**:
- 400: Target ID or name is required
- 404: Target with ID or name not found

**Example**:
```bash
curl -X DELETE http://localhost:3000/api/targets/home-server
```

---

### POST /api/targets/:id/test

Run health check on a target.

**Response** (200 OK):
```json
{
  "targetId": "target-123",
  "targetName": "home-server",
  "healthy": true,
  "timestamp": "2025-12-10T12:00:00Z",
  "details": {
    "latency": 45,
    "message": "SSH connection successful"
  }
}
```

**Error Responses**:
- 400: Target ID or name is required
- 404: Target with ID or name not found
- 500: Health check execution failed

**Example**:
```bash
curl -X POST http://localhost:3000/api/targets/home-server/test
```

---

### POST /api/targets/:id/spin-up

Manually trigger spin-up for a target (bypass automatic spin-up logic).

**Response** (200 OK):
```json
{
  "targetId": "target-123",
  "targetName": "home-server",
  "spinUpTriggered": true,
  "timestamp": "2025-12-10T12:00:00Z",
  "message": "Spin-up initiated for target home-server"
}
```

**Error Responses**:
- 400: Target ID or name is required
- 404: Target with ID or name not found
- 500: Spin-up execution failed

**Example**:
```bash
curl -X POST http://localhost:3000/api/targets/home-server/spin-up
```

---

### POST /api/targets/:id/disable

Disable a target (prevent it from being used for spin-up).

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Target home-server disabled"
}
```

**Error Responses**:
- 400: Target ID or name is required
- 404: Target with ID or name not found

**Example**:
```bash
curl -X POST http://localhost:3000/api/targets/home-server/disable
```

---

### POST /api/targets/:id/enable

Enable a previously disabled target.

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Target home-server enabled"
}
```

**Error Responses**:
- 400: Target ID or name is required
- 404: Target with ID or name not found

**Example**:
```bash
curl -X POST http://localhost:3000/api/targets/home-server/enable
```

---

## Statistics (Multi-Tenant)

### GET /api/stats/projects

List all active projects in multi-tenant mode.

**Response** (200 OK):
```json
{
  "timestamp": "2025-12-10T12:00:00Z",
  "projects": [
    "default",
    "my-app",
    "other-app"
  ],
  "count": 3
}
```

**Notes**:
- In single-tenant mode, returns only the default project
- Projects are auto-discovered when agents connect

**Example**:
```bash
curl http://localhost:3000/api/stats/projects
```

---

## Suggested README Update

Add this table to replace the current REST API section:

```markdown
## REST API

Weft exposes a comprehensive REST API for integration:

### Health

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |

### Agents

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents` | GET | List registered agents |
| `/api/agents/:guid` | GET | Get agent details |
| `/api/agents/:guid/shutdown` | POST | Request agent shutdown |

### Work

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/work` | GET | List work items |
| `/api/work` | POST | Submit work |
| `/api/work/:id` | GET | Get work item details |
| `/api/work/:id/cancel` | POST | Cancel work item |

### Targets

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/targets` | GET | List all spin-up targets |
| `/api/targets` | POST | Register new target |
| `/api/targets/:id` | GET | Get target details |
| `/api/targets/:id` | PUT | Update target |
| `/api/targets/:id` | DELETE | Remove target |
| `/api/targets/:id/test` | POST | Health check target |
| `/api/targets/:id/spin-up` | POST | Manually trigger spin-up |
| `/api/targets/:id/disable` | POST | Disable target |
| `/api/targets/:id/enable` | POST | Enable target |

### Statistics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stats` | GET | Coordinator statistics |
| `/api/stats/projects` | GET | List active projects (multi-tenant) |

For detailed request/response examples, see [API Reference](API.md).
```

---

## Additional Sections to Add to README

### Security

```markdown
## Security

### API Authentication

Weft supports optional bearer token authentication. Set the `API_TOKENS` environment variable with comma-separated tokens:

```bash
API_TOKENS=token1,token2,token3
```

Include the token in API requests:

```bash
curl -H "Authorization: Bearer token1" http://localhost:3000/api/agents
```

### NATS Security

For production deployments, configure NATS with authentication:

```bash
NATS_URL=nats://user:password@nats.example.com:4222
```

### SSH Keys for Spin-Up

When using SSH spin-up mechanism, ensure:
- SSH keys are available in the Weft container
- Private keys are mounted read-only
- Use dedicated spin-up service accounts with limited permissions
```

### Known Limitations

```markdown
## Known Limitations

**Beta Software**: This project is in beta. While core functionality is stable, there may be edge cases and evolving features.

### Multi-Tenant Mode
- Project auto-discovery is new and may have edge cases
- Cross-project agent visibility is limited by design

### Spin-Up Mechanisms
- **SSH**: Requires key-based authentication (password auth not supported)
- **Kubernetes**: Requires cluster access and service account configured
- **GitHub Actions**: Rate limits apply to workflow dispatch API

### Performance
- Designed for fleets up to 100 agents (larger fleets untested)
- NATS message delivery typically <100ms on local networks
- REST API responses typically <200ms for simple queries
```

---

## Notes for Implementer

1. **Copy REST API table** from "Suggested README Update" section above
2. **Copy Security section** to add API_TOKENS documentation
3. **Copy Known Limitations** to set user expectations
4. **Fix Docker Compose path** (line 76): `coordinator-system` → `weft`
5. **Clarify NATS reconnect** behavior or implement exponential backoff

These changes will bring REST API documentation coverage from 47% to 100%.
