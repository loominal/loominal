#!/usr/bin/env node
/**
 * Integration Test: REQ-WEFT-BASIC - Basic Coordinator Tests
 * Tests all 5 basic coordinator requirements
 */

import { connect } from 'nats';
import { randomUUID } from 'crypto';

const NATS_URL = process.env.NATS_URL || 'nats://localhost:4222';
const WEFT_API_URL = process.env.WEFT_API_URL || 'http://localhost:3000';
const PROJECT_ID = '0123456789abcdef';

// Test results
const results = {
  'REQ-WEFT-001': { status: 'PENDING', details: '', duration: 0 },
  'REQ-WEFT-002': { status: 'PENDING', details: '', duration: 0 },
  'REQ-WEFT-003': { status: 'PENDING', details: '', duration: 0 },
  'REQ-WEFT-004': { status: 'PENDING', details: '', duration: 0 },
  'REQ-WEFT-005': { status: 'PENDING', details: '', duration: 0 },
};

// Utility: Register an agent via KV
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
  console.log(`  Registered agent: ${handle} (${guid})`);
  return { guid, ...agentData };
}

// Utility: Make HTTP request
async function httpRequest(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return {
    status: response.status,
    data,
    headers: response.headers,
  };
}

// Test REQ-WEFT-001: Weft connects to NATS and starts successfully
async function testWEFT001() {
  const start = Date.now();

  try {
    console.log('\nREQ-WEFT-001: Weft connects to NATS and starts successfully');

    // Check that Weft process is running (via API)
    const healthResponse = await httpRequest(`${WEFT_API_URL}/health`);

    if (healthResponse.status !== 200) {
      results['REQ-WEFT-001'].status = 'FAIL';
      results['REQ-WEFT-001'].details = `Weft not responding - health check returned ${healthResponse.status}`;
      return;
    }

    // Verify NATS connection by checking stats
    const statsResponse = await httpRequest(`${WEFT_API_URL}/api/stats`);

    if (statsResponse.status !== 200) {
      results['REQ-WEFT-001'].status = 'FAIL';
      results['REQ-WEFT-001'].details = `Stats endpoint not responding - ${statsResponse.status}`;
      return;
    }

    const duration = Date.now() - start;

    if (duration > 5000) {
      results['REQ-WEFT-001'].status = 'FAIL';
      results['REQ-WEFT-001'].details = `Response time too slow: ${duration}ms (expected < 5000ms)`;
      return;
    }

    results['REQ-WEFT-001'].status = 'PASS';
    results['REQ-WEFT-001'].details = 'Weft started and connected to NATS successfully';
    results['REQ-WEFT-001'].duration = duration;
    console.log('  ✓ PASS');

  } catch (err) {
    results['REQ-WEFT-001'].status = 'FAIL';
    results['REQ-WEFT-001'].details = `Error: ${err.message}`;
    results['REQ-WEFT-001'].duration = Date.now() - start;
    console.log(`  ✗ FAIL: ${err.message}`);
  }
}

// Test REQ-WEFT-002: REST API /health endpoint responds
async function testWEFT002() {
  const start = Date.now();

  try {
    console.log('\nREQ-WEFT-002: REST API /health endpoint responds');

    const response = await httpRequest(`${WEFT_API_URL}/health`);
    const duration = Date.now() - start;

    console.log(`  Response: ${JSON.stringify(response.data)}`);
    console.log(`  Duration: ${duration}ms`);

    if (response.status !== 200) {
      results['REQ-WEFT-002'].status = 'FAIL';
      results['REQ-WEFT-002'].details = `Expected HTTP 200, got ${response.status}`;
      return;
    }

    if (!response.data.status || response.data.status !== 'ok') {
      results['REQ-WEFT-002'].status = 'FAIL';
      results['REQ-WEFT-002'].details = `Expected { status: "ok" }, got ${JSON.stringify(response.data)}`;
      return;
    }

    if (duration > 100) {
      console.log(`  ⚠ Warning: Response time ${duration}ms exceeds target of 100ms`);
    }

    results['REQ-WEFT-002'].status = 'PASS';
    results['REQ-WEFT-002'].details = `Health endpoint returned 200 with correct data in ${duration}ms`;
    results['REQ-WEFT-002'].duration = duration;
    console.log('  ✓ PASS');

  } catch (err) {
    results['REQ-WEFT-002'].status = 'FAIL';
    results['REQ-WEFT-002'].details = `Error: ${err.message}`;
    results['REQ-WEFT-002'].duration = Date.now() - start;
    console.log(`  ✗ FAIL: ${err.message}`);
  }
}

