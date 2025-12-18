# Scenario 05: Direct Messaging Tests

## Requirement ID
REQ-DM (Direct Messaging)

## Priority
P0 (Blocking for Beta)

## Purpose
Verify that agents can send and receive direct messages through the Warp MCP server with proper filtering, ordering, and offline queuing capabilities.

## Test Cases

### REQ-DM-001: Message delivery when recipient is online
**Procedure**:
1. Agent Alpha registers and stays online
2. Agent Beta registers
3. Beta sends DM to Alpha
4. Alpha reads inbox

**Acceptance Criteria**:
- Message MUST appear in Alpha's inbox
- Message content MUST match sender's input exactly
- Message metadata MUST include correct sender GUID, timestamp, messageType
- Error count MUST be 0

### REQ-DM-002: Offline message queuing
**Procedure**:
1. Alpha registers then disconnects
2. Beta sends 3 messages to Alpha
3. Alpha reconnects and reads inbox

**Acceptance Criteria**:
- All 3 messages MUST be in Alpha's inbox after reconnect
- Messages MUST be ordered by send timestamp (oldest first)
- No message loss (3 sent = 3 received)

### REQ-DM-003: Message filtering by type
**Procedure**:
1. Send messages with types "text", "work-offer", "status" to Alpha
2. Alpha reads with messageType filter

**Acceptance Criteria**:
- `read_direct_messages(messageType: "work-offer")` MUST return only work-offer messages
- Filtering MUST NOT delete unmatched messages (verify with unfiltered read)

### REQ-DM-004: Message filtering by sender
**Procedure**:
1. 3 agents (Alpha, Beta, Gamma) register
2. Beta and Gamma send messages to Alpha
3. Alpha reads with senderGuid filter

**Acceptance Criteria**:
- `read_direct_messages(senderGuid: X)` MUST return only messages from agent X
- Messages from other senders MUST still be available

### REQ-DM-005: Multiple messages - correct ordering
**Procedure**:
1. Beta sends 10 messages rapidly to Alpha
2. Alpha reads all messages

**Acceptance Criteria**:
- Messages MUST be ordered by timestamp ascending (oldest first)
- All 10 messages MUST be present

## Test Data
See `/test-scenarios/TEST_DATA.md` for standard test message payloads.

## Agents Involved

| Agent | Handle | Capabilities |
|-------|--------|--------------|
| Alpha | test-alpha | typescript, testing |
| Beta | test-beta | typescript, python |
| Gamma | test-gamma | code-review |
