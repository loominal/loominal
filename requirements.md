# NATS MCP Server Requirements Specification

## 1. Introduction

### 1.1 Purpose

This document specifies the requirements for a generalized NATS MCP (Model Context Protocol) Server that enables agent-to-agent communication across Claude Code projects. The NATS MCP Server is a reusable, user-level component that provides persistent, channel-based messaging capabilities to facilitate coordination among AI agents working on software development tasks.

**Example Application Name:** `nats-mcp-server`

### 1.2 Scope

This specification defines:

**Included:**
- MCP server implementation providing agent communication tools
- NATS JetStream integration for message persistence
- Channel-based messaging architecture with configurable channels
- Agent identity management (handles)
- Message history retrieval and filtering
- Project-level and user-level configuration mechanisms
- Installation and distribution as an npm package
- Multi-project support with namespace isolation
- Standard message formats and communication protocols
- Security features including authentication and authorization
- Operational features including logging, monitoring, and error handling

**Excluded:**
- NATS server installation and management (external dependency)
- Agent implementation logic (server provides communication infrastructure only)
- Project-specific workflow orchestration (dispatcher/reporter agents are consumer examples, not part of core server)
- User interface or web dashboard for message visualization
- Message transformation or routing logic beyond basic publish/subscribe

### 1.3 Target Audience

This document is intended for:
- **Software Developers**: Implementing the NATS MCP Server and integrating it into projects
- **DevOps Engineers**: Deploying and configuring NATS infrastructure
- **AI/ML Engineers**: Designing agent coordination workflows
- **Product Managers**: Understanding capabilities and limitations
- **QA Engineers**: Creating test plans and acceptance criteria

The technical detail level assumes familiarity with:
- Model Context Protocol (MCP) architecture
- NATS messaging system and JetStream
- TypeScript/Node.js development
- JSON Schema and configuration management

### 1.4 Definitions and Acronyms

| Term | Definition |
|------|------------|
| **MCP** | Model Context Protocol - a standard protocol for connecting AI models to external tools and data sources |
| **NATS** | Neural Autonomy Messaging System - a high-performance messaging system |
| **JetStream** | NATS persistence layer providing message streaming and storage |
| **Channel** | A named communication stream for related messages (e.g., "roadmap", "parallel-work") |
| **Handle** | A unique identifier for an agent participating in communication (e.g., "project-manager", "tdd-engineer") |
| **Stream** | A JetStream message store associated with one or more subjects |
| **Subject** | A NATS topic identifier used for message routing (e.g., "chat.roadmap") |
| **Consumer** | A JetStream entity that tracks message delivery and acknowledgments |
| **Namespace** | A prefix isolating channels for a specific project or context |
| **Agent** | An AI entity using the MCP server to communicate with other agents |

### 1.5 References

- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io/)
- [NATS Documentation](https://docs.nats.io/)
- [NATS JetStream Guide](https://docs.nats.io/nats-concepts/jetstream)
- [MCP SDK for TypeScript](https://github.com/modelcontextprotocol/typescript-sdk)
- [NATS.js Client Library](https://github.com/nats-io/nats.js)
- Example Implementation: `/var/home/mike/source/agentic-sdlc-class/nats-chat/`

## 2. Goals and Objectives

### 2.1 Business Goals

1. **Reusability**: Create a single MCP server implementation that can be installed once and used across multiple Claude Code projects without duplication
2. **Developer Productivity**: Enable AI agents to coordinate work autonomously, reducing manual coordination overhead
3. **Scalability**: Support multiple concurrent projects and agents without performance degradation
4. **Maintainability**: Provide a well-documented, testable codebase that can be extended and maintained over time
5. **Community Adoption**: Design an open-source-ready component suitable for broader MCP ecosystem adoption

### 2.2 User Goals

1. **Easy Installation**: Users SHOULD be able to install the NATS MCP Server with a single npm command
2. **Simple Configuration**: Users SHOULD be able to configure project-specific channels through a simple configuration file
3. **Transparent Operation**: Users SHOULD understand what agents are doing through readable message logs
4. **Reliable Communication**: Users MUST be confident that messages are persisted and not lost
5. **Troubleshooting**: Users SHOULD be able to diagnose and resolve connection and communication issues independently

### 2.3 Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Installation Time** | < 2 minutes | Time from npm install to first successful message |
| **Message Throughput** | ≥ 1000 messages/second | Load testing with concurrent agents |
| **Message Latency** | < 100ms (p99) | End-to-end publish-to-read latency |
| **Uptime** | ≥ 99.9% during agent operations | Monitoring over 30-day period |
| **Configuration Errors** | < 5% of installations | Telemetry from first-time setup attempts |
| **Documentation Completeness** | 100% of tools documented | All MCP tools have examples and error cases |

## 3. User Stories and Use Cases

### 3.1 User Stories

**US-001: Install MCP Server Globally**
- **As a** developer using Claude Code across multiple projects
- **I want** to install the NATS MCP Server once at the user level
- **So that** all my projects can use agent communication without per-project installation

**Acceptance Criteria:**
- MCP server can be installed via npm globally or to a well-known user directory
- Installation creates a reusable executable or script
- User-level `.claude/mcp.json` configuration references the installation
- Multiple projects can share the same server instance

**US-002: Configure Project-Specific Channels**
- **As a** project maintainer
- **I want** to define custom channel names and purposes in my project configuration
- **So that** agents communicate on channels appropriate to my workflow

**Acceptance Criteria:**
- Project can define channels in a `.mcp-config.json` file
- Channel names, descriptions, and retention policies are configurable
- Server automatically creates JetStream streams for defined channels
- Invalid channel configurations produce clear error messages

**US-003: Isolate Project Communication**
- **As a** developer working on multiple projects simultaneously
- **I want** each project's agent communication to be isolated
- **So that** agents from different projects don't interfere with each other

**Acceptance Criteria:**
- Each project's channels are prefixed with a unique namespace
- Agents can only send/read messages within their project namespace
- Namespace is derived from project path or explicit configuration
- Cross-project communication requires explicit opt-in

**US-004: Send Messages as an Agent**
- **As an** agent (e.g., dispatcher)
- **I want** to send messages to a specific channel with my identity
- **So that** other agents know who communicated and can respond appropriately

**Acceptance Criteria:**
- Agent can set its handle before sending messages
- Messages include handle, content, and timestamp
- Messages are persisted to NATS JetStream
- Send operation provides confirmation or error feedback

**US-005: Read Message History**
- **As an** agent (e.g., reporter)
- **I want** to read recent messages from a channel
- **So that** I can understand current project status and agent activity

**Acceptance Criteria:**
- Agent can retrieve last N messages from any channel (default: 50)
- Messages are returned in chronological order
- Empty channels return a clear "no messages" response
- Configurable message limit (e.g., 10, 50, 100, 1000)

**US-006: Discover Available Channels**
- **As an** agent starting work
- **I want** to see what communication channels are available
- **So that** I know where to send different types of messages

**Acceptance Criteria:**
- `list_channels` tool returns all configured channels
- Each channel includes name and description
- System channels (if any) are distinguished from project channels

**US-007: Handle NATS Connection Failures**
- **As a** user
- **I want** clear error messages when NATS is unavailable
- **So that** I can diagnose and fix connectivity issues

**Acceptance Criteria:**
- Connection failures include actionable error messages
- Error messages indicate if NATS server is not running
- Error messages indicate if JetStream is not enabled
- Retry logic attempts reconnection automatically

**US-008: Monitor Agent Activity**
- **As a** project lead
- **I want** to see which agents are active and what they're communicating
- **So that** I can monitor progress and identify coordination issues

**Acceptance Criteria:**
- Messages are readable with clear formatting
- Timestamps are human-readable
- Agent handles are clearly displayed
- Channel-specific message filtering is available

### 3.2 Use Cases

#### UC-001: Initialize MCP Server for New Project

**Use Case Name:** Initialize NATS MCP Server for New Project

**Actors:** Developer, NATS MCP Server, NATS JetStream

**Preconditions:**
- NATS MCP Server is installed at user level
- NATS server with JetStream is running
- Claude Code project exists

**Basic Flow:**
1. Developer creates `.mcp-config.json` in project root
2. Developer defines project-specific channels (e.g., "planning", "implementation", "review")
3. Developer adds NATS MCP Server to project's `.mcp.json` referencing user-level installation
4. Claude Code starts and initializes MCP server
5. MCP server connects to NATS
6. MCP server creates JetStream streams for each configured channel with project namespace
7. MCP server reports successful initialization
8. Agents can now use communication tools

**Alternative Flows:**
- **2a. No custom channels defined:** Server uses default channels (roadmap, parallel-work, errors)
- **4a. NATS not running:** Server reports connection error with troubleshooting steps, retries periodically
- **6a. Stream already exists:** Server uses existing stream (idempotent initialization)

**Postconditions:**
- Project namespace is established
- All configured channels are ready for messaging
- MCP tools are available to agents

#### UC-002: Agent Claims Work via Channel Message

**Use Case Name:** Agent Claims Work Item via Parallel Work Channel

**Actors:** Dispatcher Agent, Worker Agent, NATS MCP Server

**Preconditions:**
- MCP server is initialized
- Dispatcher agent has analyzed roadmap and identified available work
- Worker agent is spawned and ready

**Basic Flow:**
1. Dispatcher agent sets handle to "dispatcher"
2. Dispatcher agent sends message to "parallel-work" channel: "Dispatching B2.T1 to tdd-workflow-engineer-1"
3. Worker agent sets handle to "tdd-workflow-engineer-1"
4. Worker agent reads messages from "parallel-work" channel
5. Worker agent identifies it was dispatched for B2.T1
6. Worker agent sends claim message: "Claimed B2.T1 - Implementing Recipient model"
7. Worker agent begins implementation
8. Worker agent periodically sends progress updates to channel
9. Worker agent sends completion message: "Completed B2.T1 - All tests passing"

**Alternative Flows:**
- **5a. Multiple workers dispatched:** Each worker claims different tasks based on task ID
- **6a. Work already claimed:** Worker sends message noting duplicate dispatch, takes no action
- **8a. Worker encounters error:** Worker sends message to "errors" channel with details

**Postconditions:**
- Work claim is visible to all agents via message history
- Progress is documented in channel for reporter agent
- Completion triggers dispatcher to evaluate next available work

#### UC-003: Reporter Generates Status Summary

**Use Case Name:** Reporter Agent Generates Project Status Report

**Actors:** Reporter Agent, NATS MCP Server

**Preconditions:**
- MCP server is initialized
- Agents have been communicating on channels
- Roadmap and devlog files exist

**Basic Flow:**
1. Reporter agent sets handle to "reporter"
2. Reporter agent reads roadmap file to get planned work
3. Reporter agent reads messages from "parallel-work" channel (limit: 100)
4. Reporter agent identifies work claims and completion messages
5. Reporter agent reads messages from "errors" channel (limit: 50)
6. Reporter agent reads devlog files for detailed completion information
7. Reporter agent synthesizes status report with:
   - Completed work count
   - In-progress work and assigned agents
   - Errors and blockers
   - Next available work
8. Reporter agent sends summary message to "roadmap" channel
9. Reporter agent presents formatted report to user

**Alternative Flows:**
- **3a. No messages in parallel-work:** Reporter notes "No agent activity recorded"
- **5a. No errors reported:** Reporter notes "No errors logged"
- **6a. No devlog entries:** Reporter notes "No completed work documented"

**Postconditions:**
- User has comprehensive status summary
- Status summary is persisted in "roadmap" channel for historical reference

#### UC-004: Multi-Project Isolation

**Use Case Name:** Developer Works on Two Projects Simultaneously

**Actors:** Developer, MCP Server, Project A Agents, Project B Agents

**Preconditions:**
- MCP server installed at user level
- Two separate Claude Code projects (Project A and Project B)
- NATS server running

**Basic Flow:**
1. Developer opens Project A in Claude Code instance 1
2. MCP server initializes with namespace "project-a" (derived from path)
3. Project A agents communicate on channels: `project-a.roadmap`, `project-a.parallel-work`, `project-a.errors`
4. Developer opens Project B in Claude Code instance 2
5. MCP server initializes with namespace "project-b" (derived from path)
6. Project B agents communicate on channels: `project-b.roadmap`, `project-b.parallel-work`, `project-b.errors`
7. Project A agents cannot see Project B messages
8. Project B agents cannot see Project A messages

**Alternative Flows:**
- **2a. Explicit namespace in config:** Developer sets `namespace: "my-custom-ns"` in `.mcp-config.json`
- **7a. Developer wants cross-project visibility:** Configuration allows opt-in to shared channel (advanced feature)

**Postconditions:**
- Both projects operate independently
- No message cross-contamination
- Each project's communication history is isolated

## 4. Functional Requirements

### 4.1 MCP Tool: set_handle

**REQ-TOOL-001**: The server MUST provide an MCP tool named `set_handle` that allows an agent to establish its identity for subsequent communications.

**REQ-TOOL-002**: The `set_handle` tool MUST accept a single required parameter `handle` of type string representing the agent's identifier.

**REQ-TOOL-003**: The handle SHOULD follow naming conventions: lowercase alphanumeric characters and hyphens only (pattern: `^[a-z0-9-]+$`).

**REQ-TOOL-004**: Setting a handle MUST be idempotent - calling `set_handle` multiple times MUST update the handle to the new value without error.

**REQ-TOOL-005**: The server MUST store the handle in server-side state associated with the MCP connection session.

**REQ-TOOL-006**: The tool MUST return a success response including the confirmed handle value.

**REQ-TOOL-007**: If an invalid handle is provided (e.g., contains uppercase, special characters, or spaces), the tool MUST return an error with validation details.

### 4.2 MCP Tool: get_my_handle

**REQ-TOOL-008**: The server MUST provide an MCP tool named `get_my_handle` that returns the current agent's handle.

**REQ-TOOL-009**: If no handle has been set, the tool MUST return a clear message indicating this state (not an error).

**REQ-TOOL-010**: The tool MUST NOT require any input parameters.

**REQ-TOOL-011**: The returned handle MUST match the most recent value set via `set_handle`.

### 4.3 MCP Tool: send_message

**REQ-TOOL-012**: The server MUST provide an MCP tool named `send_message` that publishes a message to a specified channel.

**REQ-TOOL-013**: The tool MUST require a handle to be set via `set_handle` before allowing message sends.

**REQ-TOOL-014**: If no handle is set, the tool MUST return an error instructing the agent to call `set_handle` first.

**REQ-TOOL-015**: The tool MUST accept two required parameters:
- `channel` (string): The target channel name
- `message` (string): The message content

**REQ-TOOL-016**: The tool MUST validate that the specified channel exists in the project configuration.

**REQ-TOOL-017**: The tool MUST construct a message payload containing:
- `handle` (string): The sender's handle
- `message` (string): The message content
- `timestamp` (string): ISO 8601 formatted timestamp of message creation

**REQ-TOOL-018**: The message payload MUST be JSON-formatted before publishing to NATS.

**REQ-TOOL-019**: The tool MUST publish the message to the NATS JetStream subject corresponding to the channel.

**REQ-TOOL-020**: The tool MUST apply the project namespace prefix to the subject before publishing.

**REQ-TOOL-021**: The tool MUST return a success confirmation including the channel name and handle.

**REQ-TOOL-022**: The tool MUST return an error if NATS publish fails, including diagnostic information.

### 4.4 MCP Tool: read_messages

**REQ-TOOL-023**: The server MUST provide an MCP tool named `read_messages` that retrieves message history from a specified channel.

**REQ-TOOL-024**: The tool MUST accept parameters:
- `channel` (string, required): The target channel name
- `limit` (number, optional): Maximum messages to retrieve (default: 50)

**REQ-TOOL-025**: The tool MUST validate that the specified channel exists in the project configuration.

**REQ-TOOL-026**: The tool MUST retrieve messages from the NATS JetStream stream corresponding to the channel.

**REQ-TOOL-027**: The tool MUST apply the project namespace prefix when accessing the stream.

**REQ-TOOL-028**: The tool MUST retrieve messages in chronological order (oldest first).

**REQ-TOOL-029**: The tool MUST parse each message from JSON format into structured data.

**REQ-TOOL-030**: The tool MUST return messages formatted as:
```
[{timestamp}] **{handle}**: {message}
```

**REQ-TOOL-031**: If the channel contains no messages, the tool MUST return a clear "no messages" response (not an error).

**REQ-TOOL-032**: The tool MUST respect the `limit` parameter, returning at most that number of messages.

**REQ-TOOL-033**: The tool MUST acknowledge messages to the JetStream consumer after successful retrieval.

**REQ-TOOL-034**: If message parsing fails for a specific message, the tool SHOULD skip that message and log an error, continuing with remaining messages.

### 4.5 MCP Tool: list_channels

**REQ-TOOL-035**: The server MUST provide an MCP tool named `list_channels` that enumerates available communication channels.

**REQ-TOOL-036**: The tool MUST NOT require any input parameters.

**REQ-TOOL-037**: The tool MUST return a list of all channels configured for the current project.

**REQ-TOOL-038**: Each channel in the list MUST include:
- `name` (string): The channel identifier
- `description` (string): Human-readable purpose description

**REQ-TOOL-039**: The tool MUST format the response as a markdown list for readability.

**REQ-TOOL-040**: The tool MUST NOT expose internal NATS implementation details (stream names, subjects) in the response.

### 4.6 Channel Configuration

**REQ-CONFIG-001**: The server MUST support project-specific channel configuration via a `.mcp-config.json` file in the project root.

**REQ-CONFIG-002**: The configuration file MUST follow JSON Schema validation.

**REQ-CONFIG-003**: The configuration MUST support a `channels` array defining channel specifications.

**REQ-CONFIG-004**: Each channel specification MUST include:
- `name` (string, required): Unique channel identifier within the project
- `description` (string, required): Human-readable purpose

**REQ-CONFIG-005**: Each channel specification MAY include optional properties:
- `maxMessages` (number): Maximum messages to retain (default: 10000)
- `maxBytes` (number): Maximum storage in bytes (default: 10MB)
- `maxAge` (duration string): Maximum message age (default: "24h")

**REQ-CONFIG-006**: If no `.mcp-config.json` file exists, the server MUST use default channels:
- `roadmap`: "Discussion about project roadmap and planning"
- `parallel-work`: "Coordination for parallel work among agents"
- `errors`: "Error reporting and troubleshooting"

**REQ-CONFIG-007**: The server MUST validate channel names to ensure they match the pattern: `^[a-z0-9-]+$`.

**REQ-CONFIG-008**: The server MUST reject configurations with duplicate channel names.

**REQ-CONFIG-009**: The server MUST create NATS JetStream streams for all configured channels on initialization.

**REQ-CONFIG-010**: Stream creation MUST be idempotent - existing streams MUST be reused without error.

### 4.7 Namespace Isolation

**REQ-NAMESPACE-001**: The server MUST derive a unique namespace for each project to isolate communications.

**REQ-NAMESPACE-002**: The default namespace SHOULD be generated from the absolute project directory path using a deterministic hash function.

**REQ-NAMESPACE-003**: The configuration file MAY allow explicit namespace override via a `namespace` property.

**REQ-NAMESPACE-004**: The namespace MUST be prefixed to all NATS subjects when publishing or subscribing.

**REQ-NAMESPACE-005**: Subject format MUST be: `{namespace}.{channel-name}` (e.g., `project-abc123.roadmap`).

**REQ-NAMESPACE-006**: JetStream stream names MUST include the namespace: `{namespace}_{CHANNEL_NAME}` (e.g., `project-abc123_ROADMAP`).

**REQ-NAMESPACE-007**: Agents within a project MUST NOT be able to access messages from other projects' namespaces through standard tools.

**REQ-NAMESPACE-008**: The namespace MUST be consistent across MCP server restarts for the same project.

### 4.8 Message Format

**REQ-MESSAGE-001**: All messages MUST be serialized as JSON with UTF-8 encoding.

**REQ-MESSAGE-002**: The message payload MUST conform to this schema:
```json
{
  "handle": "string (agent identifier)",
  "message": "string (message content)",
  "timestamp": "string (ISO 8601 datetime)"
}
```

**REQ-MESSAGE-003**: The `handle` field MUST contain the sender's handle as set by `set_handle`.

**REQ-MESSAGE-004**: The `timestamp` field MUST be generated server-side at message publish time.

**REQ-MESSAGE-005**: The `timestamp` MUST use ISO 8601 format with timezone (e.g., `2025-01-15T14:30:00.000Z`).

**REQ-MESSAGE-006**: The `message` field MUST support arbitrary string content, including multiline text and special characters.

**REQ-MESSAGE-007**: Message content MUST NOT have a hard size limit, but SHOULD be reasonable (< 1MB recommended).

**REQ-MESSAGE-008**: The server MAY add additional metadata fields in future versions without breaking compatibility.

### 4.9 Error Handling

**REQ-ERROR-001**: All MCP tool errors MUST return structured error responses with:
- Clear error message describing what went wrong
- Actionable remediation steps when possible
- Error category (e.g., ValidationError, ConnectionError, NotFoundError)

**REQ-ERROR-002**: Connection failures to NATS MUST include:
- NATS server URL being attempted
- Verification that NATS server is running
- Instructions to start NATS with JetStream if not running

**REQ-ERROR-003**: Channel validation errors MUST include:
- The invalid channel name
- List of valid channel names for the project

**REQ-ERROR-004**: Handle validation errors MUST include:
- The invalid handle
- Pattern requirements
- Example of valid handle

**REQ-ERROR-005**: The server MUST log all errors to stderr for debugging purposes.

**REQ-ERROR-006**: The server MUST NOT crash on individual tool invocation errors.

**REQ-ERROR-007**: NATS connection errors MUST trigger automatic retry logic with exponential backoff.

**REQ-ERROR-008**: The server MUST provide clear error messages distinguishing between:
- NATS server not running
- JetStream not enabled on NATS server
- Network connectivity issues
- Authentication failures

## 5. Non-Functional Requirements

### 5.1 Performance

**REQ-PERF-001**: The server MUST handle at least 1000 messages per second under normal operating conditions.

**REQ-PERF-002**: Message publish latency MUST be less than 50ms at the 95th percentile.

**REQ-PERF-003**: Message publish latency MUST be less than 100ms at the 99th percentile.

**REQ-PERF-004**: Message retrieval latency MUST be less than 100ms for up to 100 messages at the 95th percentile.

**REQ-PERF-005**: The server MUST support at least 100 concurrent agent connections per project.

**REQ-PERF-006**: The server MUST support at least 10 concurrent projects without performance degradation.

**REQ-PERF-007**: Memory usage MUST remain below 100MB per project under normal operation.

**REQ-PERF-008**: The server SHOULD implement connection pooling to NATS to minimize connection overhead.

### 5.2 Scalability

**REQ-SCALE-001**: The architecture MUST support horizontal scaling by allowing multiple NATS servers in a cluster.

**REQ-SCALE-002**: Message throughput MUST scale linearly with NATS cluster size.

**REQ-SCALE-003**: The server MUST handle projects with up to 1 million messages per channel without degradation.

**REQ-SCALE-004**: Stream retention policies MUST prevent unbounded storage growth.

**REQ-SCALE-005**: The server MUST support at least 50 channels per project.

### 5.3 Security

**REQ-SEC-001**: The server MUST support NATS authentication via username/password when configured.

**REQ-SEC-002**: The server MUST support NATS TLS encryption for production deployments.

**REQ-SEC-003**: NATS credentials MUST be configurable via environment variables, not hardcoded.

**REQ-SEC-004**: The server MUST NOT log sensitive information (credentials, tokens) to stderr or stdout.

**REQ-SEC-005**: The server MUST validate all input parameters to prevent injection attacks.

**REQ-SEC-006**: Message content MUST NOT be executable - content is treated as data only.

**REQ-SEC-007**: The server SHOULD provide an option to enable TLS for NATS connections via configuration.

**REQ-SEC-008**: Access control to channels MUST be enforced through NATS-level permissions, not application logic.

### 5.4 Reliability

**REQ-REL-001**: The server MUST automatically reconnect to NATS if the connection is lost.

**REQ-REL-002**: The reconnection logic MUST use exponential backoff with a maximum interval of 60 seconds.

**REQ-REL-003**: Messages published during a disconnection MUST be queued and sent upon reconnection (up to a limit).

**REQ-REL-004**: The message queue MUST have a maximum size of 1000 messages to prevent memory exhaustion.

**REQ-REL-005**: If the queue overflows, the server MUST log a warning and drop the oldest messages.

**REQ-REL-006**: The server MUST log reconnection attempts and successes/failures.

**REQ-REL-007**: JetStream MUST persist messages to disk to survive NATS server restarts.

**REQ-REL-008**: The server MUST gracefully shut down when receiving SIGTERM or SIGINT signals.

**REQ-REL-009**: Graceful shutdown MUST flush pending messages to NATS before terminating.

**REQ-REL-010**: The server uptime SHOULD exceed 99.9% during active project work sessions.

### 5.5 Usability

**REQ-USE-001**: Error messages MUST be written in plain English, avoiding technical jargon where possible.

**REQ-USE-002**: Error messages MUST include actionable next steps for common failure scenarios.

**REQ-USE-003**: The server MUST log initialization status to stderr for user visibility.

**REQ-USE-004**: Successful operations SHOULD provide confirmation messages to build user confidence.

**REQ-USE-005**: Documentation MUST include examples for every MCP tool.

**REQ-USE-006**: Documentation MUST include a troubleshooting guide covering common setup issues.

**REQ-USE-007**: Configuration file errors MUST include line/column information when possible.

**REQ-USE-008**: The server MUST provide helpful defaults requiring minimal configuration for basic use cases.

### 5.6 Maintainability

**REQ-MAINT-001**: The codebase MUST use TypeScript with strict type checking enabled.

**REQ-MAINT-002**: All public functions MUST have TSDoc documentation comments.

**REQ-MAINT-003**: The code MUST follow a consistent style enforced by ESLint or Prettier.

**REQ-MAINT-004**: The codebase MUST achieve at least 80% unit test coverage.

**REQ-MAINT-005**: Integration tests MUST cover all MCP tool operations against a real NATS server.

**REQ-MAINT-006**: The build process MUST produce both CommonJS and ES Module outputs for compatibility.

**REQ-MAINT-007**: The codebase MUST have no high-severity security vulnerabilities reported by npm audit.

**REQ-MAINT-008**: Dependencies MUST be kept up-to-date, with automated dependency update PRs.

### 5.7 Portability

**REQ-PORT-001**: The server MUST run on Linux, macOS, and Windows operating systems.

**REQ-PORT-002**: The server MUST be compatible with Node.js 18 LTS and later versions.

**REQ-PORT-003**: The server MUST NOT depend on platform-specific native modules.

**REQ-PORT-004**: Configuration file paths MUST use platform-independent path handling.

**REQ-PORT-005**: The server MUST support both local NATS (localhost) and remote NATS (network) deployments.

### 5.8 Accessibility

**REQ-ACCESS-001**: Message timestamps MUST be readable by screen readers when formatted.

**REQ-ACCESS-002**: Error messages MUST be compatible with screen reader output.

**REQ-ACCESS-003**: Documentation MUST meet WCAG 2.1 Level AA standards for web-based content.

### 5.9 Data Requirements

**REQ-DATA-001**: The server MUST NOT store messages outside of NATS JetStream.

**REQ-DATA-002**: The server MUST NOT require a local database or file system storage for persistence.

**REQ-DATA-003**: Configuration files MUST use JSON format with JSON Schema validation.

**REQ-DATA-004**: Message data MUST be UTF-8 encoded.

**REQ-DATA-005**: The server MUST handle special characters, emojis, and Unicode in message content.

**REQ-DATA-006**: Stream retention policies MUST be configurable per channel.

**REQ-DATA-007**: Default retention MUST be 10,000 messages OR 10MB OR 24 hours (whichever is reached first).

### 5.10 Error Handling and Logging

**REQ-LOG-001**: The server MUST log to stderr using structured logging format (JSON).

**REQ-LOG-002**: Log entries MUST include:
- Timestamp
- Log level (DEBUG, INFO, WARN, ERROR)
- Component (e.g., "nats-connection", "mcp-tool")
- Message

**REQ-LOG-003**: The logging level MUST be configurable via environment variable (e.g., `LOG_LEVEL`).

**REQ-LOG-004**: Default log level MUST be INFO.

**REQ-LOG-005**: DEBUG level MUST log all NATS operations for troubleshooting.

**REQ-LOG-006**: ERROR level MUST log all exceptions with stack traces.

**REQ-LOG-007**: The server MUST rotate logs or delegate rotation to external tools.

**REQ-LOG-008**: Sensitive data (credentials, tokens) MUST be redacted from logs.

### 5.11 Internationalization and Localization

**REQ-I18N-001**: The server MAY support localized error messages in future versions.

**REQ-I18N-002**: Message content MUST support full Unicode character set.

**REQ-I18N-003**: Timestamps MUST use ISO 8601 format with UTC timezone for consistency across locales.

### 5.12 Legal and Compliance

**REQ-LEGAL-001**: The server MUST be licensed under an open-source license (MIT recommended).

**REQ-LEGAL-002**: All dependencies MUST use compatible open-source licenses.

**REQ-LEGAL-003**: The server MUST NOT collect telemetry or analytics data without explicit user consent.

**REQ-LEGAL-004**: The server MUST include a NOTICE file documenting all third-party dependencies and licenses.

**REQ-LEGAL-005**: The server MUST comply with data retention regulations by supporting configurable message retention policies.

## 6. Technical Requirements

### 6.1 Platform and Browser Compatibility

**REQ-TECH-001**: The server MUST be implemented as a Node.js application.

**REQ-TECH-002**: The server MUST support Node.js 18 LTS, 20 LTS, and 22 LTS.

**REQ-TECH-003**: The server MUST NOT require a browser runtime (server-side only).

### 6.2 Technology Stack

**REQ-STACK-001**: The server MUST be implemented in TypeScript 5.x.

**REQ-STACK-002**: The server MUST use the `@modelcontextprotocol/sdk` npm package for MCP protocol implementation.

**REQ-STACK-003**: The server MUST use the `nats` npm package (version 2.28+) for NATS connectivity.

**REQ-STACK-004**: The server MUST compile to ES2022 JavaScript for optimal compatibility.

**REQ-STACK-005**: The server MUST use `StdioServerTransport` for MCP communication.

**REQ-STACK-006**: The server MUST NOT depend on databases (PostgreSQL, MySQL, etc.) - NATS JetStream is the sole persistence layer.

### 6.3 API Integrations

**REQ-API-001**: The server MUST integrate with NATS Core for message publishing.

**REQ-API-002**: The server MUST integrate with NATS JetStream for message persistence.

**REQ-API-003**: The server MUST integrate with JetStream Manager API for stream and consumer management.

**REQ-API-004**: The server MUST use MCP SDK for tool registration and request handling.

### 6.4 Data Storage

**REQ-STORAGE-001**: All persistent data MUST be stored in NATS JetStream streams.

**REQ-STORAGE-002**: Each channel MUST map to a dedicated JetStream stream.

**REQ-STORAGE-003**: Streams MUST use file-based storage for durability.

**REQ-STORAGE-004**: Streams MUST use Limits retention policy (max messages, max bytes, max age).

**REQ-STORAGE-005**: Consumers MUST use durable consumers for reliable message delivery.

**REQ-STORAGE-006**: Consumers MUST use explicit acknowledgment to track message processing.

### 6.5 Deployment Environment

**REQ-DEPLOY-001**: The server MUST be distributed as an npm package.

**REQ-DEPLOY-002**: The package MUST include a compiled JavaScript distribution in the `dist/` directory.

**REQ-DEPLOY-003**: The package MUST define a `bin` entry point for command-line execution.

**REQ-DEPLOY-004**: The server MUST be installable globally via `npm install -g nats-mcp-server`.

**REQ-DEPLOY-005**: The server MUST be installable locally via `npm install nats-mcp-server`.

**REQ-DEPLOY-006**: The server MUST support installation via user-level npm (no sudo required).

**REQ-DEPLOY-007**: The package MUST include a `README.md` with installation and usage instructions.

**REQ-DEPLOY-008**: The package MUST include a JSON Schema file for configuration validation.

**REQ-DEPLOY-009**: The server MUST be executable via `npx nats-mcp-server` without global installation.

## 7. Design Considerations

### 7.1 Architecture Design

**REQ-ARCH-001**: The server MUST follow a layered architecture:
- **MCP Layer**: Tool registration and request handling
- **Business Logic Layer**: Channel management, namespace isolation, message formatting
- **NATS Integration Layer**: Connection management, publish/subscribe operations
- **Configuration Layer**: Config loading, validation, defaults

**REQ-ARCH-002**: The server MUST use dependency injection for NATS client to support testing.

**REQ-ARCH-003**: The server MUST separate configuration logic from business logic.

**REQ-ARCH-004**: The server MUST use async/await for all asynchronous operations.

**REQ-ARCH-005**: The server MUST handle errors at each layer appropriately:
- MCP Layer: Return MCP error responses
- Business Logic Layer: Throw typed exceptions
- NATS Layer: Retry with exponential backoff
- Configuration Layer: Throw validation errors with context

### 7.2 Configuration Design

**REQ-DESIGN-CONFIG-001**: Configuration MUST be loaded from multiple sources in order of precedence:
1. Environment variables (highest)
2. `.mcp-config.json` in project root
3. User-level configuration file (`~/.nats-mcp/config.json`)
4. Built-in defaults (lowest)

**REQ-DESIGN-CONFIG-002**: Environment variables MUST follow naming convention: `NATS_MCP_<SETTING>`.

**REQ-DESIGN-CONFIG-003**: Configuration schema MUST be versioned to support future migrations.

**REQ-DESIGN-CONFIG-004**: The server MUST validate configuration at startup and fail fast with clear errors.

### 7.3 Message Design

**REQ-DESIGN-MSG-001**: Message format MUST be extensible without breaking existing consumers.

**REQ-DESIGN-MSG-002**: Future message versions MAY add optional fields but MUST NOT remove or rename existing fields.

**REQ-DESIGN-MSG-003**: Message schema SHOULD be documented using JSON Schema.

**REQ-DESIGN-MSG-004**: Messages SHOULD include a schema version field for future compatibility.

### 7.4 Namespace Design

**REQ-DESIGN-NS-001**: Namespace generation MUST be deterministic for the same project path.

**REQ-DESIGN-NS-002**: Namespace hash function SHOULD use SHA-256 truncated to 16 characters.

**REQ-DESIGN-NS-003**: Namespace SHOULD be human-readable when explicitly configured.

**REQ-DESIGN-NS-004**: Namespace MUST be compatible with NATS subject naming rules (alphanumeric, hyphens, underscores).

## 8. Testing and Quality Assurance

### 8.1 Testing Strategy

**REQ-TEST-001**: The project MUST include unit tests for all business logic functions.

**REQ-TEST-002**: The project MUST include integration tests for all MCP tools against a real NATS server.

**REQ-TEST-003**: The project MUST include end-to-end tests simulating multi-agent workflows.

**REQ-TEST-004**: The project MUST include performance tests measuring throughput and latency.

**REQ-TEST-005**: The project MUST use Jest or Vitest as the test framework.

**REQ-TEST-006**: Tests MUST be automated and run on every commit via CI/CD.

**REQ-TEST-007**: The project MUST achieve at least 80% code coverage.

**REQ-TEST-008**: The project MUST test error scenarios including NATS unavailability.

### 8.2 Acceptance Criteria

Each functional requirement (REQ-TOOL-*, REQ-CONFIG-*, REQ-NAMESPACE-*, etc.) MUST have corresponding test cases that verify:
- **Happy path**: Feature works as expected under normal conditions
- **Error cases**: Feature handles errors gracefully
- **Edge cases**: Feature handles boundary conditions correctly
- **Performance**: Feature meets performance requirements (where applicable)

### 8.3 Performance Testing Requirements

**REQ-PERF-TEST-001**: Performance tests MUST measure message publish latency at p50, p95, and p99 percentiles.

**REQ-PERF-TEST-002**: Performance tests MUST measure message throughput (messages/second).

**REQ-PERF-TEST-003**: Performance tests MUST measure concurrent agent scaling (10, 50, 100 agents).

**REQ-PERF-TEST-004**: Performance tests MUST measure multi-project isolation overhead.

**REQ-PERF-TEST-005**: Performance tests MUST run against a local NATS server for consistency.

### 8.4 Security Testing Requirements

**REQ-SEC-TEST-001**: Security tests MUST verify that namespace isolation prevents cross-project message access.

**REQ-SEC-TEST-002**: Security tests MUST verify that input validation prevents injection attacks.

**REQ-SEC-TEST-003**: Security tests MUST verify that credentials are not logged.

**REQ-SEC-TEST-004**: Security tests MUST verify TLS encryption when enabled.

**REQ-SEC-TEST-005**: The project MUST run `npm audit` in CI/CD and fail on high-severity vulnerabilities.

## 9. Deployment and Release

### 9.1 Deployment Process

**REQ-DEPLOY-PROC-001**: The deployment process MUST follow these steps:
1. Run all tests (unit, integration, performance)
2. Build TypeScript to JavaScript
3. Validate package.json metadata
4. Generate type definitions (.d.ts files)
5. Publish to npm registry
6. Create GitHub release with changelog
7. Update documentation website (if applicable)

**REQ-DEPLOY-PROC-002**: The build MUST produce artifacts in the `dist/` directory.

**REQ-DEPLOY-PROC-003**: The package MUST include only necessary files (exclude tests, source TypeScript).

**REQ-DEPLOY-PROC-004**: The package MUST include a `.npmignore` file to exclude development files.

### 9.2 Release Criteria

**REQ-RELEASE-001**: A release MUST NOT proceed if any tests are failing.

**REQ-RELEASE-002**: A release MUST NOT proceed if code coverage drops below 80%.

**REQ-RELEASE-003**: A release MUST NOT proceed if there are high-severity npm audit vulnerabilities.

**REQ-RELEASE-004**: A release MUST include a changelog documenting all changes since the previous version.

**REQ-RELEASE-005**: A release MUST follow semantic versioning (semver):
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes (backward compatible)

**REQ-RELEASE-006**: The first production release MUST be version 1.0.0.

**REQ-RELEASE-007**: Pre-release versions MUST use semver prerelease tags (e.g., 1.0.0-beta.1).

### 9.3 Rollback Plan

**REQ-ROLLBACK-001**: If a critical bug is discovered in a release, the previous version MUST remain available on npm.

**REQ-ROLLBACK-002**: Users MUST be able to downgrade by specifying an older version in package.json.

**REQ-ROLLBACK-003**: The rollback procedure MUST be documented in CONTRIBUTING.md.

**REQ-ROLLBACK-004**: Breaking changes MUST be documented in CHANGELOG.md with migration guides.

## 10. Maintenance and Support

### 10.1 Support Procedures

**REQ-SUPPORT-001**: The project MUST include a GitHub Issues template for bug reports.

**REQ-SUPPORT-002**: The project MUST include a GitHub Issues template for feature requests.

**REQ-SUPPORT-003**: The project MUST include a CONTRIBUTING.md file explaining how to contribute.

**REQ-SUPPORT-004**: The project MUST respond to security vulnerability reports within 48 hours.

**REQ-SUPPORT-005**: The project SHOULD provide community support via GitHub Discussions or similar forum.

### 10.2 Maintenance Schedule

**REQ-MAINT-SCHED-001**: Dependencies MUST be reviewed and updated monthly.

**REQ-MAINT-SCHED-002**: Security updates MUST be applied within 7 days of disclosure.

**REQ-MAINT-SCHED-003**: The project MUST support the latest LTS version of Node.js.

**REQ-MAINT-SCHED-004**: The project MUST drop support for Node.js versions that reach end-of-life.

### 10.3 Service Level Agreements

**REQ-SLA-001**: Critical bugs (server crashes, data loss) MUST be addressed within 7 days.

**REQ-SLA-002**: High-priority bugs (features broken, severe performance degradation) MUST be addressed within 30 days.

**REQ-SLA-003**: Medium-priority bugs SHOULD be addressed within 90 days.

**REQ-SLA-004**: Low-priority bugs and enhancements MAY be addressed on a best-effort basis.

**REQ-SLA-005**: Security vulnerabilities MUST be patched within 14 days of responsible disclosure.

## 11. Future Considerations

The following features are NOT required for the initial release but MAY be implemented in future versions:

### 11.1 Advanced Features

- **Message Search**: Full-text search across message history
- **Message Reactions**: Agents can react to messages (e.g., acknowledgments, approvals)
- **Threaded Conversations**: Messages can be organized into threads for better context
- **Webhooks**: External systems can subscribe to channel events via HTTP webhooks
- **Message Filtering**: Advanced query syntax for filtering messages by handle, timestamp, content patterns
- **Channel Permissions**: Fine-grained access control (read-only vs. read-write channels)
- **Ephemeral Channels**: Channels that automatically clean up after project completion
- **Cross-Project Channels**: Opt-in shared channels for multi-project coordination

### 11.2 Observability

- **Metrics Export**: Prometheus-compatible metrics for monitoring
- **Distributed Tracing**: OpenTelemetry support for request tracing
- **Health Checks**: HTTP endpoint for container orchestration health checks
- **Admin Dashboard**: Web UI for viewing channel activity and server status

### 11.3 Advanced Configuration

- **Hot Reload**: Configuration changes apply without server restart
- **Channel Templates**: Predefined channel sets for common workflows (e.g., "agile", "kanban")
- **Rate Limiting**: Per-agent message rate limits to prevent spam
- **Message Quotas**: Storage quotas per project or channel

## 12. Installation and Usage Guide

### 12.1 Installation

**User-Level Installation (Recommended):**
```bash
npm install -g nats-mcp-server
```

**Project-Level Installation:**
```bash
npm install nats-mcp-server
```

**Run without Installation:**
```bash
npx nats-mcp-server
```

### 12.2 Prerequisites

- Node.js 18 LTS or later
- NATS server with JetStream enabled (installation instructions in README.md)

**Starting NATS with JetStream:**
```bash
# macOS/Linux
nats-server -js

# Docker
docker run -p 4222:4222 -p 8222:8222 nats:latest -js
```

### 12.3 Configuration

**User-Level MCP Configuration** (`~/.claude/mcp.json`):
```json
{
  "mcpServers": {
    "nats-mcp": {
      "command": "nats-mcp-server",
      "env": {
        "NATS_URL": "nats://localhost:4222"
      }
    }
  }
}
```

**Project-Level Channel Configuration** (`.mcp-config.json`):
```json
{
  "namespace": "my-project",
  "channels": [
    {
      "name": "planning",
      "description": "Sprint planning and prioritization",
      "maxMessages": 5000,
      "maxAge": "7d"
    },
    {
      "name": "implementation",
      "description": "Development work coordination"
    },
    {
      "name": "review",
      "description": "Code review discussions"
    }
  ]
}
```

### 12.4 Usage Examples

**Setting Your Handle:**
```
Agent: set_handle("project-manager")
Server: Handle set to: project-manager
```

**Sending a Message:**
```
Agent: send_message("planning", "Starting Sprint 5 planning. Focus: API endpoints.")
Server: Message sent to #planning by project-manager
```

**Reading Messages:**
```
Agent: read_messages("planning", limit=10)
Server: Messages from #planning:

[2025-01-15T10:00:00Z] **project-manager**: Starting Sprint 5 planning. Focus: API endpoints.
[2025-01-15T10:05:00Z] **business-analyst**: Prioritizing user authentication requirements.
[2025-01-15T10:10:00Z] **tdd-engineer**: Claimed B5.T1 - User registration endpoint.
```

**Listing Channels:**
```
Agent: list_channels()
Server: Available channels:
- **planning**: Sprint planning and prioritization
- **implementation**: Development work coordination
- **review**: Code review discussions
```

## 13. Configuration Schema Reference

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "namespace": {
      "type": "string",
      "pattern": "^[a-z0-9-]+$",
      "description": "Unique namespace for this project. Auto-generated from path if not specified."
    },
    "channels": {
      "type": "array",
      "description": "List of communication channels for this project",
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "pattern": "^[a-z0-9-]+$",
            "description": "Channel identifier (lowercase alphanumeric and hyphens)"
          },
          "description": {
            "type": "string",
            "description": "Human-readable channel purpose"
          },
          "maxMessages": {
            "type": "number",
            "minimum": 1,
            "default": 10000,
            "description": "Maximum number of messages to retain"
          },
          "maxBytes": {
            "type": "number",
            "minimum": 1024,
            "default": 10485760,
            "description": "Maximum storage in bytes (default: 10MB)"
          },
          "maxAge": {
            "type": "string",
            "pattern": "^[0-9]+(ns|us|ms|s|m|h|d)$",
            "default": "24h",
            "description": "Maximum message age (e.g., '24h', '7d', '30m')"
          }
        },
        "required": ["name", "description"]
      }
    },
    "natsUrl": {
      "type": "string",
      "format": "uri",
      "default": "nats://localhost:4222",
      "description": "NATS server URL. Can be overridden by NATS_URL environment variable."
    },
    "natsCredentials": {
      "type": "object",
      "properties": {
        "username": {
          "type": "string",
          "description": "NATS username (if auth enabled)"
        },
        "password": {
          "type": "string",
          "description": "NATS password (if auth enabled). Prefer environment variable."
        }
      }
    },
    "logging": {
      "type": "object",
      "properties": {
        "level": {
          "type": "string",
          "enum": ["DEBUG", "INFO", "WARN", "ERROR"],
          "default": "INFO",
          "description": "Logging verbosity level"
        },
        "format": {
          "type": "string",
          "enum": ["json", "text"],
          "default": "json",
          "description": "Log output format"
        }
      }
    }
  }
}
```

## 14. Environment Variables Reference

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NATS_URL` | string | `nats://localhost:4222` | NATS server connection URL |
| `NATS_USERNAME` | string | (none) | NATS authentication username |
| `NATS_PASSWORD` | string | (none) | NATS authentication password |
| `NATS_TLS_CERT` | string | (none) | Path to TLS client certificate |
| `NATS_TLS_KEY` | string | (none) | Path to TLS client key |
| `NATS_TLS_CA` | string | (none) | Path to TLS CA certificate |
| `LOG_LEVEL` | string | `INFO` | Logging level (DEBUG, INFO, WARN, ERROR) |
| `LOG_FORMAT` | string | `json` | Log format (json, text) |
| `MCP_CONFIG_PATH` | string | `./.mcp-config.json` | Path to project configuration file |

