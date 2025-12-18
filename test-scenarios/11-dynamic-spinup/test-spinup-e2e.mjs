#!/usr/bin/env node
/**
 * Spin-Up End-to-End Test
 *
 * Tests the FULL spin-up flow:
 * 1. Create a target that spawns mini-agent.mjs
 * 2. Trigger spin-up via API
 * 3. Verify the spawned agent registers in NATS KV
 * 4. Verify the agent appears in Weft's /api/agents
 *
 * This is the critical test that validates spin-up actually works.
 */

import { connect } from 'nats';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

  const response = await fetch(`${WEFT_URL}${path}`, options);
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test configuration
const testCapability = `spinup-e2e-${Date.now()}`;
const testProjectId = `spinup-project-${Date.now()}`;
const testAgentGuid = randomUUID();
const testAgentHandle = `spinup-agent-${Date.now()}`;

async function runTests() {
  console.log('\n=== Spin-Up End-to-End Test ===\n');
  console.log(`Weft URL: ${WEFT_URL}`);
  console.log(`NATS URL: ${NATS_URL}`);
  console.log(`Test Capability: ${testCapability}`);
  console.log(`Test Agent GUID: ${testAgentGuid}`);
  console.log(`Mini-agent path: ${join(__dirname, 'mini-agent.mjs')}\n`);

  let nc;
  let targetId;

  // Connect to NATS for verification
  try {
    nc = await connect({ servers: [NATS_URL] });
    console.log('Connected to NATS\n');
  } catch (err) {
    console.error(`Failed to connect to NATS: ${err.message}`);
    process.exit(1);
  }

  console.log('--- Running Tests ---\n');

  // Test 1: Create a spin-up target that runs mini-agent.mjs
  try {
    // Note: agentType must be 'copilot-cli' or 'claude-code' per API validation
    const target = {
      name: `spinup-e2e-target-${Date.now()}`,
      agentType: 'claude-code',
      capabilities: [testCapability],
      boundaries: ['personal'],
      mechanism: 'local',
      config: {
        mechanism: 'local',
        local: {
          command: 'node',
          args: [join(__dirname, 'mini-agent.mjs')],
          workingDirectory: __dirname,
          detached: true,
          env: {
            NATS_URL: NATS_URL,
            AGENT_GUID: testAgentGuid,
            AGENT_HANDLE: testAgentHandle,
            AGENT_CAPABILITY: testCapability,
            PROJECT_ID: testProjectId,
            STAY_ALIVE_MS: '15000'
          }
        }
      }
    };

    const { status, data } = await request('POST', '/api/targets', target);
    targetId = data.id;

    const passed = status === 201 && targetId;
    logResult('SPINUP-E2E-001', 'Create spin-up target with mini-agent', passed,
      `Target ID: ${targetId || 'none'}, Status: ${status}`);
  } catch (err) {
    logResult('SPINUP-E2E-001', 'Create spin-up target with mini-agent', false, err.message);
  }

  // Test 2: Trigger spin-up
  if (targetId) {
    try {
      const { status, data } = await request('POST', `/api/targets/${targetId}/spin-up`);

      const passed = status === 200 && (data.status || data.triggered || data.success);
      logResult('SPINUP-E2E-002', 'Trigger spin-up via API', passed,
        `Response: ${JSON.stringify(data)}`);
    } catch (err) {
      logResult('SPINUP-E2E-002', 'Trigger spin-up via API', false, err.message);
    }
  } else {
    logResult('SPINUP-E2E-002', 'Trigger spin-up via API', false, 'No target ID');
  }

  // Test 3: Wait and verify agent appears in NATS KV
  try {
    console.log('   Waiting for agent to register (up to 10 seconds)...');

    let found = false;
    let attempts = 0;
    const maxAttempts = 20;

    while (!found && attempts < maxAttempts) {
      await sleep(500);
      attempts++;

      try {
        const js = nc.jetstream();
        const kv = await js.views.kv('agent-registry');
        const result = await kv.get(testAgentGuid);

        if (result && result.value) {
          const entry = JSON.parse(result.string());
          if (entry.status === 'online') {
            found = true;
            console.log(`   Found agent after ${attempts * 500}ms`);
          }
        }
      } catch {
        // KV entry not found yet
      }
    }

    logResult('SPINUP-E2E-003', 'Spawned agent registers in NATS KV', found,
      found ? `Agent ${testAgentHandle} registered` : `Agent not found after ${maxAttempts * 500}ms`);
  } catch (err) {
    logResult('SPINUP-E2E-003', 'Spawned agent registers in NATS KV', false, err.message);
  }

  // Test 4: Verify agent appears in Weft /api/agents
  try {
    // Give Weft time to detect the agent
    await sleep(2000);

    const { status, data } = await request('GET', '/api/agents');
    const agents = data.agents || [];
    const foundAgent = agents.find(a => a.guid === testAgentGuid);

    const passed = status === 200 && foundAgent !== undefined;
    logResult('SPINUP-E2E-004', 'Spawned agent appears in Weft /api/agents', passed,
      foundAgent
        ? `Found: ${foundAgent.handle}, status: ${foundAgent.status}`
        : `Agent ${testAgentGuid} not found in ${agents.length} agents`);
  } catch (err) {
    logResult('SPINUP-E2E-004', 'Spawned agent appears in Weft /api/agents', false, err.message);
  }

  // Cleanup
  console.log('\n--- Cleanup ---\n');

  // Delete the target
  if (targetId) {
    await request('DELETE', `/api/targets/${targetId}`);
    console.log(`Deleted target: ${targetId}`);
  }

  // Wait for mini-agent to self-deregister (or deregister it manually)
  try {
    const js = nc.jetstream();
    const kv = await js.views.kv('agent-registry');
    const result = await kv.get(testAgentGuid);
    if (result && result.value) {
      const entry = JSON.parse(result.string());
      entry.status = 'offline';
      await kv.put(testAgentGuid, JSON.stringify(entry));
      console.log(`Marked agent ${testAgentHandle} as offline`);
    }
  } catch {
    // Agent may have already self-deregistered
  }

  // Close NATS connection
  await nc.drain();
  console.log('Closed NATS connection\n');

  // Summary
  console.log('=== Test Summary ===');
  console.log(`Passed: ${results.passed}/${results.passed + results.failed}`);
  console.log(`Failed: ${results.failed}`);

  console.log('\n=== Notes ===');
  console.log('This test validates the FULL spin-up flow:');
  console.log('  1. Target created with local mechanism pointing to mini-agent.mjs');
  console.log('  2. Spin-up triggered via POST /api/targets/:id/spin-up');
  console.log('  3. mini-agent.mjs spawns, connects to NATS, registers in KV');
  console.log('  4. Weft detects the new agent via KV watch');
  console.log('');
  console.log('If tests fail:');
  console.log('  - Check that node is in PATH');
  console.log('  - Check mini-agent.mjs path is correct');
  console.log('  - Check NATS connectivity from spawned process');

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
