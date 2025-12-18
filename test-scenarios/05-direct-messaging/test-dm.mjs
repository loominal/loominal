#!/usr/bin/env node
/**
 * Integration Test: REQ-DM - Direct Messaging
 * Tests all 5 direct messaging requirements
 */

import { connect } from 'nats';
import { randomUUID } from 'crypto';

const NATS_URL = process.env.NATS_URL || 'nats://192.168.7.16:4222';
const PROJECT_ID = '0123456789abcdef';

// Test results
const results = {
  'REQ-DM-001': { status: 'PENDING', details: '', duration: 0 },
  'REQ-DM-002': { status: 'PENDING', details: '', duration: 0 },
  'REQ-DM-003': { status: 'PENDING', details: '', duration: 0 },
  'REQ-DM-004': { status: 'PENDING', details: '', duration: 0 },
  'REQ-DM-005': { status: 'PENDING', details: '', duration: 0 },
};

// Utility: Register an agent
async function registerAgent(kv, handle, capabilities) {
  const guid = randomUUID();
  const agentData = {
    guid,
    handle,
    agentType: 'developer',
    capabilities,
    status: 'online',
    visibility: 'project-only',
    registeredAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
  };

  await kv.put(guid, JSON.stringify(agentData));
  return { guid, ...agentData };
}

// Utility: Send direct message
async function sendDirectMessage(js, namespace, recipientGuid, message, messageType = 'text', metadata = {}) {
  const streamName = `${namespace}_INBOX_${recipientGuid.replace(/-/g, '_')}`;
  const subject = `${namespace}.inbox.${recipientGuid}`;

  const dmPayload = {
    senderGuid: 'test-sender-guid',
    recipientGuid,
    message,
    messageType,
    metadata,
    timestamp: new Date().toISOString(),
  };

  await js.publish(subject, JSON.stringify(dmPayload));
  return dmPayload;
}

// Utility: Read direct messages
async function readDirectMessages(jsm, js, namespace, recipientGuid, filter = {}) {
  const streamName = `${namespace}_INBOX_${recipientGuid.replace(/-/g, '_')}`;

  try {
    const stream = await jsm.streams.info(streamName);

    // Create ephemeral consumer
    const consumerName = 'inbox-reader-' + Date.now();
    const consumer = await js.consumers.get(streamName, consumerName);

    const messages = [];
    const iter = await consumer.consume({ max_messages: 100 });

    for await (const msg of iter) {
      const data = JSON.parse(new TextDecoder().decode(msg.data));

      // Apply filters
      if (filter.messageType && data.messageType !== filter.messageType) {
        continue;
      }
      if (filter.senderGuid && data.senderGuid !== filter.senderGuid) {
        continue;
      }

      messages.push(data);
      msg.ack();
    }

    return messages;
  } catch (err) {
    if (err.message?.includes('stream not found')) {
      return [];
    }
    throw err;
  }
}

// Test REQ-DM-001: Message delivery when recipient is online
async function testDM001(nc, jsm, js, kv, namespace) {
  const start = Date.now();

  try {
    console.log('\nREQ-DM-001: Message delivery when recipient is online');

    // Register recipient agent
    const alpha = await registerAgent(kv, 'test-alpha', ['typescript', 'testing']);
    console.log(`  Registered agent: ${alpha.handle} (${alpha.guid})`);

    // Ensure inbox stream exists
    const streamName = `${namespace}_INBOX_${alpha.guid.replace(/-/g, '_')}`;
    const subject = `${namespace}.inbox.${alpha.guid}`;

    try {
      await jsm.streams.add({
        name: streamName,
        subjects: [subject],
        retention: 'limits',
        max_msgs: 1000,
        max_age: 86400_000_000_000, // 24 hours in nanoseconds
      });
    } catch (err) {
      if (!err.message?.includes('already exists')) {
        throw err;
      }
    }

    // Send message
    const testMessage = 'Test message from integration test';
    const sent = await sendDirectMessage(js, namespace, alpha.guid, testMessage, 'text');
    console.log(`  Sent message: "${testMessage}"`);

    // Wait a moment for delivery
    await new Promise(resolve => setTimeout(resolve, 500));

    // Read messages
    const messages = await readDirectMessages(jsm, js, namespace, alpha.guid);
    console.log(`  Received ${messages.length} messages`);

    // Verify
    if (messages.length === 0) {
      results['REQ-DM-001'].status = 'FAIL';
      results['REQ-DM-001'].details = 'No messages in inbox';
      return;
    }

    const receivedMsg = messages[0];

    if (receivedMsg.message !== testMessage) {
      results['REQ-DM-001'].status = 'FAIL';
      results['REQ-DM-001'].details = `Message mismatch: expected "${testMessage}", got "${receivedMsg.message}"`;
      return;
    }

    if (receivedMsg.messageType !== 'text') {
      results['REQ-DM-001'].status = 'FAIL';
      results['REQ-DM-001'].details = `Message type mismatch: expected "text", got "${receivedMsg.messageType}"`;
      return;
    }

    if (!receivedMsg.timestamp) {
      results['REQ-DM-001'].status = 'FAIL';
      results['REQ-DM-001'].details = 'Missing timestamp in message';
      return;
    }

    results['REQ-DM-001'].status = 'PASS';
    results['REQ-DM-001'].details = 'Message delivered correctly with all metadata';
    results['REQ-DM-001'].duration = Date.now() - start;
    console.log('  ✓ PASS');

  } catch (err) {
    results['REQ-DM-001'].status = 'FAIL';
    results['REQ-DM-001'].details = `Error: ${err.message}`;
    results['REQ-DM-001'].duration = Date.now() - start;
    console.log(`  ✗ FAIL: ${err.message}`);
  }
}