## 15. Troubleshooting Guide

### 15.1 Server Won't Start

**Symptom:** MCP server fails to initialize

**Possible Causes and Solutions:**

1. **NATS server not running:**
   - Verify: `curl http://localhost:8222/healthz`
   - Solution: Start NATS with `nats-server -js`

2. **JetStream not enabled:**
   - Verify: `nats-server --version` shows JetStream support
   - Solution: Ensure `-js` flag is used when starting NATS

3. **Permission issues:**
   - Verify: Check NATS server logs for authentication errors
   - Solution: Verify credentials in environment variables

4. **Port conflict:**
   - Verify: Check if port 4222 is already in use
   - Solution: Change NATS_URL to alternate port

### 15.2 Messages Not Persisting

**Symptom:** Messages sent but not visible when reading

**Possible Causes and Solutions:**

1. **Wrong channel name:**
   - Verify: Check `list_channels()` output
   - Solution: Use exact channel name from configuration

2. **Namespace mismatch:**
   - Verify: Check server logs for namespace being used
   - Solution: Ensure same `.mcp-config.json` is used consistently

3. **JetStream not enabled:**
   - Verify: NATS started with `-js` flag
   - Solution: Restart NATS with JetStream enabled

### 15.3 Performance Issues

**Symptom:** Slow message publishing or retrieval

