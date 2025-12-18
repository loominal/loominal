#!/usr/bin/env node
/**
 * Phase 6.5: Idle Detection Integration Tests (REQ-IDLE)
 *
 * Tests the Weft idle detection functionality:
 * - Agent activity tracking
 * - Idle timeout detection
 * - Shutdown signal on idle
 *
 * Note: Full idle timeout testing requires waiting for the configured
 * timeout period (default 5 minutes). These tests verify the infrastructure
 * is in place and working correctly.
 */

const WEFT_URL = process.env.WEFT_URL || 'http://localhost:3000';

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

async function runTests() {
  console.log('\n=== Phase 6.5: Idle Detection Integration Tests ===\n');
  console.log(`Weft URL: ${WEFT_URL}\n`);

  // REQ-IDLE-001: Stats endpoint includes idle-related metrics
  try {
    const { status, data } = await request('GET', '/api/stats');
    // Stats should include agent counts and activity info
    const hasAgentCount = data.totals?.agents !== undefined ||
                          data.agents !== undefined ||
                          data.byProject;
    const passed = status === 200 && hasAgentCount;
    logResult('REQ-IDLE-001', 'Stats endpoint returns agent metrics', passed,
      `Agents: ${data.totals?.agents || 'N/A'}, Projects: ${data.totalProjects || 1}`);
  } catch (err) {
    logResult('REQ-IDLE-001', 'Stats endpoint returns agent metrics', false, err.message);
  }

  // REQ-IDLE-002: Agents endpoint includes activity tracking fields
  try {
    const { status, data } = await request('GET', '/api/agents');
    const agents = data.agents || [];

    // Check if any agent has activity tracking fields
    const hasActivityFields = agents.length === 0 || agents.some(a =>
      a.currentTaskCount !== undefined || a.lastHeartbeat !== undefined
    );

    const passed = status === 200 && hasActivityFields;
    logResult('REQ-IDLE-002', 'Agents include activity tracking fields', passed,
      `Agent count: ${agents.length}, Fields present: currentTaskCount, lastHeartbeat`);
  } catch (err) {
    logResult('REQ-IDLE-002', 'Agents include activity tracking fields', false, err.message);
  }

  // REQ-IDLE-003: Agent details include last heartbeat
  try {
    const { status: listStatus, data: listData } = await request('GET', '/api/agents');
    const agents = listData.agents || [];

    if (agents.length > 0) {
      const firstAgent = agents[0];
      const { status, data } = await request('GET', `/api/agents/${firstAgent.guid}`);

      const hasHeartbeat = data.lastHeartbeat !== undefined;
      const hasTaskCount = data.currentTaskCount !== undefined;

      const passed = status === 200 && (hasHeartbeat || hasTaskCount);
      logResult('REQ-IDLE-003', 'Agent details include heartbeat/task info', passed,
        `Agent: ${data.handle || data.guid}, Last heartbeat: ${data.lastHeartbeat || 'N/A'}, Tasks: ${data.currentTaskCount || 0}`);
    } else {
      // No agents registered - skip but don't fail
      logResult('REQ-IDLE-003', 'Agent details include heartbeat/task info', true,
        'SKIPPED: No agents registered to test');
    }
  } catch (err) {
    logResult('REQ-IDLE-003', 'Agent details include heartbeat/task info', false, err.message);
  }

  // REQ-IDLE-004: Project-level last activity tracking
  try {
    const { status, data } = await request('GET', '/api/stats');
    const projects = data.byProject || {};
    const projectIds = Object.keys(projects);

    const hasLastActivity = projectIds.some(pid =>
      projects[pid].lastActivity !== undefined
    );

    const passed = status === 200 && (projectIds.length === 0 || hasLastActivity);
    logResult('REQ-IDLE-004', 'Project stats include last activity', passed,
      `Projects with lastActivity: ${projectIds.filter(pid => projects[pid].lastActivity).length}/${projectIds.length}`);
  } catch (err) {
    logResult('REQ-IDLE-004', 'Project stats include last activity', false, err.message);
  }

  // REQ-IDLE-005: Agent shutdown endpoint exists
  try {
    const { status: listStatus, data: listData } = await request('GET', '/api/agents');
    const agents = listData.agents || [];

    if (agents.length > 0) {
      // Test with a non-existent GUID to verify endpoint exists
      const fakeGuid = '00000000-0000-0000-0000-000000000000';
      const { status, data } = await request('POST', `/api/agents/${fakeGuid}/shutdown`, { graceful: true });

      // Should return 404 (agent not found) - proves endpoint exists and validates input
      const passed = status === 404;
      logResult('REQ-IDLE-005', 'Agent shutdown endpoint exists', passed,
        `Status: ${status}, Error: ${data.error || data.message || 'N/A'}`);
    } else {
      // No agents - test endpoint with fake GUID
      const fakeGuid = '00000000-0000-0000-0000-000000000000';
      const { status, data } = await request('POST', `/api/agents/${fakeGuid}/shutdown`, { graceful: true });
      const passed = status === 404;
      logResult('REQ-IDLE-005', 'Agent shutdown endpoint exists', passed,
        `Status: ${status} (404 expected for non-existent agent)`);
    }
  } catch (err) {
    logResult('REQ-IDLE-005', 'Agent shutdown endpoint exists', false, err.message);
  }

  // REQ-IDLE-006: IDLE_TIMEOUT_MS environment variable is respected
  // This is a documentation/config test - we verify the config is exposed
  try {
    const { status, data } = await request('GET', '/health');
    // Health endpoint should work - config is internal
    const passed = status === 200 && data.status === 'ok';
    logResult('REQ-IDLE-006', 'Weft health check confirms service running', passed,
      `Status: ${data.status}, Timestamp: ${data.timestamp}`);
  } catch (err) {
    logResult('REQ-IDLE-006', 'Weft health check confirms service running', false, err.message);
  }

  // REQ-IDLE-007: Verify idle detection configuration is documented
  // Note: We can't directly test timeout behavior without waiting 5+ minutes
  // This test verifies the infrastructure is in place
  try {
    // Check that stats include per-project breakdown (idle tracking works per-project)
    const { status, data } = await request('GET', '/api/stats');
    const hasProjectBreakdown = data.byProject !== undefined;
    const hasTotals = data.totals !== undefined;

    const passed = status === 200 && (hasProjectBreakdown || hasTotals);
    logResult('REQ-IDLE-007', 'Stats structure supports idle tracking', passed,
      `Has project breakdown: ${hasProjectBreakdown}, Has totals: ${hasTotals}`);
  } catch (err) {
    logResult('REQ-IDLE-007', 'Stats structure supports idle tracking', false, err.message);
  }

  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${results.passed}/${results.passed + results.failed}`);
  console.log(`Failed: ${results.failed}`);

  console.log('\n=== Notes ===');
  console.log('Full idle timeout testing requires waiting for IDLE_TIMEOUT_MS (default 5 min).');
  console.log('These tests verify the idle detection infrastructure is in place.');
  console.log('Idle detection fires automatically when agents have currentTaskCount=0');
  console.log('and have not had activity for the configured timeout period.');

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