// Test REQ-DM-002: Offline message queuing
async function testDM002(nc, jsm, js, kv, namespace) {
  const start = Date.now();

  try {
    console.log('\nREQ-DM-002: Offline message queuing');

    // Register agent
    const alpha = await registerAgent(kv, 'test-alpha-offline', ['typescript']);
    console.log(`  Registered agent: ${alpha.handle} (${alpha.guid})`);

    // Ensure inbox stream exists
    const streamName = `${namespace}_INBOX_${alpha.guid.replace(/-/g, '_')}`;
    const subject = `${namespace}.inbox.${alpha.guid}`;

    try {
      await jsm.streams.add({
        name: streamName,
        subjects: [subject],
        retention: 'limits',
        max_msgs: 1000,
        max_age: 86400_000_000_000,
      });
    } catch (err) {
      if (!err.message?.includes('already exists')) {
        throw err;
      }
    }

    // Send 3 messages while "offline"
    const messages = [
      'Offline message 1',
      'Offline message 2',
      'Offline message 3',
    ];

    for (const msg of messages) {
      await sendDirectMessage(js, namespace, alpha.guid, msg, 'text');
      console.log(`  Sent: "${msg}"`);
    }

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 500));

    // "Reconnect" and read messages
    const received = await readDirectMessages(jsm, js, namespace, alpha.guid);
    console.log(`  Received ${received.length} messages after "reconnect"`);

    // Verify
    if (received.length !== 3) {
      results['REQ-DM-002'].status = 'FAIL';
      results['REQ-DM-002'].details = `Expected 3 messages, got ${received.length}`;
      return;
    }

    // Check ordering (oldest first)
    const receivedTexts = received.map(m => m.message);
    const expectedTexts = messages;

    if (JSON.stringify(receivedTexts) !== JSON.stringify(expectedTexts)) {
      results['REQ-DM-002'].status = 'FAIL';
      results['REQ-DM-002'].details = `Message order incorrect: ${JSON.stringify(receivedTexts)}`;
      return;
    }

    results['REQ-DM-002'].status = 'PASS';
    results['REQ-DM-002'].details = 'All 3 messages queued and delivered in order';
    results['REQ-DM-002'].duration = Date.now() - start;
    console.log('  ✓ PASS');

  } catch (err) {
    results['REQ-DM-002'].status = 'FAIL';
    results['REQ-DM-002'].details = `Error: ${err.message}`;
    results['REQ-DM-002'].duration = Date.now() - start;
    console.log(`  ✗ FAIL: ${err.message}`);
  }
}