**Possible Causes and Solutions:**

1. **Network latency to NATS:**
   - Verify: Check NATS server location (local vs. remote)
   - Solution: Use local NATS for development

2. **Large message volume:**
   - Verify: Check stream size with `nats stream info`
   - Solution: Adjust retention policies to limit storage

3. **Too many concurrent agents:**
   - Verify: Check connection count in NATS monitoring
   - Solution: Implement connection pooling or batching

## 16. Example Agent Workflows

### 16.1 Dispatcher Agent Workflow

```typescript
// 1. Set agent handle
await set_handle("dispatcher");

// 2. Announce start
await send_message("parallel-work", "Dispatcher analyzing roadmap for available work...");

// 3. Read roadmap file (not shown - uses file system tools)
const roadmap = await readRoadmap();

// 4. Identify available work
const availableTasks = identifyAvailableTasks(roadmap);

// 5. Dispatch agents for each task
for (const task of availableTasks) {
  await send_message("parallel-work", `Dispatching ${task.agentType} for ${task.id}`);
  await spawnAgent(task.agentType, task);
}

// 6. Report completion
await send_message("parallel-work", `Dispatched ${availableTasks.length} agents`);
```

### 16.2 Worker Agent Workflow

```typescript
// 1. Set agent handle
await set_handle("tdd-engineer-1");

// 2. Read dispatch messages
const messages = await read_messages("parallel-work", 50);

// 3. Identify assigned task
const myTask = findMyTask(messages);

// 4. Claim task
await send_message("parallel-work", `Claimed ${myTask.id} - Starting implementation`);

// 5. Implement (TDD cycle - not shown)
await implementTask(myTask);

// 6. Report completion
await send_message("parallel-work", `Completed ${myTask.id} - All tests passing`);
```