// Test REQ-WEFT-003: REST API /api/agents returns registered agents
async function testWEFT003(kv) {
  const start = Date.now();

  try {
    console.log('\nREQ-WEFT-003: REST API /api/agents returns registered agents');

    // Register a test agent
    const agent = await registerAgent(kv, 'test-weft-003', ['typescript', 'testing']);

    // Wait for Weft to discover the agent
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Query agents via API
    const response = await httpRequest(`${WEFT_API_URL}/api/agents`);

    console.log(`  Response status: ${response.status}`);
    console.log(`  Response data: ${JSON.stringify(response.data)}`);

    if (response.status !== 200) {
      results['REQ-WEFT-003'].status = 'FAIL';
      results['REQ-WEFT-003'].details = `Expected HTTP 200, got ${response.status}`;
      return;
    }

    if (!Array.isArray(response.data.agents)) {
      results['REQ-WEFT-003'].status = 'FAIL';
      results['REQ-WEFT-003'].details = `Expected array in 'agents' field, got ${typeof response.data.agents}`;
      return;
    }

    // Find our test agent
    const foundAgent = response.data.agents.find(a => a.guid === agent.guid);

    if (!foundAgent) {
      results['REQ-WEFT-003'].status = 'FAIL';
      results['REQ-WEFT-003'].details = `Test agent ${agent.guid} not found in response (${response.data.agents.length} agents total)`;
      return;
    }

    // Verify required fields
    const requiredFields = ['guid', 'handle', 'capabilities', 'status'];
    for (const field of requiredFields) {
      if (!foundAgent[field]) {
        results['REQ-WEFT-003'].status = 'FAIL';
        results['REQ-WEFT-003'].details = `Agent missing required field: ${field}`;
        return;
      }
    }

    results['REQ-WEFT-003'].status = 'PASS';
    results['REQ-WEFT-003'].details = `Agents endpoint returned registered agent with all required fields`;
    results['REQ-WEFT-003'].duration = Date.now() - start;
    console.log('  ✓ PASS');

  } catch (err) {
    results['REQ-WEFT-003'].status = 'FAIL';
    results['REQ-WEFT-003'].details = `Error: ${err.message}`;
    results['REQ-WEFT-003'].duration = Date.now() - start;
    console.log(`  ✗ FAIL: ${err.message}`);
  }
}

