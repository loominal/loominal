# Test Data Specification

This document defines standard test data for integration testing scenarios. Using consistent test data ensures reproducible results and clearer debugging.

---

## Agent Configurations

### Standard Test Agents

| Handle | Agent Type | Capabilities | Classification | Notes |
|--------|------------|--------------|----------------|-------|
| `test-alpha` | developer | ["typescript", "testing"] | personal | Primary test agent |
| `test-beta` | developer | ["typescript", "python"] | personal | Secondary test agent |
| `test-gamma` | reviewer | ["code-review"] | personal | Third agent for multi-agent tests |
| `corp-agent` | developer | ["typescript"] | corporate | Corporate-approved agent |
| `worker-a` | worker | ["general"] | personal | Competing consumer tests |
| `worker-b` | worker | ["general"] | personal | Competing consumer tests |
| `worker-c` | worker | ["general"] | personal | Competing consumer tests |

### Registration Payloads

```json
{
  "test-alpha": {
    "agentType": "developer",
    "capabilities": ["typescript", "testing"],
    "visibility": "project-only"
  },
  "test-beta": {
    "agentType": "developer",
    "capabilities": ["typescript", "python"],
    "visibility": "project-only"
  },
  "test-gamma": {
    "agentType": "reviewer",
    "capabilities": ["code-review"],
    "visibility": "project-only"
  }
}
```

---

## Direct Messaging Test Data

### REQ-DM: Direct Messaging Tests

#### Simple Text Message
```json
{
  "recipientGuid": "{{TARGET_AGENT_GUID}}",
  "message": "Test message from integration test",
  "messageType": "text"
}
```

#### Work Offer Message
```json
{
  "recipientGuid": "{{TARGET_AGENT_GUID}}",
  "message": "New task available: implement feature X",
  "messageType": "work-offer",
  "metadata": {
    "taskId": "task-dm-001",
    "priority": 5,
    "capability": "typescript"
  }
}
```

#### Status Update Message
```json
{
  "recipientGuid": "{{TARGET_AGENT_GUID}}",
  "message": "Task task-001 completed successfully",
  "messageType": "status",
  "metadata": {
    "taskId": "task-001",
    "status": "completed",
    "duration": 45000
  }
}
```

#### Batch Messages (for ordering tests)
```json
[
  {"message": "Message 1 of 10", "messageType": "text"},
  {"message": "Message 2 of 10", "messageType": "text"},
  {"message": "Message 3 of 10", "messageType": "text"},
  {"message": "Message 4 of 10", "messageType": "text"},
  {"message": "Message 5 of 10", "messageType": "text"},
  {"message": "Message 6 of 10", "messageType": "text"},
  {"message": "Message 7 of 10", "messageType": "text"},
  {"message": "Message 8 of 10", "messageType": "text"},
  {"message": "Message 9 of 10", "messageType": "text"},
  {"message": "Message 10 of 10", "messageType": "text"}
]
```

---

## Dead Letter Queue Test Data

### REQ-DLQ: Dead Letter Queue Tests

#### Work Item That Will Fail
```json
{
  "taskId": "dlq-test-001",
  "description": "Task designed to fail for DLQ testing",
  "requiredCapability": "failing-worker",
  "priority": 5,
  "contextData": {
    "shouldFail": true,
    "failureReason": "Intentional failure for testing"
  }
}
```

#### Multiple DLQ Test Items
```json
[
  {
    "taskId": "dlq-batch-001",
    "description": "First failing task",
    "requiredCapability": "failing-worker",
    "priority": 3
  },
  {
    "taskId": "dlq-batch-002",
    "description": "Second failing task",
    "requiredCapability": "failing-worker",
    "priority": 5
  },
  {
    "taskId": "dlq-batch-003",
    "description": "Third failing task",
    "requiredCapability": "failing-worker",
    "priority": 7
  }
]
```

---

## Work Distribution Test Data

### REQ-ROUTE: Work Routing Tests

#### TypeScript Work Item
```json
{
  "taskId": "route-ts-001",
  "description": "Implement TypeScript utility function",
  "requiredCapability": "typescript",
  "classification": "personal",
  "priority": 5,
  "contextData": {
    "repo": "test-repo",
    "file": "src/utils.ts"
  }
}
```

#### Python Work Item
```json
{
  "taskId": "route-py-001",
  "description": "Fix Python data processing script",
  "requiredCapability": "python",
  "classification": "personal",
  "priority": 5,
  "contextData": {
    "repo": "test-repo",
    "file": "scripts/process.py"
  }
}
```