### 16.3 Reporter Agent Workflow

```typescript
// 1. Set agent handle
await set_handle("reporter");

// 2. Gather data from all channels
const planningMessages = await read_messages("roadmap", 100);
const workMessages = await read_messages("parallel-work", 100);
const errorMessages = await read_messages("errors", 50);

// 3. Read file system data (roadmap, devlog)
const roadmap = await readRoadmap();
const devlog = await readDevlog();

// 4. Analyze status
const status = analyzeStatus(planningMessages, workMessages, errorMessages, roadmap, devlog);

// 5. Generate report
const report = generateReport(status);

// 6. Announce report
await send_message("roadmap", `Status report generated. Summary: ${status.summary}`);

// 7. Present to user
console.log(report);
```

## 17. Appendix

### 17.1 Default Channel Definitions

If no `.mcp-config.json` is provided, these default channels are created:

```json
{
  "channels": [
    {
      "name": "roadmap",
      "description": "Discussion about project roadmap and planning",
      "maxMessages": 10000,
      "maxAge": "24h"
    },
    {
      "name": "parallel-work",
      "description": "Coordination for parallel work among agents",
      "maxMessages": 10000,
      "maxAge": "24h"
    },
    {
      "name": "errors",
      "description": "Error reporting and troubleshooting",
      "maxMessages": 5000,
      "maxAge": "48h"
    }
  ]
}
```

### 17.2 NATS JetStream Concepts

**Stream:** A message store that persists messages for later consumption. Each channel maps to one stream.

**Consumer:** Tracks which messages have been delivered to a specific subscriber. Durable consumers remember their position across restarts.

**Subject:** A NATS topic that messages are published to. Format: `{namespace}.{channel-name}`.

**Acknowledgment:** Confirmation from a consumer that a message was successfully processed. Required for durable delivery.

### 17.3 Message Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Agent (MCP Client)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ set_handle   │  │ send_message │  │ read_messages        │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────────────┘  │
└─────────┼──────────────────┼──────────────────┼──────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NATS MCP Server                             │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │ Handle Storage  │  │ Namespace Prefix │  │ Message Format │ │
│  │ (session state) │  │ + Validation     │  │ + Timestamp    │ │
│  └─────────────────┘  └──────────────────┘  └────────────────┘ │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NATS JetStream                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Stream: project-abc_ROADMAP                            │   │
│  │    Subject: project-abc.roadmap                         │   │
│  │    Messages: [{handle:"pm", msg:"...", ts:"..."}]      │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Stream: project-abc_PARALLEL_WORK                      │   │
│  │    Subject: project-abc.parallel-work                   │   │
│  │    Messages: [{handle:"tdd", msg:"...", ts:"..."}]     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 17.4 Comparison to Existing Implementation

This specification generalizes the existing project-specific implementation:

| Aspect | Existing Implementation | Generalized Specification |
|--------|------------------------|---------------------------|
| **Installation** | Project-local (`nats-chat/`) | User-level npm package |
| **Configuration** | Hardcoded channels in code | Configurable via `.mcp-config.json` |
| **Namespace** | None (single project) | Automatic per-project namespacing |
| **Channels** | Fixed 3 channels | User-defined channels |
| **Distribution** | Copy-paste to new projects | Install once, use everywhere |
| **Customization** | Edit TypeScript source | Edit JSON config file |
| **Updates** | Manual per-project | `npm update` for all projects |

### 17.5 Migration from Existing Implementation

Projects currently using the project-specific `nats-chat` implementation can migrate:

1. **Install global package:**
   ```bash
   npm install -g nats-mcp-server
   ```

2. **Create `.mcp-config.json`:**
   ```json
   {
     "channels": [
       {"name": "roadmap", "description": "Planning and priorities"},
       {"name": "parallel-work", "description": "Work coordination"},
       {"name": "errors", "description": "Error reporting"}
     ]
   }
   ```

3. **Update `.mcp.json`:**
   ```json
   {
     "mcpServers": {
       "nats-mcp": {
         "command": "nats-mcp-server",
         "env": {
           "NATS_URL": "nats://localhost:4222"
         }
       }
     }
   }
   ```

4. **Remove old implementation:**
   ```bash
   rm -rf nats-chat/
   ```

5. **Test:**
   - Restart Claude Code
   - Verify channels with `list_channels()`
   - Send test message

### 17.6 Related Documentation

- **NATS JetStream Best Practices:** https://docs.nats.io/nats-concepts/jetstream/best_practices
- **MCP Server Development Guide:** https://spec.modelcontextprotocol.io/servers/
- **TypeScript Project Setup:** https://www.typescriptlang.org/docs/handbook/project-config.html
- **npm Package Publishing:** https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry

## 18. Cross-Computer Agent Communication

This section specifies requirements for enabling agent-to-agent communication across multiple computers, transforming the NATS MCP Server from a project-scoped tool into a distributed agent coordination hub.

### 18.1 Architecture Overview

**REQ-CROSS-ARCH-001**: The cross-computer architecture MUST use a **local MCP server + remote NATS** model:
- Each computer runs its own local MCP server instance
- MCP servers communicate with Claude Code via stdio (unchanged from single-computer mode)
- All MCP servers connect to a shared NATS cluster for cross-computer messaging
- The MCP server acts as a bridge between local Claude Code and the distributed network

**REQ-CROSS-ARCH-002**: The architecture MUST support the following deployment topology:
```
┌─────────────────────┐         ┌─────────────────────┐
│   Computer A        │         │   Computer B        │
│  ┌───────────────┐  │         │  ┌───────────────┐  │
│  │  Claude Code  │  │         │  │  Claude Code  │  │
│  └───────┬───────┘  │         │  └───────┬───────┘  │
│          │ stdio    │         │          │ stdio    │
│  ┌───────▼───────┐  │         │  ┌───────▼───────┐  │
│  │  MCP Server   │  │         │  │  MCP Server   │  │
│  │   (local)     │  │         │  │   (local)     │  │
│  └───────┬───────┘  │         │  └───────┬───────┘  │
└──────────┼──────────┘         └──────────┼──────────┘
           │ nats://                       │ nats://
           └───────────┐       ┌───────────┘
                       ▼       ▼
              ┌─────────────────────────────┐
              │    Shared NATS Cluster      │
              │    (remote/network)         │
              │  ┌───────────────────────┐  │
              │  │   Agent Registry      │  │
              │  │   (KV Store)          │  │
              │  └───────────────────────┘  │
              │  ┌───────────────────────┐  │
              │  │   Global Agent        │  │
              │  │   Channels            │  │
              │  └───────────────────────┘  │
              │  ┌───────────────────────┐  │
              │  │   Project Channels    │  │
              │  │   (namespaced)        │  │
              │  └───────────────────────┘  │
              └─────────────────────────────┘
```

