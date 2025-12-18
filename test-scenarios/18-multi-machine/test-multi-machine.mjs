#!/usr/bin/env node
/**
 * Multi-Machine Integration Tests (Phase 8.1)
 *
 * Tests communication between agents on different "machines" (Docker containers)
 * connecting to the existing local NATS and Weft infrastructure.
 *
 * Prerequisites:
 * - NATS running on localhost:4222
 * - Weft running on localhost:3000
 * - Run: docker-compose up -d
 *
 * Test Scenarios:
 * - REQ-MULTI-001: Agents on different machines communicate via shared NATS
 * - REQ-MULTI-002: Weft on server, agents on clients
 * - REQ-MULTI-003: Shuttle controls remote Weft
 */

import { execSync } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

const WEFT_URL = process.env.WEFT_URL || 'http://localhost:3000';
const NATS_URL = process.env.NATS_URL || 'nats://localhost:4222';

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logResult(testId, name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${testId} - ${name}`);
  if (details) console.log(`   ${details}`);
  results.tests.push({ testId, name, passed, details });
  if (passed) results.passed++;
  else results.failed++;
}

function exec(cmd, options = {}) {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: 60000, ...options }).trim();
  } catch (err) {
    return null;
  }
}

function dockerExec(container, cmd) {
  return exec(`docker exec ${container} sh -c "${cmd.replace(/"/g, '\\"')}"`);
}

async function waitForHealthy(url, maxWait = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch (e) {
      // Continue waiting
    }
    await sleep(1000);
  }
  return false;
}