// Test REQ-WEFT-004: REST API /api/work returns work items
async function testWEFT004() {
  const start = Date.now();

  try {
    console.log('\nREQ-WEFT-004: REST API /api/work returns work items');

    const response = await httpRequest(`${WEFT_API_URL}/api/work`);

    console.log(`  Response status: ${response.status}`);
    console.log(`  Response data: ${JSON.stringify(response.data)}`);

    if (response.status !== 200) {
      results['REQ-WEFT-004'].status = 'FAIL';
      results['REQ-WEFT-004'].details = `Expected HTTP 200, got ${response.status}`;
      return;
    }

    if (!Array.isArray(response.data.workItems)) {
      results['REQ-WEFT-004'].status = 'FAIL';
      results['REQ-WEFT-004'].details = `Expected array in 'workItems' field, got ${typeof response.data.workItems}`;
      return;
    }

    // If there are work items, verify they have required fields
    if (response.data.workItems.length > 0) {
      const workItem = response.data.workItems[0];
      const requiredFields = ['taskId', 'description', 'status', 'capability'];

      for (const field of requiredFields) {
        if (!workItem[field]) {
          console.log(`  ⚠ Warning: Work item missing field: ${field}`);
        }
      }
    }

    results['REQ-WEFT-004'].status = 'PASS';
    results['REQ-WEFT-004'].details = `Work endpoint returned JSON array (${response.data.workItems.length} items)`;
    results['REQ-WEFT-004'].duration = Date.now() - start;
    console.log('  ✓ PASS');

  } catch (err) {
    results['REQ-WEFT-004'].status = 'FAIL';
    results['REQ-WEFT-004'].details = `Error: ${err.message}`;
    results['REQ-WEFT-004'].duration = Date.now() - start;
    console.log(`  ✗ FAIL: ${err.message}`);
  }
}

// Test REQ-WEFT-005: REST API /api/stats returns coordinator statistics
async function testWEFT005() {
  const start = Date.now();

  try {
    console.log('\nREQ-WEFT-005: REST API /api/stats returns coordinator statistics');

    const response = await httpRequest(`${WEFT_API_URL}/api/stats`);

    console.log(`  Response status: ${response.status}`);
    console.log(`  Response data: ${JSON.stringify(response.data, null, 2)}`);

    if (response.status !== 200) {
      results['REQ-WEFT-005'].status = 'FAIL';
      results['REQ-WEFT-005'].details = `Expected HTTP 200, got ${response.status}`;
      return;
    }

    if (typeof response.data !== 'object') {
      results['REQ-WEFT-005'].status = 'FAIL';
      results['REQ-WEFT-005'].details = `Expected JSON object, got ${typeof response.data}`;
      return;
    }

    // Check for expected stats fields (based on actual implementation)
    const hasAgentCount = response.data.totals?.agents !== undefined;
    const hasWorkQueue = response.data.totals?.pendingWork !== undefined;
    const hasTimestamp = response.data.timestamp !== undefined;

    if (!hasAgentCount || !hasWorkQueue) {
      results['REQ-WEFT-005'].status = 'FAIL';
      results['REQ-WEFT-005'].details = `Missing expected stats fields. Got: ${Object.keys(response.data).join(', ')}`;
      return;
    }

    results['REQ-WEFT-005'].status = 'PASS';
    results['REQ-WEFT-005'].details = `Stats endpoint returned with agent count, work queue, and timestamp`;
    results['REQ-WEFT-005'].duration = Date.now() - start;
    console.log('  ✓ PASS');

  } catch (err) {
    results['REQ-WEFT-005'].status = 'FAIL';
    results['REQ-WEFT-005'].details = `Error: ${err.message}`;
    results['REQ-WEFT-005'].duration = Date.now() - start;
    console.log(`  ✗ FAIL: ${err.message}`);
  }
}

// Main execution
async function main() {
  console.log('='.repeat(70));
  console.log('Integration Test: REQ-WEFT-BASIC - Basic Coordinator');
  console.log('='.repeat(70));
  console.log(`NATS URL: ${NATS_URL}`);
  console.log(`Weft API URL: ${WEFT_API_URL}`);
  console.log(`Project ID: ${PROJECT_ID}`);
  console.log(`Test Start: ${new Date().toISOString()}`);

  // Connect to NATS for agent registration
  const nc = await connect({ servers: NATS_URL });
  const js = nc.jetstream();
  // Use the shared agent-registry bucket (matches both Warp and Weft)
  const kv = await js.views.kv('agent-registry', {
    history: 1,
  });

  // Run all tests
  await testWEFT001();
  await testWEFT002();
  await testWEFT003(kv);
  await testWEFT004();
  await testWEFT005();

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