**REQ-CROSS-ARCH-003**: The system MUST implement a **two-tier messaging model**:
- **Tier 1: Project Channels** - Namespace-isolated, project-scoped broadcast messaging (existing functionality)
- **Tier 2: Global Agent Network** - Cross-computer, agent-to-agent direct messaging and discovery

**REQ-CROSS-ARCH-004**: Project channel isolation (REQ-NAMESPACE-007) MUST remain enforced. Cross-computer features operate on a separate global namespace.

### 18.2 Agent Registry

#### 18.2.1 Registry Storage

**REQ-REGISTRY-001**: The agent registry MUST be implemented using NATS JetStream Key-Value store when cross-computer messaging is enabled.

**REQ-REGISTRY-002**: The registry KV bucket MUST be named `agent-registry` by default, configurable via `crossComputer.registryBucket`.

**REQ-REGISTRY-003**: The registry MUST use file-based storage for durability across NATS server restarts.

**REQ-REGISTRY-004**: Registry entries MUST be stored with the agent's GUID as the key.

#### 18.2.2 Registry Schema

**REQ-REGISTRY-005**: Each agent registry entry MUST conform to the following schema:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "guid": {
      "type": "string",
      "format": "uuid",
      "description": "Unique agent identifier (UUID v4)"
    },
    "agentType": {
      "type": "string",
      "pattern": "^[a-z0-9-]+$",
      "description": "Role/capability identifier (e.g., 'tdd-engineer', 'dispatcher', 'reviewer')"
    },
    "handle": {
      "type": "string",
      "pattern": "^[a-z0-9-]+$",
      "description": "Current agent handle for display"
    },
    "hostname": {
      "type": "string",
      "description": "Computer hostname where agent is running"
    },
    "username": {
      "type": "string",
      "description": "OS user running the agent (optional for privacy)"
    },
    "projectId": {
      "type": "string",
      "description": "Project namespace identifier (opaque, for project-scoped agents)"
    },
    "scope": {
      "type": "string",
      "enum": ["user", "project", "cross-project"],
      "description": "Agent scope: user-level, project-specific, or cross-project coordinator"
    },
    "visibility": {
      "type": "string",
      "enum": ["private", "project-only", "user-only", "public"],
      "default": "project-only",
      "description": "Who can discover this agent"
    },
    "natsUrl": {
      "type": "string",
      "format": "uri",
      "description": "NATS server URL the agent is connected to"
    },
    "capabilities": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Skills/features the agent supports (e.g., 'typescript', 'testing', 'code-review')"
    },
    "status": {
      "type": "string",
      "enum": ["active", "idle", "busy", "offline"],
      "default": "active",
      "description": "Current agent availability"
    },
    "registeredAt": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of initial registration"
    },
    "lastHeartbeat": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of most recent heartbeat"
    },
    "heartbeatInterval": {
      "type": "number",
      "minimum": 10,
      "default": 60,
      "description": "Expected heartbeat frequency in seconds"
    },
    "maxConcurrentTasks": {
      "type": "number",
      "minimum": 0,
      "default": 0,
      "description": "Maximum concurrent tasks (0 = unlimited)"
    },
    "currentTaskCount": {
      "type": "number",
      "minimum": 0,
      "default": 0,
      "description": "Current number of active tasks"
    }
  },
  "required": ["guid", "agentType", "handle", "hostname", "scope", "natsUrl", "status", "registeredAt", "lastHeartbeat"]
}
```

**REQ-REGISTRY-006**: The `username` field MUST be optional to protect user privacy.

**REQ-REGISTRY-007**: The `projectId` field MUST use an opaque identifier (hash) derived from the project path, not the path itself. This provides project isolation without exposing filesystem structure.

**REQ-REGISTRY-008**: Registry entries MUST be validated against the schema before publishing.

**REQ-REGISTRY-009**: Registry entry updates MUST be atomic to prevent race conditions.

#### 18.2.3 Registry Lifecycle

**REQ-REGISTRY-010**: Registry entries MUST have a configurable TTL (time-to-live), default 24 hours from last heartbeat.

**REQ-REGISTRY-011**: The server MUST implement garbage collection to remove stale entries where `lastHeartbeat` is older than `heartbeatInterval * 3`.

**REQ-REGISTRY-012**: Garbage collection MUST run periodically (default: every 5 minutes).

**REQ-REGISTRY-013**: Removed entries MUST be logged for audit purposes.

**REQ-REGISTRY-014**: Agents MUST be able to explicitly deregister on graceful shutdown.

### 18.3 Agent Discovery

#### 18.3.1 MCP Tool: register_agent

**REQ-TOOL-REGISTER-001**: The server MUST provide an MCP tool named `register_agent` when cross-computer messaging is enabled.

**REQ-TOOL-REGISTER-002**: The tool MUST accept the following parameters:
- `agentType` (string, required): Role identifier (e.g., "tdd-engineer", "dispatcher")
- `capabilities` (array of strings, required): Agent skills/features
- `scope` (enum, required): "user", "project", or "cross-project"
- `visibility` (enum, optional, default "project-only"): Access control level
- `maxConcurrentTasks` (number, optional, default 0): Capacity limit

**REQ-TOOL-REGISTER-003**: The tool MUST auto-detect and populate:
- `hostname`: From OS hostname
- `username`: From OS current user (if visibility allows)
- `natsUrl`: From current NATS connection
- `projectId`: From current project namespace (if project-scoped)

**REQ-TOOL-REGISTER-004**: The tool MUST generate a new UUID v4 for the `guid` field.

**REQ-TOOL-REGISTER-005**: The tool MUST set `registeredAt` and `lastHeartbeat` to the current timestamp.

**REQ-TOOL-REGISTER-006**: The tool MUST publish the registry entry to the agent-registry KV bucket.

**REQ-TOOL-REGISTER-007**: The tool MUST return the assigned GUID and confirmation of registration.

**REQ-TOOL-REGISTER-008**: The tool MUST start the automated heartbeat process upon successful registration.

**REQ-TOOL-REGISTER-009**: If an agent with the same hostname + absolutePath + agentType already exists and is offline, the tool SHOULD reuse that GUID rather than creating a duplicate.

#### 18.3.2 MCP Tool: discover_agents

**REQ-TOOL-DISCOVER-001**: The server MUST provide an MCP tool named `discover_agents` when cross-computer messaging is enabled.

**REQ-TOOL-DISCOVER-002**: The tool MUST accept optional filter parameters:
- `agentType` (string): Filter by exact role match
- `capability` (string): Filter by capability (partial match supported)
- `hostname` (string): Filter by hostname
- `projectId` (string): Filter by project namespace
- `status` (enum): Filter by status ("active", "idle", "busy")
- `scope` (enum): Filter by scope ("user", "project", "cross-project")
- `limit` (number, default 50): Maximum results to return

**REQ-TOOL-DISCOVER-003**: The tool MUST apply visibility filtering based on the requester's context:
- `private`: Only the agent itself can see its own entry
- `project-only`: Visible to agents with the same `projectId`
- `user-only`: Visible to agents with the same `username` AND `hostname`
- `public`: Visible to all agents

**REQ-TOOL-DISCOVER-004**: The tool MUST NOT return sensitive fields (`absolutePath`, `username`) unless the requester has appropriate visibility permission.

**REQ-TOOL-DISCOVER-005**: The tool MUST return results sorted by `lastHeartbeat` descending (most recently active first).

**REQ-TOOL-DISCOVER-006**: The tool MUST return an array of agent metadata objects with the following fields:
- `guid`, `agentType`, `handle`, `hostname`, `projectId`, `scope`, `capabilities`, `status`, `lastHeartbeat`, `currentTaskCount`, `maxConcurrentTasks`

**REQ-TOOL-DISCOVER-007**: The tool MUST exclude agents with status "offline" by default. Include them with filter `includeOffline: true`.

**REQ-TOOL-DISCOVER-008**: If no agents match the filters, the tool MUST return an empty array (not an error).

#### 18.3.3 MCP Tool: get_agent_info

**REQ-TOOL-GETINFO-001**: The server MUST provide an MCP tool named `get_agent_info` when cross-computer messaging is enabled.

**REQ-TOOL-GETINFO-002**: The tool MUST accept a required parameter `guid` (string).

**REQ-TOOL-GETINFO-003**: The tool MUST return the full registry entry for the specified agent if visibility allows.

**REQ-TOOL-GETINFO-004**: The tool MUST return an error if the agent is not found or not visible to the requester.

### 18.4 Direct Messaging

#### 18.4.1 Global Agent Subjects

**REQ-DIRECT-001**: Each registered agent MUST subscribe to a personal inbox subject with pattern: `global.agent.{guid}`.

**REQ-DIRECT-002**: The `global` prefix MUST be reserved for cross-computer agent communication and not used for project channels.

**REQ-DIRECT-003**: Personal inbox subjects MUST be backed by JetStream for message persistence.

**REQ-DIRECT-004**: The inbox stream MUST be named `GLOBAL_AGENT_INBOX_{guid}` with retention policy matching project channel defaults.

#### 18.4.2 MCP Tool: send_direct_message

**REQ-TOOL-DIRECT-001**: The server MUST provide an MCP tool named `send_direct_message` when cross-computer messaging is enabled.

**REQ-TOOL-DIRECT-002**: The tool MUST require the sender to be registered (have called `register_agent`).

**REQ-TOOL-DIRECT-003**: The tool MUST accept required parameters:
- `recipientGuid` (string): Target agent's GUID
- `message` (string): Message content

**REQ-TOOL-DIRECT-004**: The tool MUST accept optional parameters:
- `messageType` (enum, default "direct"): One of "direct", "work-offer", "work-claim", "work-accept", "work-reject", "progress-update", "completion", "error"
- `metadata` (object): Additional structured data relevant to the message type

**REQ-TOOL-DIRECT-005**: The tool MUST validate that the recipient exists in the registry.

**REQ-TOOL-DIRECT-006**: The tool MUST warn (not error) if the recipient's status is "offline" or "busy", allowing the sender to proceed.

**REQ-TOOL-DIRECT-007**: The message payload MUST include:
```json
{
  "senderGuid": "string (sender's GUID)",
  "senderHandle": "string (sender's handle)",
  "recipientGuid": "string (recipient's GUID)",
  "message": "string (message content)",
  "messageType": "string (enum)",
  "metadata": "object (optional)",
  "timestamp": "string (ISO 8601)"
}
```

**REQ-TOOL-DIRECT-008**: The tool MUST publish to the recipient's inbox subject: `global.agent.{recipientGuid}`.

**REQ-TOOL-DIRECT-009**: The tool MUST use JetStream publish with acknowledgment for delivery confirmation.

**REQ-TOOL-DIRECT-010**: The tool MUST return success confirmation including the recipient's handle and message ID.

#### 18.4.3 MCP Tool: read_direct_messages

**REQ-TOOL-READDIRECT-001**: The server MUST provide an MCP tool named `read_direct_messages` when cross-computer messaging is enabled.

**REQ-TOOL-READDIRECT-002**: The tool MUST require the reader to be registered.

**REQ-TOOL-READDIRECT-003**: The tool MUST accept optional parameters:
- `limit` (number, default 50): Maximum messages to retrieve
- `messageType` (enum): Filter by message type
- `senderGuid` (string): Filter by sender

**REQ-TOOL-READDIRECT-004**: The tool MUST read from the agent's personal inbox subject.

**REQ-TOOL-READDIRECT-005**: The tool MUST return messages in chronological order (oldest first).

**REQ-TOOL-READDIRECT-006**: The tool MUST acknowledge messages after successful retrieval.

### 18.5 Presence and Heartbeat

#### 18.5.1 Automated Heartbeat

**REQ-HEARTBEAT-001**: The server MUST implement an automated heartbeat mechanism when an agent is registered.

**REQ-HEARTBEAT-002**: The heartbeat MUST run as a background process, not requiring MCP tool invocation.

**REQ-HEARTBEAT-003**: The heartbeat interval MUST be configurable via:
1. `register_agent` parameter (per-agent)
2. Environment variable `HEARTBEAT_INTERVAL` (global default)
3. Configuration file `crossComputer.heartbeatInterval` (global default)

**REQ-HEARTBEAT-004**: Default heartbeat interval MUST be 60 seconds.

**REQ-HEARTBEAT-005**: Each heartbeat MUST update the `lastHeartbeat` timestamp in the agent's registry entry.

**REQ-HEARTBEAT-006**: Heartbeat failures (e.g., NATS connection loss) MUST be logged at ERROR level.

**REQ-HEARTBEAT-007**: The heartbeat MUST continue retrying with exponential backoff during connection issues.

**REQ-HEARTBEAT-008**: The heartbeat process MUST stop on graceful server shutdown.

#### 18.5.2 MCP Tool: update_presence

**REQ-TOOL-PRESENCE-001**: The server MUST provide an MCP tool named `update_presence` when cross-computer messaging is enabled.

**REQ-TOOL-PRESENCE-002**: The tool MUST require the agent to be registered.

**REQ-TOOL-PRESENCE-003**: The tool MUST accept optional parameters:
- `status` (enum): "active", "idle", "busy", "offline"
- `currentTaskCount` (number): Updated workload count
- `capabilities` (array): Updated capability list

**REQ-TOOL-PRESENCE-004**: The tool MUST update the agent's registry entry atomically.

**REQ-TOOL-PRESENCE-005**: The tool MUST also update `lastHeartbeat` to current timestamp.

**REQ-TOOL-PRESENCE-006**: Setting status to "offline" MUST stop the automated heartbeat process.

#### 18.5.3 MCP Tool: deregister_agent

**REQ-TOOL-DEREG-001**: The server MUST provide an MCP tool named `deregister_agent` when cross-computer messaging is enabled.

**REQ-TOOL-DEREG-002**: The tool MUST require the agent to be registered.

**REQ-TOOL-DEREG-003**: The tool MUST stop the automated heartbeat process.

**REQ-TOOL-DEREG-004**: The tool MUST update the registry entry with status "offline".

**REQ-TOOL-DEREG-005**: The tool MUST NOT delete the registry entry immediately (allows for reconnection with same GUID).

**REQ-TOOL-DEREG-006**: The tool MUST unsubscribe from the personal inbox subject.

#### 18.5.4 Liveness Detection

**REQ-LIVENESS-001**: Agents SHOULD monitor the `lastHeartbeat` of other agents they interact with.

**REQ-LIVENESS-002**: An agent SHOULD be considered potentially offline if `currentTime - lastHeartbeat > heartbeatInterval * 2`.

**REQ-LIVENESS-003**: An agent MUST be considered offline if `currentTime - lastHeartbeat > heartbeatInterval * 3`.

**REQ-LIVENESS-004**: The `discover_agents` tool MUST reflect liveness status based on heartbeat timestamps.

### 18.6 Work Handoff Protocols

#### 18.6.1 Work Offer/Claim Pattern

**REQ-HANDOFF-001**: Work handoff MUST follow a structured offer/claim protocol using direct messages.

**REQ-HANDOFF-002**: The work offer flow MUST be:
1. Coordinator sends `messageType: "work-offer"` to potential worker(s)
2. Worker responds with `messageType: "work-claim"` to accept
3. Coordinator sends `messageType: "work-accept"` to confirm assignment
4. Worker sends `messageType: "progress-update"` during execution
5. Worker sends `messageType: "completion"` or `messageType: "error"` when done

**REQ-HANDOFF-003**: Work offer metadata MUST include:
```json
{
  "taskId": "string (unique task identifier)",
  "taskDescription": "string (human-readable description)",
  "requiredCapabilities": ["array of required capabilities"],
  "priority": "number (optional, higher = more urgent)",
  "deadline": "string (optional, ISO 8601 timestamp)",
  "contextData": "object (optional, task-specific data)"
}
```

**REQ-HANDOFF-004**: Work claim metadata MUST include:
```json
{
  "taskId": "string (matching the offer)",
  "estimatedDuration": "string (optional, e.g., '30m', '2h')",
  "acceptedAt": "string (ISO 8601 timestamp)"
}
```

**REQ-HANDOFF-005**: Progress update metadata MUST include:
```json
{
  "taskId": "string",
  "progressPercent": "number (0-100, optional)",
  "statusMessage": "string (human-readable status)",
  "updatedAt": "string (ISO 8601 timestamp)"
}
```

**REQ-HANDOFF-006**: Completion metadata MUST include:
```json
{
  "taskId": "string",
  "success": "boolean",
  "resultSummary": "string (human-readable outcome)",
  "resultData": "object (optional, task-specific results)",
  "completedAt": "string (ISO 8601 timestamp)"
}
```

#### 18.6.2 MCP Tool: broadcast_work_offer

**REQ-TOOL-BROADCAST-001**: The server MUST provide an MCP tool named `broadcast_work_offer` when cross-computer messaging is enabled.

**REQ-TOOL-BROADCAST-002**: The tool MUST accept required parameters:
- `taskId` (string): Unique task identifier
- `taskDescription` (string): Human-readable description
- `requiredCapabilities` (array of strings): Capabilities needed

**REQ-TOOL-BROADCAST-003**: The tool MUST accept optional parameters:
- `targetAgentTypes` (array of strings): Limit broadcast to specific agent types
- `targetProjectId` (string): Limit broadcast to specific project
- `priority` (number): Task priority
- `deadline` (string): ISO 8601 deadline

**REQ-TOOL-BROADCAST-004**: The tool MUST discover eligible agents using `discover_agents` with capability filters.

**REQ-TOOL-BROADCAST-005**: The tool MUST send `messageType: "work-offer"` direct messages to all eligible agents.

**REQ-TOOL-BROADCAST-006**: The tool MUST return the list of agents the offer was sent to.

#### 18.6.3 Work Queue Pattern

**REQ-WORKQUEUE-001**: The server MUST support NATS queue groups for load-balanced work distribution with automatic redelivery.

**REQ-WORKQUEUE-002**: The work queue subject pattern MUST be: `global.workqueue.{capability}`.

**REQ-WORKQUEUE-003**: Agents subscribing to work queues MUST use a shared queue group name to enable competing consumer pattern.

**REQ-WORKQUEUE-004**: Work items MUST be backed by JetStream for persistence and redelivery guarantees.

#### 18.6.4 Failure Handling and Dead Letter Queue

**REQ-DLQ-001**: Work items MUST support automatic redelivery when an agent fails to acknowledge completion within a configurable timeout (default: 5 minutes).

**REQ-DLQ-002**: The server MUST track delivery attempts per work item using JetStream metadata.

**REQ-DLQ-003**: After a configurable maximum number of delivery attempts (default: 3), work items MUST be moved to a dead letter queue.

**REQ-DLQ-004**: The dead letter queue subject MUST be: `global.workqueue.deadletter`.

**REQ-DLQ-005**: Dead letter queue entries MUST include:
```json
{
  "originalTaskId": "string (original task identifier)",
  "originalSubject": "string (original work queue subject)",
  "deliveryAttempts": "number (total attempts made)",
  "lastAttemptAt": "string (ISO 8601 timestamp)",
  "lastAssignedAgent": "string (GUID of last agent that received the task)",
  "failureReason": "string (timeout, agent-offline, explicit-reject)",
  "originalPayload": "object (the original work offer)"
}
```

**REQ-DLQ-006**: The server MUST provide an MCP tool named `list_dead_letter_items` to view failed work items.

**REQ-DLQ-007**: The `list_dead_letter_items` tool MUST accept optional parameters:
- `limit` (number, default 50): Maximum items to return
- `capability` (string): Filter by original capability/queue

**REQ-DLQ-008**: The server MUST provide an MCP tool named `retry_dead_letter_item` to requeue a failed work item.

**REQ-DLQ-009**: The `retry_dead_letter_item` tool MUST accept:
- `taskId` (string, required): The original task ID to retry
- `resetAttempts` (boolean, default true): Whether to reset the attempt counter

**REQ-DLQ-010**: The server MUST provide an MCP tool named `discard_dead_letter_item` to permanently remove a failed work item.

**REQ-DLQ-011**: Dead letter queue items MUST have a configurable TTL (default: 7 days) after which they are automatically purged.

**REQ-DLQ-012**: The server MUST log all dead letter queue events at WARN level for operational visibility.

#### 18.6.5 Work Queue Configuration

**REQ-WORKQUEUE-CONFIG-001**: The following work queue settings MUST be configurable:

| Setting | Default | Description |
|---------|---------|-------------|
| `workQueue.ackTimeout` | 300 (5 min) | Seconds before redelivery on no acknowledgment |
| `workQueue.maxDeliveryAttempts` | 3 | Attempts before moving to dead letter queue |
| `workQueue.deadLetterTTL` | 604800 (7 days) | Seconds to retain dead letter items |

### 18.7 Cross-Computer Configuration

#### 18.7.1 Configuration Schema Extension

**REQ-CONFIG-CROSS-001**: The `.mcp-config.json` schema MUST be extended with a `crossComputer` object:

```json
{
  "crossComputer": {
    "enabled": {
      "type": "boolean",
      "default": false,
      "description": "Enable cross-computer agent communication features"
    },
    "acknowledgment": {
      "type": "string",
      "description": "User must set to 'I understand the security implications' to enable"
    },
    "natsClusterUrls": {
      "type": "array",
      "items": { "type": "string", "format": "uri" },
      "description": "NATS cluster URLs for cross-computer communication"
    },
    "registryBucket": {
      "type": "string",
      "default": "agent-registry",
      "description": "NATS KV bucket name for agent registry"
    },
    "heartbeatInterval": {
      "type": "number",
      "minimum": 10,
      "default": 60,
      "description": "Heartbeat interval in seconds"
    },
    "timeoutThreshold": {
      "type": "number",
      "minimum": 30,
      "default": 180,
      "description": "Seconds before considering an agent offline"
    },
    "registryTTL": {
      "type": "number",
      "default": 86400,
      "description": "Registry entry TTL in seconds (default 24 hours)"
    },
    "defaultVisibility": {
      "type": "string",
      "enum": ["private", "project-only", "user-only", "public"],
      "default": "project-only",
      "description": "Default visibility for new agent registrations"
    },
    "tlsRequired": {
      "type": "boolean",
      "default": true,
      "description": "Require TLS for cross-computer NATS connections"
    },
    "autoRegister": {
      "type": "boolean",
      "default": false,
      "description": "Automatically register agent on MCP server startup"
    },
    "defaultAgentType": {
      "type": "string",
      "default": "general",
      "description": "Default agent type for auto-registration"
    },
    "defaultCapabilities": {
      "type": "array",
      "items": { "type": "string" },
      "default": [],
      "description": "Default capabilities for auto-registration"
    }
  }
}
```

**REQ-CONFIG-CROSS-002**: Cross-computer features MUST be disabled by default (`enabled: false`).

**REQ-CONFIG-CROSS-003**: When `crossComputer.enabled` is true, the `acknowledgment` field MUST be set to the exact string "I understand the security implications" or the server MUST refuse to start.

**REQ-CONFIG-CROSS-004**: When `crossComputer.enabled` is true and `tlsRequired` is true (default), the NATS connection MUST use TLS or the server MUST refuse to start.

**REQ-CONFIG-CROSS-005**: The `natsClusterUrls` field MUST be provided when `crossComputer.enabled` is true. The server MUST fail fast with a clear error if missing.

#### 18.7.2 Environment Variable Extensions

**REQ-ENV-CROSS-001**: The following environment variables MUST be supported for cross-computer configuration:

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `MCP_PROJECT_PATH` | string | (cwd) | Override project path for context discovery |
| `CROSS_COMPUTER_ENABLED` | boolean | false | Enable cross-computer features |
| `NATS_CLUSTER_URLS` | string | (none) | Comma-separated NATS cluster URLs |
| `REGISTRY_BUCKET` | string | agent-registry | KV bucket name |
| `HEARTBEAT_INTERVAL` | number | 60 | Heartbeat interval (seconds) |
| `TIMEOUT_THRESHOLD` | number | 180 | Offline timeout (seconds) |
| `DEFAULT_VISIBILITY` | string | project-only | Default agent visibility |
| `TLS_REQUIRED` | boolean | true | Require TLS for cross-computer |
| `AUTO_REGISTER` | boolean | false | Auto-register on startup |
| `DEFAULT_AGENT_TYPE` | string | general | Default agent type |
| `WORKQUEUE_ACK_TIMEOUT` | number | 300 | Seconds before work item redelivery |
| `WORKQUEUE_MAX_ATTEMPTS` | number | 3 | Max delivery attempts before dead letter |
| `WORKQUEUE_DLQ_TTL` | number | 604800 | Dead letter item retention (seconds) |

**REQ-ENV-CROSS-002**: Environment variables MUST take precedence over configuration file values.

#### 18.7.3 Project Context Discovery

**REQ-PROJECT-001**: The MCP server MUST determine its project context at startup using the following precedence order:
1. `MCP_PROJECT_PATH` environment variable (highest priority)
2. Current working directory at server startup (default)

**REQ-PROJECT-002**: The project path MUST be used to:
- Locate the `.mcp-config.json` configuration file
- Generate the `projectId` hash for registry entries
- Determine the project namespace for channel isolation

**REQ-PROJECT-003**: If `.mcp-config.json` is not found in the project path, the server MUST:
- Use default channel configuration (as specified in Section 4.6)
- Generate `projectId` from the project path hash
- Log an INFO message indicating defaults are being used

**REQ-PROJECT-004**: The server MAY search parent directories for `.mcp-config.json` up to a configurable limit (default: 5 levels) to support monorepo structures.

**REQ-PROJECT-005**: The `projectId` MUST be generated using SHA-256 hash of the absolute project path, truncated to 16 characters.

**REQ-PROJECT-006**: The server MUST expose the detected project path and generated `projectId` in debug logs at startup.

**REQ-PROJECT-007**: For user-scoped agents (not project-scoped), the `MCP_PROJECT_PATH` SHOULD be set to the user's home directory or a designated agent workspace directory.

### 18.8 Security and Privacy

#### 18.8.1 Authentication and Authorization

**REQ-SEC-CROSS-001**: Authentication is OPTIONAL for internal/trusted network deployments. The NATS cluster is assumed to be deployed on a private network not accessible from the public internet.

**REQ-SEC-CROSS-002**: For deployments requiring authentication, the server SHOULD support:
- Username/password authentication
- NKey authentication
- JWT/token-based authentication

**REQ-SEC-CROSS-003**: When authentication is enabled, NATS authorization SHOULD be used to restrict which agents can:
- Publish to the agent-registry KV bucket
- Subscribe to global agent subjects
- Access specific project namespaces

**REQ-SEC-CROSS-004**: The server MUST document how to enable authentication for environments that require it, but MUST NOT require it by default.

#### 18.8.2 Transport Security

**REQ-SEC-CROSS-005**: TLS MUST be the default and strongly recommended for all cross-computer NATS connections.

**REQ-SEC-CROSS-006**: If `tlsRequired` is false, the server MUST log a WARNING at startup about insecure configuration.

**REQ-SEC-CROSS-007**: TLS certificate verification MUST be enabled by default. Disabling verification MUST require explicit configuration and log a WARNING.

**REQ-SEC-CROSS-008**: The server SHOULD support mTLS (mutual TLS) for environments requiring client certificate authentication.

#### 18.8.3 Privacy Controls

**REQ-PRIV-001**: The `username` field MUST be optional. If omitted, user-based visibility filtering is unavailable.

**REQ-PRIV-002**: The `projectId` field MUST use a hashed/opaque identifier derived from the project path, not the path itself. This provides project isolation without exposing filesystem structure.

**REQ-PRIV-003**: Discovery results MUST respect visibility settings and never expose private data.

**REQ-PRIV-004**: The server MUST provide a tool `get_my_registration` to allow agents to see exactly what metadata they are publishing.

#### 18.8.4 Rate Limiting and Abuse Prevention

**REQ-ABUSE-001**: Registry updates MUST be rate-limited to a maximum of 1 update per 10 seconds per GUID (excluding heartbeats).

**REQ-ABUSE-002**: Discovery queries MUST be rate-limited to a maximum of 10 queries per minute per agent.

**REQ-ABUSE-003**: Direct messages MUST be rate-limited to a maximum of 100 messages per minute per agent.

**REQ-ABUSE-004**: Work broadcasts MUST be rate-limited to a maximum of 10 broadcasts per minute per agent.

**REQ-ABUSE-005**: Rate limit violations MUST return an error with retry-after information.

**REQ-ABUSE-006**: Repeated rate limit violations SHOULD be logged for monitoring.

### 18.9 Cross-Computer Testing Requirements

**REQ-TEST-CROSS-001**: Integration tests MUST verify agent registration and discovery across simulated multiple hosts.

**REQ-TEST-CROSS-002**: Integration tests MUST verify direct messaging between agents with different GUIDs.

**REQ-TEST-CROSS-003**: Integration tests MUST verify visibility filtering (project-only agents not visible to other projects).

**REQ-TEST-CROSS-004**: Integration tests MUST verify heartbeat mechanism and liveness detection.

**REQ-TEST-CROSS-005**: Integration tests MUST verify garbage collection removes stale registry entries.

**REQ-TEST-CROSS-006**: Integration tests MUST verify work handoff protocol (offer, claim, accept, progress, completion).

**REQ-TEST-CROSS-006a**: Integration tests MUST verify dead letter queue behavior:
- Work items move to DLQ after max delivery attempts
- `list_dead_letter_items` returns failed items
- `retry_dead_letter_item` successfully requeues items
- `discard_dead_letter_item` permanently removes items
- DLQ TTL expiration works correctly

**REQ-TEST-CROSS-007**: Security tests SHOULD verify authentication enforcement when authentication is enabled.

**REQ-TEST-CROSS-008**: Security tests MUST verify that visibility restrictions are enforced.

**REQ-TEST-CROSS-009**: Performance tests MUST measure registry read/write latency with 100+ registered agents.

**REQ-TEST-CROSS-010**: Failure tests MUST verify graceful handling of NATS cluster unavailability.

### 18.10 Migration and Compatibility

**REQ-COMPAT-001**: Single-computer deployments (cross-computer disabled) MUST continue to work exactly as specified in Sections 1-17.

**REQ-COMPAT-002**: Enabling cross-computer features MUST NOT break existing project channel functionality.

**REQ-COMPAT-003**: The `set_handle` and channel messaging tools MUST continue to work independently of cross-computer registration.

**REQ-COMPAT-004**: An agent MAY use project channels without registering for cross-computer features.

**REQ-COMPAT-005**: An agent MUST register (`register_agent`) before using any cross-computer tools (`discover_agents`, `send_direct_message`, etc.).

### 18.11 Example Cross-Computer Configuration

**User-Level MCP Configuration** (`~/.claude/mcp.json`):
```json
{
  "mcpServers": {
    "nats-mcp": {
      "command": "nats-mcp-server",
      "env": {
        "NATS_URL": "nats://localhost:4222",
        "CROSS_COMPUTER_ENABLED": "true",
        "NATS_CLUSTER_URLS": "nats://nats.example.com:4222,nats://nats2.example.com:4222",
        "TLS_REQUIRED": "true",
        "NATS_TLS_CA": "/path/to/ca.crt"
      }
    }
  }
}
```

**Project-Level Configuration** (`.mcp-config.json`):
```json
{
  "namespace": "my-project",
  "channels": [
    {"name": "planning", "description": "Sprint planning"},
    {"name": "implementation", "description": "Development coordination"},
    {"name": "review", "description": "Code review discussions"}
  ],
  "crossComputer": {
    "enabled": true,
    "acknowledgment": "I understand the security implications",
    "natsClusterUrls": ["nats://nats.example.com:4222"],
    "tlsRequired": true,
    "defaultVisibility": "project-only",
    "autoRegister": true,
    "defaultAgentType": "developer",
    "defaultCapabilities": ["typescript", "testing", "code-review"]
  }
}
```

### 18.12 Example Cross-Computer Workflows

#### 18.12.1 Multi-Computer Dispatcher Pattern

```typescript
// On Computer A: Dispatcher Agent
await register_agent({
  agentType: "dispatcher",
  capabilities: ["coordination", "task-assignment"],
  scope: "cross-project",
  visibility: "public"
});