// Test REQ-DM-003: Message filtering by type
async function testDM003(nc, jsm, js, kv, namespace) {
  const start = Date.now();

  try {
    console.log('\nREQ-DM-003: Message filtering by type');

    const alpha = await registerAgent(kv, 'test-alpha-filter', ['typescript']);
    console.log(`  Registered agent: ${alpha.handle}`);

    // Ensure inbox stream exists
    const streamName = `${namespace}_INBOX_${alpha.guid.replace(/-/g, '_')}`;
    const subject = `${namespace}.inbox.${alpha.guid}`;

    try {
      await jsm.streams.add({
        name: streamName,
        subjects: [subject],
        retention: 'limits',
        max_msgs: 1000,
        max_age: 86400_000_000_000,
      });
    } catch (err) {
      if (!err.message?.includes('already exists')) {
        throw err;
      }
    }

    // Send mixed message types
    await sendDirectMessage(js, namespace, alpha.guid, 'Text message', 'text');
    await sendDirectMessage(js, namespace, alpha.guid, 'Work offer message', 'work-offer');
    await sendDirectMessage(js, namespace, alpha.guid, 'Status message', 'status');
    console.log('  Sent 3 messages with different types');

    await new Promise(resolve => setTimeout(resolve, 500));

    // Read with filter
    const workOffers = await readDirectMessages(jsm, js, namespace, alpha.guid, { messageType: 'work-offer' });
    console.log(`  Filtered for 'work-offer': ${workOffers.length} messages`);

    if (workOffers.length !== 1) {
      results['REQ-DM-003'].status = 'FAIL';
      results['REQ-DM-003'].details = `Expected 1 work-offer message, got ${workOffers.length}`;
      return;
    }

    if (workOffers[0].message !== 'Work offer message') {
      results['REQ-DM-003'].status = 'FAIL';
      results['REQ-DM-003'].details = 'Wrong message content for filtered result';
      return;
    }

    // Verify unfiltered still shows all messages
    const allMessages = await readDirectMessages(jsm, js, namespace, alpha.guid);
    if (allMessages.length !== 3) {
      results['REQ-DM-003'].status = 'FAIL';
      results['REQ-DM-003'].details = `Filter deleted messages - expected 3 total, got ${allMessages.length}`;
      return;
    }

    results['REQ-DM-003'].status = 'PASS';
    results['REQ-DM-003'].details = 'Filtering by messageType works correctly';
    results['REQ-DM-003'].duration = Date.now() - start;
    console.log('  ✓ PASS');

  } catch (err) {
    results['REQ-DM-003'].status = 'FAIL';
    results['REQ-DM-003'].details = `Error: ${err.message}`;
    results['REQ-DM-003'].duration = Date.now() - start;
    console.log(`  ✗ FAIL: ${err.message}`);
  }
}

// Test REQ-DM-004: Message filtering by sender
async function testDM004(nc, jsm, js, kv, namespace) {
  const start = Date.now();

  try {
    console.log('\nREQ-DM-004: Message filtering by sender');

    const alpha = await registerAgent(kv, 'test-alpha-sender-filter', ['typescript']);
    const beta = await registerAgent(kv, 'test-beta-sender', ['python']);
    const gamma = await registerAgent(kv, 'test-gamma-sender', ['code-review']);

    console.log(`  Registered 3 agents`);

    // Ensure inbox stream exists for alpha
    const streamName = `${namespace}_INBOX_${alpha.guid.replace(/-/g, '_')}`;
    const subject = `${namespace}.inbox.${alpha.guid}`;

    try {
      await jsm.streams.add({
        name: streamName,
        subjects: [subject],
        retention: 'limits',
        max_msgs: 1000,
        max_age: 86400_000_000_000,
      });
    } catch (err) {
      if (!err.message?.includes('already exists')) {
        throw err;
      }
    }

    // Send messages from different senders (simulated)
    await js.publish(subject, JSON.stringify({
      senderGuid: beta.guid,
      recipientGuid: alpha.guid,
      message: 'Message from Beta',
      messageType: 'text',
      timestamp: new Date().toISOString(),
    }));

    await js.publish(subject, JSON.stringify({
      senderGuid: gamma.guid,
      recipientGuid: alpha.guid,
      message: 'Message from Gamma',
      messageType: 'text',
      timestamp: new Date().toISOString(),
    }));

    await js.publish(subject, JSON.stringify({
      senderGuid: beta.guid,
      recipientGuid: alpha.guid,
      message: 'Another message from Beta',
      messageType: 'text',
      timestamp: new Date().toISOString(),
    }));

    console.log('  Sent 3 messages from different senders');

    await new Promise(resolve => setTimeout(resolve, 500));

    // Filter by Beta's GUID
    const betaMessages = await readDirectMessages(jsm, js, namespace, alpha.guid, { senderGuid: beta.guid });
    console.log(`  Filtered for Beta: ${betaMessages.length} messages`);

    if (betaMessages.length !== 2) {
      results['REQ-DM-004'].status = 'FAIL';
      results['REQ-DM-004'].details = `Expected 2 messages from Beta, got ${betaMessages.length}`;
      return;
    }

    // Verify all messages still available
    const allMessages = await readDirectMessages(jsm, js, namespace, alpha.guid);
    if (allMessages.length !== 3) {
      results['REQ-DM-004'].status = 'FAIL';
      results['REQ-DM-004'].details = `Expected 3 total messages, got ${allMessages.length}`;
      return;
    }

    results['REQ-DM-004'].status = 'PASS';
    results['REQ-DM-004'].details = 'Filtering by senderGuid works correctly';
    results['REQ-DM-004'].duration = Date.now() - start;
    console.log('  ✓ PASS');

  } catch (err) {
    results['REQ-DM-004'].status = 'FAIL';
    results['REQ-DM-004'].details = `Error: ${err.message}`;
    results['REQ-DM-004'].duration = Date.now() - start;
    console.log(`  ✗ FAIL: ${err.message}`);
  }
}

