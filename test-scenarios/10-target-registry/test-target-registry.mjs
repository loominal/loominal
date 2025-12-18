#!/usr/bin/env node
/**
 * Phase 6.3: Target Registry Integration Tests (REQ-TARGET)
 *
 * Tests the Weft target registry REST API endpoints:
 * - POST /api/targets - Register new target
 * - GET /api/targets - List targets
 * - GET /api/targets/:id - Get target details
 * - PUT /api/targets/:id - Update target
 * - DELETE /api/targets/:id - Remove target
 * - POST /api/targets/:id/test - Health check
 * - POST /api/targets/:id/enable - Enable target
 * - POST /api/targets/:id/disable - Disable target
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

// Test data
const testTarget = {
  name: `test-target-${Date.now()}`,
  agentType: 'claude-code',
  capabilities: ['typescript', 'testing'],
  boundaries: ['personal', 'open-source'],
  mechanism: 'local',
  config: {
    mechanism: 'local',
    command: 'echo "test spin-up"',
    workingDirectory: '/tmp'
  }
};

let createdTargetId = null;

async function runTests() {
  console.log('\n=== Phase 6.3: Target Registry Integration Tests ===\n');
  console.log(`Weft URL: ${WEFT_URL}\n`);

  // REQ-TARGET-001: POST /api/targets registers new target
  try {
    const { status, data } = await request('POST', '/api/targets', testTarget);
    const passed = status === 201 && data.id && data.name === testTarget.name;
    if (passed) createdTargetId = data.id;
    logResult('REQ-TARGET-001', 'POST /api/targets registers new target', passed,
      passed ? `Created target ID: ${data.id}` : `Status: ${status}, Response: ${JSON.stringify(data)}`);
  } catch (err) {
    logResult('REQ-TARGET-001', 'POST /api/targets registers new target', false, err.message);
  }

  // REQ-TARGET-002: GET /api/targets lists targets
  try {
    const { status, data } = await request('GET', '/api/targets');
    const hasTarget = data.targets?.some(t => t.name === testTarget.name);
    const passed = status === 200 && Array.isArray(data.targets) && hasTarget;
    logResult('REQ-TARGET-002', 'GET /api/targets lists targets', passed,
      `Found ${data.count} targets, test target present: ${hasTarget}`);
  } catch (err) {
    logResult('REQ-TARGET-002', 'GET /api/targets lists targets', false, err.message);
  }

  // REQ-TARGET-002b: GET /api/targets with filters
  try {
    const { status, data } = await request('GET', `/api/targets?capability=typescript`);
    const hasTarget = data.targets?.some(t => t.name === testTarget.name);
    const passed = status === 200 && hasTarget;
    logResult('REQ-TARGET-002b', 'GET /api/targets filters by capability', passed,
      `Filtered results: ${data.count} targets`);
  } catch (err) {
    logResult('REQ-TARGET-002b', 'GET /api/targets filters by capability', false, err.message);
  }

  // REQ-TARGET-003: GET /api/targets/:id returns target details
  if (createdTargetId) {
    try {
      const { status, data } = await request('GET', `/api/targets/${createdTargetId}`);
      const passed = status === 200 && data.id === createdTargetId &&
                     data.name === testTarget.name &&
                     Array.isArray(data.capabilities) &&
                     data.capabilities.includes('typescript');
      logResult('REQ-TARGET-003', 'GET /api/targets/:id returns target details', passed,
        `Target: ${data.name}, Status: ${data.status}`);
    } catch (err) {
      logResult('REQ-TARGET-003', 'GET /api/targets/:id returns target details', false, err.message);
    }
  } else {
    logResult('REQ-TARGET-003', 'GET /api/targets/:id returns target details', false, 'No target ID from creation');
  }

  // REQ-TARGET-004: PUT /api/targets/:id updates target
  if (createdTargetId) {
    try {
      const updates = { capabilities: ['typescript', 'testing', 'python'] };
      const { status, data } = await request('PUT', `/api/targets/${createdTargetId}`, updates);
      const passed = status === 200 && data.capabilities?.includes('python');
      logResult('REQ-TARGET-004', 'PUT /api/targets/:id updates target', passed,
        `Updated capabilities: ${JSON.stringify(data.capabilities)}`);
    } catch (err) {
      logResult('REQ-TARGET-004', 'PUT /api/targets/:id updates target', false, err.message);
    }
  } else {
    logResult('REQ-TARGET-004', 'PUT /api/targets/:id updates target', false, 'No target ID from creation');
  }

  // REQ-TARGET-005: POST /api/targets/:id/disable disables target
  if (createdTargetId) {
    try {
      const { status, data } = await request('POST', `/api/targets/${createdTargetId}/disable`);
      const passed = status === 200 && data.success === true;
      logResult('REQ-TARGET-005', 'POST /api/targets/:id/disable disables target', passed,
        data.message || JSON.stringify(data));

      // Verify disabled status
      const verify = await request('GET', `/api/targets/${createdTargetId}`);
      const verifyPassed = verify.data.status === 'disabled';
      logResult('REQ-TARGET-005b', 'Disabled target shows correct status', verifyPassed,
        `Status: ${verify.data.status}`);
    } catch (err) {
      logResult('REQ-TARGET-005', 'POST /api/targets/:id/disable disables target', false, err.message);
    }
  } else {
    logResult('REQ-TARGET-005', 'POST /api/targets/:id/disable disables target', false, 'No target ID');
  }

  // REQ-TARGET-006: POST /api/targets/:id/enable enables target
  if (createdTargetId) {
    try {
      const { status, data } = await request('POST', `/api/targets/${createdTargetId}/enable`);
      const passed = status === 200 && data.success === true;
      logResult('REQ-TARGET-006', 'POST /api/targets/:id/enable enables target', passed,
        data.message || JSON.stringify(data));

      // Verify enabled status
      const verify = await request('GET', `/api/targets/${createdTargetId}`);
      const verifyPassed = verify.data.status === 'available';
      logResult('REQ-TARGET-006b', 'Enabled target shows correct status', verifyPassed,
        `Status: ${verify.data.status}`);
    } catch (err) {
      logResult('REQ-TARGET-006', 'POST /api/targets/:id/enable enables target', false, err.message);
    }
  } else {
    logResult('REQ-TARGET-006', 'POST /api/targets/:id/enable enables target', false, 'No target ID');
  }

  // REQ-TARGET-007: POST /api/targets/:id/test runs health check
  if (createdTargetId) {
    try {
      const { status, data } = await request('POST', `/api/targets/${createdTargetId}/test`);
      // Health check may succeed or fail depending on local environment
      const passed = status === 200 && (data.healthy !== undefined || data.success !== undefined);
      logResult('REQ-TARGET-007', 'POST /api/targets/:id/test runs health check', passed,
        `Health check result: ${JSON.stringify(data)}`);
    } catch (err) {
      logResult('REQ-TARGET-007', 'POST /api/targets/:id/test runs health check', false, err.message);
    }
  } else {
    logResult('REQ-TARGET-007', 'POST /api/targets/:id/test runs health check', false, 'No target ID');
  }

  // REQ-TARGET-008: DELETE /api/targets/:id removes target
  if (createdTargetId) {
    try {
      const { status, data } = await request('DELETE', `/api/targets/${createdTargetId}`);
      const passed = status === 200 && data.success === true;
      logResult('REQ-TARGET-008', 'DELETE /api/targets/:id removes target', passed,
        data.message || JSON.stringify(data));

      // Verify deletion
      const verify = await request('GET', `/api/targets/${createdTargetId}`);
      const verifyPassed = verify.status === 404;
      logResult('REQ-TARGET-008b', 'Deleted target returns 404', verifyPassed,
        `Status: ${verify.status}`);
    } catch (err) {
      logResult('REQ-TARGET-008', 'DELETE /api/targets/:id removes target', false, err.message);
    }
  } else {
    logResult('REQ-TARGET-008', 'DELETE /api/targets/:id removes target', false, 'No target ID');
  }

  // REQ-TARGET-009: Validation - missing required fields
  try {
    const invalidTarget = { name: 'invalid-target' }; // Missing required fields
    const { status, data } = await request('POST', '/api/targets', invalidTarget);
    const passed = status === 400 && data.error;
    logResult('REQ-TARGET-009', 'POST /api/targets validates required fields', passed,
      `Error: ${data.error || data.message}`);
  } catch (err) {
    logResult('REQ-TARGET-009', 'POST /api/targets validates required fields', false, err.message);
  }

  // REQ-TARGET-010: 404 for non-existent target
  try {
    const { status } = await request('GET', '/api/targets/non-existent-target-id');
    const passed = status === 404;
    logResult('REQ-TARGET-010', 'GET non-existent target returns 404', passed,
      `Status: ${status}`);
  } catch (err) {
    logResult('REQ-TARGET-010', 'GET non-existent target returns 404', false, err.message);
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