// Find available workers across all computers
const workers = await discover_agents({
  agentType: "tdd-engineer",
  status: "idle",
  capability: "typescript"
});

// Broadcast work offer to all eligible workers
await broadcast_work_offer({
  taskId: "TASK-001",
  taskDescription: "Implement user authentication module",
  requiredCapabilities: ["typescript", "testing"],
  targetAgentTypes: ["tdd-engineer"]
});

// Wait for claims via direct messages
const messages = await read_direct_messages({ messageType: "work-claim" });
```

#### 18.12.2 Multi-Computer Worker Pattern

```typescript
// On Computer B: TDD Engineer Agent
const registration = await register_agent({
  agentType: "tdd-engineer",
  capabilities: ["typescript", "testing", "refactoring"],
  scope: "project",
  visibility: "public"
});

// Check for work offers
const offers = await read_direct_messages({ messageType: "work-offer" });

if (offers.length > 0) {
  const offer = offers[0];

  // Claim the work
  await send_direct_message({
    recipientGuid: offer.senderGuid,
    message: "Claiming task",
    messageType: "work-claim",
    metadata: { taskId: offer.metadata.taskId }
  });

  // Update status
  await update_presence({ status: "busy", currentTaskCount: 1 });

  // Do the work...

  // Report completion
  await send_direct_message({
    recipientGuid: offer.senderGuid,
    message: "Task completed successfully",
    messageType: "completion",
    metadata: {
      taskId: offer.metadata.taskId,
      success: true,
      resultSummary: "Authentication module implemented with 95% test coverage"
    }
  });

  await update_presence({ status: "idle", currentTaskCount: 0 });
}
```

---

**Document Version:** 2.0
**Last Updated:** 2025-12-07
**Status:** Draft - Ready for Review
**Author:** Requirements Specification Generator
**Reviewers:** (To be assigned)