// Test REQ-DM-005: Multiple messages - correct ordering
async function testDM005(nc, jsm, js, kv, namespace) {
  const start = Date.now();

  try {
    console.log('\nREQ-DM-005: Multiple messages - correct ordering');

    const alpha = await registerAgent(kv, 'test-alpha-ordering', ['typescript']);
    console.log(`  Registered agent: ${alpha.handle}`);

    // Ensure inbox stream exists
    const streamName = `${namespace}_INBOX_${alpha.guid.replace(/-/g, '_')}`;
    const subject = `${namespace}.inbox.${alpha.guid}`;

    try {
      await jsm.streams.add({
        name: streamName,
        subjects: [subject],
        retention: 'limits',
        max_msgs: 1000,
        max_age: 86400_000_000_000,
      });
    } catch (err) {
      if (!err.message?.includes('already exists')) {
        throw err;
      }
    }

    // Send 10 messages rapidly
    const expectedMessages = [];
    for (let i = 1; i <= 10; i++) {
      const msg = `Message ${i} of 10`;
      expectedMessages.push(msg);
      await sendDirectMessage(js, namespace, alpha.guid, msg, 'text');
      // Small delay to ensure ordering
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    console.log('  Sent 10 messages rapidly');

    await new Promise(resolve => setTimeout(resolve, 500));

    // Read all messages
    const received = await readDirectMessages(jsm, js, namespace, alpha.guid);
    console.log(`  Received ${received.length} messages`);

    if (received.length !== 10) {
      results['REQ-DM-005'].status = 'FAIL';
      results['REQ-DM-005'].details = `Expected 10 messages, got ${received.length}`;
      return;
    }

    // Verify ordering (oldest first)
    const receivedTexts = received.map(m => m.message);

    for (let i = 0; i < 10; i++) {
      if (receivedTexts[i] !== expectedMessages[i]) {
        results['REQ-DM-005'].status = 'FAIL';
        results['REQ-DM-005'].details = `Message order incorrect at position ${i}: expected "${expectedMessages[i]}", got "${receivedTexts[i]}"`;
        return;
      }
    }

    // Verify timestamps are ascending
    for (let i = 1; i < received.length; i++) {
      const prevTime = new Date(received[i-1].timestamp);
      const currTime = new Date(received[i].timestamp);
      if (currTime < prevTime) {
        results['REQ-DM-005'].status = 'FAIL';
        results['REQ-DM-005'].details = `Timestamp ordering incorrect at position ${i}`;
        return;
      }
    }

    results['REQ-DM-005'].status = 'PASS';
    results['REQ-DM-005'].details = 'All 10 messages in correct order with ascending timestamps';
    results['REQ-DM-005'].duration = Date.now() - start;
    console.log('  ✓ PASS');

  } catch (err) {
    results['REQ-DM-005'].status = 'FAIL';
    results['REQ-DM-005'].details = `Error: ${err.message}`;
    results['REQ-DM-005'].duration = Date.now() - start;
    console.log(`  ✗ FAIL: ${err.message}`);
  }
}

// Main execution
async function main() {
  console.log('='.repeat(70));
  console.log('Integration Test: REQ-DM - Direct Messaging');
  console.log('='.repeat(70));
  console.log(`NATS URL: ${NATS_URL}`);
  console.log(`Project ID: ${PROJECT_ID}`);
  console.log(`Test Start: ${new Date().toISOString()}`);

  const nc = await connect({ servers: NATS_URL });
  const jsm = await nc.jetstreamManager();
  const js = nc.jetstream();
  // Use the shared agent-registry bucket (matches both Warp and Weft)
  const kv = await js.views.kv('agent-registry', {
    history: 1,
  });

  const namespace = PROJECT_ID.replace(/-/g, '_');

  // Run all tests
  await testDM001(nc, jsm, js, kv, namespace);
  await testDM002(nc, jsm, js, kv, namespace);
  await testDM003(nc, jsm, js, kv, namespace);
  await testDM004(nc, jsm, js, kv, namespace);
  await testDM005(nc, jsm, js, kv, namespace);

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));

  let passCount = 0;
  let failCount = 0;

  for (const [testId, result] of Object.entries(results)) {
    const status = result.status === 'PASS' ? '✓ PASS' : '✗ FAIL';
    const duration = result.duration ? `${result.duration}ms` : 'N/A';
    console.log(`${testId}: ${status} (${duration})`);
    console.log(`  ${result.details}`);

    if (result.status === 'PASS') passCount++;
    if (result.status === 'FAIL') failCount++;
  }

  console.log('\n' + '-'.repeat(70));
  console.log(`Total: ${passCount} passed, ${failCount} failed`);
  console.log(`Test End: ${new Date().toISOString()}`);
  console.log('='.repeat(70));

  await nc.drain();

  // Exit with error code if any tests failed
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