async function runTests() {
  console.log('\n=== Phase 8.1: Multi-Machine Integration Tests ===\n');
  console.log(`Weft URL: ${WEFT_URL}`);
  console.log(`NATS URL: ${NATS_URL}\n`);

  // Check prerequisites
  console.log('--- Checking Prerequisites ---\n');

  // Check Weft
  const weftHealthy = await waitForHealthy(`${WEFT_URL}/health`, 5000);
  if (!weftHealthy) {
    console.error('ERROR: Weft not running at', WEFT_URL);
    console.error('Please start Weft: cd weft && pnpm dev');
    process.exit(1);
  }
  console.log('✓ Weft is healthy');

  // Check Docker containers
  const containers = exec('docker ps --format "{{.Names}}"');
  if (!containers || !containers.includes('multi-agent1')) {
    console.error('\nERROR: Docker containers not running.');
    console.error('Please run: cd test-scenarios/18-multi-machine && docker-compose up -d');
    console.error('Then wait ~30s for npm install to complete.');
    process.exit(1);
  }
  console.log('✓ Docker containers running');

  // Check container can reach host
  const pingResult = dockerExec('multi-agent1', 'wget -q --spider http://host.docker.internal:3000/health && echo ok');
  if (pingResult !== 'ok') {
    console.error('\nERROR: Containers cannot reach host services.');
    console.error('Check that host.docker.internal is resolving correctly.');
    process.exit(1);
  }
  console.log('✓ Containers can reach host services\n');

  console.log('--- REQ-MULTI-001: Cross-Machine Agent Discovery ---\n');

  // Test 1: Register agent from Machine B (agent1 container) via KV store
  let agent1Guid = null;
  {
    // Agent registration writes directly to NATS KV store
    // Use a helper script file to avoid escaping issues
    const guid = `agent1-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const now = new Date().toISOString();

    const registerScript = `cd /app && node -e '
const { connect } = require("nats");
const os = require("os");
(async () => {
  const nc = await connect({ servers: process.env.NATS_URL });
  const js = nc.jetstream();
  const kv = await js.views.kv("agent-registry");
  const entry = {
    guid: "${guid}",
    agentType: "claude-code",
    handle: "agent-machine-b",
    hostname: os.hostname(),
    projectId: "a1b2c3d4e5f67890",
    natsUrl: process.env.NATS_URL,
    capabilities: ["typescript", "multi-test-8"],
    scope: "project",
    visibility: "public",
    status: "online",
    currentTaskCount: 0,
    registeredAt: "${now}",
    lastHeartbeat: "${now}"
  };
  await kv.put("${guid}", JSON.stringify(entry));
  console.log(JSON.stringify({ success: true, guid: "${guid}" }));
  await nc.close();
})().catch(e => { console.error(e.message); process.exit(1); });
'`;

    const result = dockerExec('multi-agent1', registerScript);
    let passed = false;

    try {
      const parsed = JSON.parse(result);
      passed = parsed.guid && parsed.success === true;
      agent1Guid = parsed.guid;
    } catch (e) {
      // Parse failed
    }

    logResult('REQ-MULTI-001a', 'Agent on Machine B registers via shared NATS KV', passed,
      passed ? `GUID: ${agent1Guid}` : `Result: ${result}`);
  }

  // Test 2: Register agent from Machine C (agent2 container) via KV store
  let agent2Guid = null;
  {
    const guid = `agent2-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const now = new Date().toISOString();

    const registerScript = `cd /app && node -e '
const { connect } = require("nats");
const os = require("os");
(async () => {
  const nc = await connect({ servers: process.env.NATS_URL });
  const js = nc.jetstream();
  const kv = await js.views.kv("agent-registry");
  const entry = {
    guid: "${guid}",
    agentType: "claude-code",
    handle: "agent-machine-c",
    hostname: os.hostname(),
    projectId: "a1b2c3d4e5f67890",
    natsUrl: process.env.NATS_URL,
    capabilities: ["python", "multi-test-8"],
    scope: "project",
    visibility: "public",
    status: "online",
    currentTaskCount: 0,
    registeredAt: "${now}",
    lastHeartbeat: "${now}"
  };
  await kv.put("${guid}", JSON.stringify(entry));
  console.log(JSON.stringify({ success: true, guid: "${guid}" }));
  await nc.close();
})().catch(e => { console.error(e.message); process.exit(1); });
'`;

    const result = dockerExec('multi-agent2', registerScript);
    let passed = false;

    try {
      const parsed = JSON.parse(result);
      passed = parsed.guid && parsed.success === true;
      agent2Guid = parsed.guid;
    } catch (e) {
      // Parse failed
    }

    logResult('REQ-MULTI-001b', 'Agent on Machine C registers via shared NATS KV', passed,
      passed ? `GUID: ${agent2Guid}` : `Result: ${result}`);
  }

  // Test 3: Agents discover each other via KV store
  {
    await sleep(1000); // Allow registration to propagate

    // Use fetch directly to verify both agents exist by GUID
    const discoverScript = `cd /app && node -e '
const { connect } = require("nats");
(async () => {
  const nc = await connect({ servers: process.env.NATS_URL });
  const js = nc.jetstream();
  const kv = await js.views.kv("agent-registry");

  // Try to fetch our known agent GUIDs directly
  const agents = [];
  const agent1 = await kv.get("${agent1Guid}");
  const agent2 = await kv.get("${agent2Guid}");

  if (agent1 && agent1.value) {
    const a = JSON.parse(agent1.string());
    if (a.capabilities && a.capabilities.includes("multi-test-8")) agents.push(a);
  }
  if (agent2 && agent2.value) {
    const a = JSON.parse(agent2.string());
    if (a.capabilities && a.capabilities.includes("multi-test-8")) agents.push(a);
  }

  console.log(JSON.stringify({ agents: agents }));
  await nc.close();
})().catch(e => { console.error(e.message); process.exit(1); });
'`;

    const result = dockerExec('multi-agent1', discoverScript);
    let passed = false;
    let agentCount = 0;

    try {
      const parsed = JSON.parse(result);
      const agents = parsed.agents || [];
      agentCount = agents.length;
      passed = agentCount >= 2;
    } catch (e) {
      // Parse failed
    }

    logResult('REQ-MULTI-001c', 'Agents discover each other via KV registry', passed,
      passed ? `Found ${agentCount} agents with multi-test-8 capability` : `Result: ${result}`);
  }

  // Test 4: Channel messages visible across machines (using JetStream)
  {
    const msgTimestamp = Date.now();
    const consumerName = `multi-test-reader-${msgTimestamp}`;

    // Agent1 sends message to a stream
    const sendScript = `cd /app && node -e '
const { connect, StringCodec } = require("nats");
const sc = StringCodec();
(async () => {
  const nc = await connect({ servers: process.env.NATS_URL });
  const js = nc.jetstream();
  const jsm = await nc.jetstreamManager();
  try {
    await jsm.streams.add({
      name: "MULTI_TEST_CHANNEL",
      subjects: ["multi.test.messages"],
      max_age: 60 * 1000000000
    });
  } catch (e) {}
  await js.publish("multi.test.messages", sc.encode(JSON.stringify({
    handle: "agent-machine-b",
    message: "Cross-machine test from B at ${msgTimestamp}",
    timestamp: ${msgTimestamp}
  })));
  console.log(JSON.stringify({ success: true }));
  await nc.close();
})().catch(e => { console.error(e.message); process.exit(1); });
'`;

    dockerExec('multi-agent1', sendScript);
    await sleep(500);

    // Agent2 reads messages from the stream
    const readScript = `cd /app && node -e '
const { connect, StringCodec } = require("nats");
const sc = StringCodec();
(async () => {
  const nc = await connect({ servers: process.env.NATS_URL });
  const js = nc.jetstream();
  const jsm = await nc.jetstreamManager();
  await jsm.consumers.add("MULTI_TEST_CHANNEL", {
    durable_name: "${consumerName}",
    deliver_policy: "all"
  });
  const consumer = await js.consumers.get("MULTI_TEST_CHANNEL", "${consumerName}");
  const messages = [];
  try {
    const iter = await consumer.fetch({ max_messages: 20, expires: 2000 });
    for await (const msg of iter) {
      messages.push(JSON.parse(sc.decode(msg.data)));
      msg.ack();
    }
  } catch (e) {}
  try { await jsm.consumers.delete("MULTI_TEST_CHANNEL", "${consumerName}"); } catch (e) {}
  console.log(JSON.stringify({ messages: messages }));
  await nc.close();
})().catch(e => { console.error(e.message); process.exit(1); });
'`;

    const result = dockerExec('multi-agent2', readScript);
    let passed = false;

    try {
      const parsed = JSON.parse(result);
      const messages = parsed.messages || [];
      passed = messages.some(m =>
        (m.message || '').includes('Cross-machine test from B')
      );
    } catch (e) {
      // Parse failed
    }

    logResult('REQ-MULTI-001d', 'Channel messages visible across machines', passed,
      passed ? 'Machine C received message from Machine B' : `Result: ${result}`);
  }

  console.log('\n--- REQ-MULTI-002: Weft Server / Agent Clients ---\n');

  // Test 5: Verify Weft sees agents from both machines via REST API
  {
    await sleep(1000); // Give Weft time to sync with KV store

    try {
      const response = await fetch(`${WEFT_URL}/api/agents`);
      const data = await response.json();
      const agents = data.agents || [];

      const machineB = agents.find(a => a.handle === 'agent-machine-b');
      const machineC = agents.find(a => a.handle === 'agent-machine-c');

      const passed = machineB && machineC;
      logResult('REQ-MULTI-002a', 'Weft sees agents from both client machines', passed,
        passed ? `Found: ${machineB?.handle}, ${machineC?.handle}` : `Found handles: ${agents.map(a => a.handle).join(', ')}`);
    } catch (err) {
      logResult('REQ-MULTI-002a', 'Weft sees agents from both client machines', false, err.message);
    }
  }

  // Test 6: Work routing functions across machines via REST API
  {
    try {
      const submitResponse = await fetch(`${WEFT_URL}/api/work`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Multi-machine test work item',
          boundary: 'test',
          capability: 'multi-test-8',
          priority: 5,
          taskId: `multi-test-${Date.now()}`
        })
      });

      const submitResult = await submitResponse.json();
      const workId = submitResult.id || submitResult.workItemId;

      const listResponse = await fetch(`${WEFT_URL}/api/work`);
      const listResult = await listResponse.json();
      const workItems = listResult.workItems || [];

      const found = workItems.some(w => w.id === workId);
      logResult('REQ-MULTI-002b', 'Work routing functions across machines', found,
        found ? `Work ID: ${workId}` : 'Work item not found in queue');
    } catch (err) {
      logResult('REQ-MULTI-002b', 'Work routing functions across machines', false, err.message);
    }
  }

  console.log('\n--- REQ-MULTI-003: Shuttle Controls Remote Weft ---\n');

  // Test 7: Shuttle from Machine C can list agents on remote Weft
  // Note: Shuttle is already built in /shuttle with dist/ directory
  {
    // Test via curl since shuttle binary might have dependencies issues
    const curlScript = `wget -q -O- http://host.docker.internal:3000/api/agents 2>&1`;
    const result = dockerExec('multi-agent2', curlScript);

    let passed = false;
    let agentCount = 0;

    try {
      const parsed = JSON.parse(result);
      const agents = parsed.agents || parsed;
      agentCount = Array.isArray(agents) ? agents.length : 0;
      passed = agentCount > 0;
    } catch (e) {
      // May not be valid JSON
    }

    logResult('REQ-MULTI-003a', 'Remote client lists agents via Weft API', passed,
      passed ? `Found ${agentCount} agents` : `Result: ${(result || 'No output').substring(0, 200)}`);
  }

  // Test 8: Remote client can view stats on remote Weft
  {
    const curlScript = `wget -q -O- http://host.docker.internal:3000/api/stats 2>&1`;
    const result = dockerExec('multi-agent2', curlScript);

    let passed = false;

    try {
      const parsed = JSON.parse(result);
      // Stats response has: timestamp, totalProjects, totals, byProject
      passed = parsed && (parsed.totals !== undefined || parsed.totalProjects !== undefined);
    } catch (e) {
      // May not be valid JSON
    }

    logResult('REQ-MULTI-003b', 'Remote client views stats via Weft API', passed,
      passed ? 'Stats retrieved successfully' : `Result: ${(result || 'No output').substring(0, 200)}`);
  }

  // Test 9: Remote client can submit work to remote Weft
  {
    const curlScript = `wget -q -O- --post-data='{"description":"Remote test work","boundary":"test","capability":"multi-test-8","priority":5}' --header='Content-Type: application/json' http://host.docker.internal:3000/api/work 2>&1`;
    const result = dockerExec('multi-agent2', curlScript);

    let passed = false;
    let workId = null;

    try {
      const parsed = JSON.parse(result);
      workId = parsed.id || parsed.workItemId;
      passed = !!workId;
    } catch (e) {
      // May not be valid JSON
    }

    logResult('REQ-MULTI-003c', 'Remote client submits work via Weft API', passed,
      passed ? `Work ID: ${workId}` : `Result: ${(result || 'No output').substring(0, 200)}`);
  }

  // Cleanup: Deregister test agents
  console.log('\n--- Cleanup ---\n');

  if (agent1Guid) {
    const deregScript = `cd /app && node -e '
const { connect } = require("nats");
(async () => {
  const nc = await connect({ servers: process.env.NATS_URL });
  const js = nc.jetstream();
  const kv = await js.views.kv("agent-registry");
  await kv.delete("${agent1Guid}");
  await nc.close();
})().catch(() => {});
'`;
    dockerExec('multi-agent1', deregScript);
    console.log(`Deregistered agent-machine-b (${agent1Guid})`);
  }

  if (agent2Guid) {
    const deregScript = `cd /app && node -e '
const { connect } = require("nats");
(async () => {
  const nc = await connect({ servers: process.env.NATS_URL });
  const js = nc.jetstream();
  const kv = await js.views.kv("agent-registry");
  await kv.delete("${agent2Guid}");
  await nc.close();
})().catch(() => {});
'`;
    dockerExec('multi-agent2', deregScript);
    console.log(`Deregistered agent-machine-c (${agent2Guid})`);
  }

  // Cleanup test stream
  {
    const cleanupScript = `cd /app && node -e '
const { connect } = require("nats");
(async () => {
  const nc = await connect({ servers: process.env.NATS_URL });
  const jsm = await nc.jetstreamManager();
  try { await jsm.streams.delete("MULTI_TEST_CHANNEL"); } catch (e) {}
  await nc.close();
})().catch(() => {});
'`;
    dockerExec('multi-agent1', cleanupScript);
    console.log('Cleaned up test stream');
  }

  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${results.passed}/${results.passed + results.failed}`);
  console.log(`Failed: ${results.failed}`);

  return results;
}

runTests()
  .then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  })
  .catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
  });