#### Corporate Work Item
```json
{
  "taskId": "route-corp-001",
  "description": "Corporate compliance task",
  "requiredCapability": "typescript",
  "classification": "corporate",
  "priority": 8,
  "contextData": {
    "compliance": true,
    "sensitive": true
  }
}
```

#### High Priority Work Item
```json
{
  "taskId": "route-urgent-001",
  "description": "Critical production fix",
  "requiredCapability": "typescript",
  "classification": "personal",
  "priority": 10,
  "deadline": "2025-12-31T23:59:59Z"
}
```

---

## Registry Test Data

### REQ-REG: Registry Tests

#### Visibility Test Agents
```json
{
  "private-agent": {
    "agentType": "developer",
    "capabilities": ["typescript"],
    "visibility": "private"
  },
  "user-only-agent": {
    "agentType": "developer",
    "capabilities": ["typescript"],
    "visibility": "user-only"
  },
  "public-agent": {
    "agentType": "developer",
    "capabilities": ["typescript"],
    "visibility": "public"
  }
}
```

#### Presence Update Payloads
```json
{
  "status-busy": {
    "status": "busy"
  },
  "status-offline": {
    "status": "offline"
  },
  "task-count-update": {
    "currentTaskCount": 5
  },
  "capability-update": {
    "capabilities": ["typescript", "python", "rust"]
  }
}
```

---

## Channel Messaging Test Data

### Standard Channel Messages

#### Roadmap Channel Message
```json
{
  "channel": "roadmap",
  "message": "Starting work on feature X"
}
```

#### Parallel Work Channel Message
```json
{
  "channel": "parallel-work",
  "message": "Claiming task-001 for implementation"
}
```

#### Error Channel Message
```json
{
  "channel": "errors",
  "message": "Error in task-001: Connection timeout after 30s"
}
```

---

## Target Registry Test Data

### REQ-TARGET: Target Registry Tests

#### Local Target Configuration
```json
{
  "name": "local-claude",
  "mechanism": "local",
  "config": {
    "command": "claude",
    "args": ["--mcp", "@loom/warp"],
    "cwd": "/home/user/project",
    "env": {
      "NATS_URL": "nats://localhost:4222"
    }
  },
  "capabilities": ["typescript", "testing"],
  "enabled": true
}
```

#### SSH Target Configuration
```json
{
  "name": "remote-agent",
  "mechanism": "ssh",
  "config": {
    "host": "agent-server.example.com",
    "user": "agent",
    "keyPath": "~/.ssh/agent_key",
    "command": "claude --mcp @loom/warp"
  },
  "capabilities": ["typescript"],
  "enabled": true
}
```

---

## End-to-End Test Data

### REQ-E2E: End-to-End Tests

#### Full Workflow Work Item
```json
{
  "taskId": "e2e-full-001",
  "description": "End-to-end test: Fix bug in authentication module",
  "requiredCapability": "typescript",
  "classification": "personal",
  "priority": 5,
  "contextData": {
    "repo": "loom-warp",
    "issue": "#42",
    "expectedDuration": 300000
  }
}
```

#### Multi-Machine Test Item
```json
{
  "taskId": "e2e-multi-001",
  "description": "Cross-machine coordination test",
  "requiredCapability": "general",
  "classification": "personal",
  "priority": 5,
  "contextData": {
    "testType": "multi-machine",
    "machines": ["machine-a", "machine-b"]
  }
}
```

---

## Test Constants

### Timeouts
| Operation | Timeout | Notes |
|-----------|---------|-------|
| Agent registration | 5000ms | Should complete quickly |
| Message delivery | 2000ms | Direct or channel message |
| Work claim | 5000ms | Including routing time |
| DLQ appearance | 30000ms | After 3 failed attempts |
| Heartbeat timeout | 30000ms | Default stale detection |
| Idle timeout | 60000ms | For idle detection tests |

### Retry Configuration
| Operation | Max Retries | Backoff |
|-----------|-------------|---------|
| NATS reconnect | 10 | Exponential (1s, 2s, 4s... max 30s) |
| Work delivery | 3 | Immediate |
| API calls | 3 | Linear (1s) |

### Project IDs for Testing
| Project | ID | Notes |
|---------|-----|-------|
| Default test project | `0123456789abcdef` | Primary test project |
| Secondary project | `fedcba9876543210` | For multi-tenant tests |

---

## Usage Notes

1. **Variable Substitution**: Replace `{{VARIABLE}}` placeholders with actual values at test time
2. **GUIDs**: Agent GUIDs are assigned at registration time - capture and store them
3. **Timestamps**: All timestamps should be ISO 8601 format
4. **Idempotency**: Task IDs should be unique per test run - consider adding timestamp suffix
5. **Cleanup**: Tests should clean up resources (deregister agents, discard DLQ items) after completion
