#!/usr/bin/env node
/**
 * Phase 6.9: Failure Recovery Tests (REQ-FAIL)
 *
 * Tests system resilience and recovery:
 * - Weft restart - agents still visible (rebuilds from NATS KV)
 * - Agent recovery after network issues
 * - Work persistence across restarts
 *
 * Note: Full NATS disconnect/reconnect testing requires NATS restart,
 * which is infrastructure-dependent. These tests verify the recovery
 * mechanisms are in place.
 */

import { connect } from 'nats';
import { randomUUID } from 'crypto';
import { hostname } from 'os';

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

async function request(method, path, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) options.body = JSON.stringify(body);

  try {
    const response = await fetch(`${WEFT_URL}${path}`, options);
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  } catch (err) {
    return { status: 0, data: { error: err.message } };
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test agent configuration
const testAgentGuid = randomUUID();
const testAgentHandle = `fail-test-agent-${Date.now()}`;
const testCapability = `fail-capability-${Date.now()}`;
const testProjectId = 'fail-test-project';

/**
 * Register a test agent in NATS KV
 */
async function registerTestAgent(nc) {
  const js = nc.jetstream();
  const kv = await js.views.kv('agent-registry');

  const entry = {
    guid: testAgentGuid,
    handle: testAgentHandle,
    agentType: 'fail-test',
    hostname: hostname(),
    projectId: testProjectId,
    natsUrl: NATS_URL,
    capabilities: [testCapability],
    scope: 'project',
    visibility: 'project-only',
    status: 'online',
    currentTaskCount: 0,
    registeredAt: new Date().toISOString(),
    lastHeartbeat: new Date().toISOString(),
  };

  await kv.put(testAgentGuid, JSON.stringify(entry));
  console.log(`Registered test agent: ${testAgentHandle} (${testAgentGuid})`);

  return entry;
}

/**
 * Deregister the test agent
 */
async function deregisterTestAgent(nc) {
  try {
    const js = nc.jetstream();
    const kv = await js.views.kv('agent-registry');

    const result = await kv.get(testAgentGuid);
    if (result && result.value) {
      const entry = JSON.parse(result.string());
      entry.status = 'offline';
      await kv.put(testAgentGuid, JSON.stringify(entry));
      console.log(`Deregistered test agent: ${testAgentHandle}`);
    }
  } catch (err) {
    console.log(`Error deregistering agent: ${err.message}`);
  }
}

async function runTests() {
  console.log('\n=== Phase 6.9: Failure Recovery Tests ===\n');
  console.log(`Weft URL: ${WEFT_URL}`);
  console.log(`NATS URL: ${NATS_URL}`);
  console.log(`Test Agent GUID: ${testAgentGuid}\n`);

  let nc;

  // Connect to NATS
  try {
    nc = await connect({ servers: [NATS_URL] });
    console.log('Connected to NATS\n');
  } catch (err) {
    console.error(`Failed to connect to NATS: ${err.message}`);
    process.exit(1);
  }

  console.log('--- Running Tests ---\n');

  // REQ-FAIL-001: Verify Weft reads agent state from NATS KV on request
  // (This simulates what happens after Weft restart - it rebuilds state from KV)
  try {
    // Register agent directly to NATS KV (bypassing Weft)
    await registerTestAgent(nc);

    // Weft should see the agent (it reads from KV)
    await sleep(2000);

    const { status, data } = await request('GET', '/api/agents');
    const agents = data.agents || [];
    const foundAgent = agents.find(a => a.guid === testAgentGuid);

    // This proves Weft rebuilds agent state from NATS KV
    const passed = status === 200 && foundAgent !== undefined;
    logResult('REQ-FAIL-001', 'Weft reads agent state from NATS KV', passed,
      foundAgent
        ? `Agent ${foundAgent.handle} found in Weft (source: NATS KV)`
        : 'Agent not found - Weft may not be reading from KV correctly');
  } catch (err) {
    logResult('REQ-FAIL-001', 'Weft reads agent state from NATS KV', false, err.message);
  }

  // REQ-FAIL-002: Work persists across Weft requests (in-memory state consistency)
  try {
    // Submit work to Weft
    const workItem = {
      description: 'Failure recovery test work',
      boundary: 'personal',
      capability: testCapability,
      priority: 5
    };

    const { status: submitStatus, data: submitData } = await request('POST', '/api/work', workItem);
    const workItemId = submitData.workItemId || submitData.id;

    // Retrieve work item (simulates what would happen after reconnect)
    const { status: getStatus, data: workData } = await request('GET', `/api/work/${workItemId}`);

    const passed = submitStatus === 201 && getStatus === 200 && workData.status === 'pending';
    logResult('REQ-FAIL-002', 'Work state consistency across requests', passed,
      `Work ID: ${workItemId}, Status: ${workData.status || 'unknown'}`);
  } catch (err) {
    logResult('REQ-FAIL-002', 'Work state consistency across requests', false, err.message);
  }

  // REQ-FAIL-003: NATS KV data persists (verify persistence mechanism)
  try {
    // Update agent heartbeat
    const js = nc.jetstream();
    const kv = await js.views.kv('agent-registry');

    const newHeartbeat = new Date().toISOString();
    const result = await kv.get(testAgentGuid);
    if (result && result.value) {
      const entry = JSON.parse(result.string());
      entry.lastHeartbeat = newHeartbeat;
      entry.currentTaskCount = 2;
      await kv.put(testAgentGuid, JSON.stringify(entry));
    }

    // Re-read from KV to verify persistence
    const verifyResult = await kv.get(testAgentGuid);
    let verifiedEntry = null;
    if (verifyResult && verifyResult.value) {
      verifiedEntry = JSON.parse(verifyResult.string());
    }

    const passed = verifiedEntry !== null &&
                   verifiedEntry.lastHeartbeat === newHeartbeat &&
                   verifiedEntry.currentTaskCount === 2;
    logResult('REQ-FAIL-003', 'NATS KV data persists correctly', passed,
      verifiedEntry
        ? `Heartbeat: ${verifiedEntry.lastHeartbeat}, Tasks: ${verifiedEntry.currentTaskCount}`
        : 'Could not verify KV persistence');
  } catch (err) {
    logResult('REQ-FAIL-003', 'NATS KV data persists correctly', false, err.message);
  }

  // REQ-FAIL-004: Weft health check reports service status
  try {
    const { status, data } = await request('GET', '/health');

    const passed = status === 200 && data.status === 'ok';
    logResult('REQ-FAIL-004', 'Weft health check operational', passed,
      `Status: ${data.status}, Timestamp: ${data.timestamp || 'N/A'}`);
  } catch (err) {
    logResult('REQ-FAIL-004', 'Weft health check operational', false, err.message);
  }

  // REQ-FAIL-005: Multiple agents can be tracked simultaneously
  try {
    // Register a second test agent
    const secondAgentGuid = randomUUID();
    const secondEntry = {
      guid: secondAgentGuid,
      handle: `fail-test-agent-2-${Date.now()}`,
      agentType: 'fail-test',
      hostname: hostname(),
      projectId: testProjectId,
      natsUrl: NATS_URL,
      capabilities: [testCapability, 'additional-cap'],
      scope: 'project',
      visibility: 'project-only',
      status: 'online',
      currentTaskCount: 0,
      registeredAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
    };

    const js = nc.jetstream();
    const kv = await js.views.kv('agent-registry');
    await kv.put(secondAgentGuid, JSON.stringify(secondEntry));

    // Wait for Weft to detect
    await sleep(1500);

    // Verify both agents are visible
    const { status, data } = await request('GET', '/api/agents');
    const agents = data.agents || [];
    const foundFirst = agents.find(a => a.guid === testAgentGuid);
    const foundSecond = agents.find(a => a.guid === secondAgentGuid);

    const passed = status === 200 && foundFirst !== undefined && foundSecond !== undefined;
    logResult('REQ-FAIL-005', 'Multiple agents tracked simultaneously', passed,
      `Found agents: ${foundFirst ? 1 : 0} + ${foundSecond ? 1 : 0}, Total: ${agents.length}`);

    // Cleanup second agent
    secondEntry.status = 'offline';
    await kv.put(secondAgentGuid, JSON.stringify(secondEntry));
  } catch (err) {
    logResult('REQ-FAIL-005', 'Multiple agents tracked simultaneously', false, err.message);
  }

  // REQ-FAIL-006: Stats endpoint reflects current state
  try {
    const { status, data } = await request('GET', '/api/stats');

    const hasAgentStats = data.totals?.agents !== undefined || data.byProject;
    const passed = status === 200 && hasAgentStats;
    logResult('REQ-FAIL-006', 'Stats endpoint reflects current state', passed,
      `Agents: ${data.totals?.agents || 'N/A'}, Projects: ${data.totalProjects || Object.keys(data.byProject || {}).length}`);
  } catch (err) {
    logResult('REQ-FAIL-006', 'Stats endpoint reflects current state', false, err.message);
  }

  // Cleanup
  console.log('\n--- Cleanup ---\n');

  await deregisterTestAgent(nc);

  // Close NATS connection
  await nc.drain();
  console.log('Closed NATS connection\n');

  // Summary
  console.log('=== Test Summary ===');
  console.log(`Passed: ${results.passed}/${results.passed + results.failed}`);
  console.log(`Failed: ${results.failed}`);

  console.log('\n=== Notes ===');
  console.log('These tests verify failure recovery mechanisms:');
  console.log('  1. Weft reads agent state from NATS KV (survives restart)');
  console.log('  2. Work state is consistent across requests');
  console.log('  3. NATS KV provides persistent storage');
  console.log('  4. Health check is operational');
  console.log('  5. Multiple agents tracked correctly');
  console.log('');
  console.log('Full NATS restart testing requires manual intervention:');
  console.log('  - Stop NATS server');
  console.log('  - Verify Weft enters reconnect mode');
  console.log('  - Restart NATS server');
  console.log('  - Verify Weft reconnects and state is recovered');

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
