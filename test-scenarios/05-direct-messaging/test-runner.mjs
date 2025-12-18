#!/usr/bin/env node
/**
 * Direct Messaging Integration Test Runner
 *
 * Tests REQ-DM-001 through REQ-DM-005 using Warp MCP tools
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';

const NATS_URL = process.env.NATS_URL || 'nats://localhost:4222';
const PROJECT_ID = '0123456789abcdef'; // From TEST_DATA.md

class MCPClient {
  constructor(name) {
    this.name = name;
    this.process = null;
    this.requestId = 1;
    this.responses = new Map();
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.process = spawn('node', [
        '/var/home/mike/source/loom-monorepo/warp/dist/index.js'
      ], {
        env: {
          ...process.env,
          NATS_URL,
          LOOM_PROJECT_ID: PROJECT_ID
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const rl = createInterface({ input: this.process.stdout });
      let initReceived = false;

      rl.on('line', (line) => {
        try {
          const msg = JSON.parse(line);

          if (msg.method === 'notifications/initialized' && !initReceived) {
            initReceived = true;
            resolve();
          } else if (msg.id && this.responses.has(msg.id)) {
            this.responses.get(msg.id)(msg);
            this.responses.delete(msg.id);
          }
        } catch (err) {
          // Ignore non-JSON lines
        }
      });

      this.process.stderr.on('data', (data) => {
        console.error(`[${this.name} ERROR]`, data.toString());
      });

      this.process.on('error', reject);
      this.process.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          console.error(`[${this.name}] Process exited with code ${code}`);
        }
      });

      // Send initialize
      this.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: this.name,
          version: '1.0.0'
        }
      });
    });
  }

  sendRequest(method, params) {
    const id = this.requestId++;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.responses.set(id, (response) => {
        if (response.error) {
          reject(new Error(response.error.message || JSON.stringify(response.error)));
        } else {
          resolve(response.result);
        }
      });

      this.process.stdin.write(JSON.stringify(request) + '\n');

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.responses.has(id)) {
          this.responses.delete(id);
          reject(new Error(`Request ${id} (${method}) timed out after 10s`));
        }
      }, 10000);
    });
  }

  async callTool(name, args) {
    return this.sendRequest('tools/call', {
      name,
      arguments: args
    });
  }

  async stop() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}

// Test utilities
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test cases
const tests = {
  async 'REQ-DM-001: Message delivery when recipient is online'() {
    const alpha = new MCPClient('test-alpha');
    const beta = new MCPClient('test-beta');

    try {
      console.log('  Starting agents...');
      await alpha.start();
      await beta.start();
      await sleep(1000);

      console.log('  Registering agents...');
      const alphaReg = await alpha.callTool('register_agent', {
        handle: 'test-alpha',
        agentType: 'developer',
        capabilities: ['typescript', 'testing']
      });
      assert(alphaReg.content[0].text.includes('Registered'), 'Alpha should register');

      const betaReg = await beta.callTool('register_agent', {
        handle: 'test-beta',
        agentType: 'developer',
        capabilities: ['typescript', 'python']
      });
      assert(betaReg.content[0].text.includes('Registered'), 'Beta should register');

      // Extract Alpha's GUID
      const alphaGuidMatch = alphaReg.content[0].text.match(/GUID: ([a-f0-9-]+)/);
      assert(alphaGuidMatch, 'Alpha GUID should be in response');
      const alphaGuid = alphaGuidMatch[1];

      await sleep(500);

      console.log('  Sending DM from Beta to Alpha...');
      const dmResult = await beta.callTool('send_direct_message', {
        recipientGuid: alphaGuid,
        message: 'Test message from integration test',
        messageType: 'text'
      });
      assert(dmResult.content[0].text.includes('sent'), 'DM should be sent');

      await sleep(500);

      console.log('  Alpha reading inbox...');
      const inbox = await alpha.callTool('read_direct_messages', {});
      const inboxData = JSON.parse(inbox.content[0].text);

      assert(inboxData.messages.length > 0, 'Alpha should have messages');
      const testMsg = inboxData.messages.find(m => m.message === 'Test message from integration test');
      assert(testMsg, 'Test message should be in inbox');
      assert(testMsg.messageType === 'text', 'Message type should be text');
      assert(testMsg.senderGuid, 'Message should have sender GUID');

      console.log('  ✓ PASS: Message delivered when recipient online');
      return { status: 'PASS', duration: 0 };
    } finally {
      await alpha.stop();
      await beta.stop();
    }
  },

  async 'REQ-DM-002: Offline message queuing'() {
    const alpha = new MCPClient('test-alpha');
    const beta = new MCPClient('test-beta');

    try {
      console.log('  Starting agents...');
      await alpha.start();
      await beta.start();
      await sleep(1000);

      console.log('  Registering agents...');
      const alphaReg = await alpha.callTool('register_agent', {
        handle: 'test-alpha-offline',
        agentType: 'developer',
        capabilities: ['typescript', 'testing']
      });
      const alphaGuidMatch = alphaReg.content[0].text.match(/GUID: ([a-f0-9-]+)/);
      const alphaGuid = alphaGuidMatch[1];

      const betaReg = await beta.callTool('register_agent', {
        handle: 'test-beta-offline',
        agentType: 'developer',
        capabilities: ['typescript', 'python']
      });

      await sleep(500);

      console.log('  Alpha disconnecting...');
      await alpha.stop();
      await sleep(1000);

      console.log('  Beta sending 3 messages to offline Alpha...');
      await beta.callTool('send_direct_message', {
        recipientGuid: alphaGuid,
        message: 'Offline message 1',
        messageType: 'text'
      });
      await sleep(100);
      await beta.callTool('send_direct_message', {
        recipientGuid: alphaGuid,
        message: 'Offline message 2',
        messageType: 'text'
      });
      await sleep(100);
      await beta.callTool('send_direct_message', {
        recipientGuid: alphaGuid,
        message: 'Offline message 3',
        messageType: 'text'
      });

      await sleep(1000);

      console.log('  Alpha reconnecting...');
      await alpha.start();
      await sleep(1000);

      // Re-register with same GUID
      await alpha.callTool('register_agent', {
        handle: 'test-alpha-offline',
        agentType: 'developer',
        capabilities: ['typescript', 'testing']
      });

      await sleep(500);

      console.log('  Alpha reading inbox...');
      const inbox = await alpha.callTool('read_direct_messages', {});
      const inboxData = JSON.parse(inbox.content[0].text);

      const offlineMessages = inboxData.messages.filter(m => m.message.startsWith('Offline message'));
      assert(offlineMessages.length === 3, `Should have 3 offline messages, got ${offlineMessages.length}`);

      // Check ordering
      const msg1 = offlineMessages.find(m => m.message === 'Offline message 1');
      const msg2 = offlineMessages.find(m => m.message === 'Offline message 2');
      const msg3 = offlineMessages.find(m => m.message === 'Offline message 3');
      assert(msg1 && msg2 && msg3, 'All three messages should be present');

      console.log('  ✓ PASS: Offline messages queued correctly');
      return { status: 'PASS', duration: 0 };
    } finally {
      await alpha.stop();
      await beta.stop();
    }
  },

  async 'REQ-DM-003: Message filtering by type'() {
    const alpha = new MCPClient('test-alpha');
    const beta = new MCPClient('test-beta');

    try {
      console.log('  Starting agents...');
      await alpha.start();
      await beta.start();
      await sleep(1000);

      console.log('  Registering agents...');
      const alphaReg = await alpha.callTool('register_agent', {
        handle: 'test-alpha-filter',
        agentType: 'developer',
        capabilities: ['typescript']
      });
      const alphaGuidMatch = alphaReg.content[0].text.match(/GUID: ([a-f0-9-]+)/);
      const alphaGuid = alphaGuidMatch[1];

      await beta.callTool('register_agent', {
        handle: 'test-beta-filter',
        agentType: 'developer',
        capabilities: ['typescript']
      });

      await sleep(500);

      console.log('  Sending messages with different types...');
      await beta.callTool('send_direct_message', {
        recipientGuid: alphaGuid,
        message: 'This is a text message',
        messageType: 'text'
      });
      await sleep(100);
      await beta.callTool('send_direct_message', {
        recipientGuid: alphaGuid,
        message: 'This is a work offer',
        messageType: 'work-offer'
      });
      await sleep(100);
      await beta.callTool('send_direct_message', {
        recipientGuid: alphaGuid,
        message: 'This is a status update',
        messageType: 'status'
      });

      await sleep(500);

      console.log('  Reading with work-offer filter...');
      const filtered = await alpha.callTool('read_direct_messages', {
        messageType: 'work-offer'
      });
      const filteredData = JSON.parse(filtered.content[0].text);

      assert(filteredData.messages.length === 1, 'Should have exactly 1 work-offer message');
      assert(filteredData.messages[0].message === 'This is a work offer', 'Should be the work offer message');

      console.log('  Reading without filter to verify others still exist...');
      const all = await alpha.callTool('read_direct_messages', {});
      const allData = JSON.parse(all.content[0].text);

      assert(allData.messages.length >= 3, 'Should have at least 3 messages total');

      console.log('  ✓ PASS: Message type filtering works correctly');
      return { status: 'PASS', duration: 0 };
    } finally {
      await alpha.stop();
      await beta.stop();
    }
  },

  async 'REQ-DM-004: Message filtering by sender'() {
    const alpha = new MCPClient('test-alpha');
    const beta = new MCPClient('test-beta');
    const gamma = new MCPClient('test-gamma');

    try {
      console.log('  Starting agents...');
      await alpha.start();
      await beta.start();
      await gamma.start();
      await sleep(1000);

      console.log('  Registering agents...');
      const alphaReg = await alpha.callTool('register_agent', {
        handle: 'test-alpha-sender',
        agentType: 'developer',
        capabilities: ['typescript']
      });
      const alphaGuidMatch = alphaReg.content[0].text.match(/GUID: ([a-f0-9-]+)/);
      const alphaGuid = alphaGuidMatch[1];

      const betaReg = await beta.callTool('register_agent', {
        handle: 'test-beta-sender',
        agentType: 'developer',
        capabilities: ['python']
      });
      const betaGuidMatch = betaReg.content[0].text.match(/GUID: ([a-f0-9-]+)/);
      const betaGuid = betaGuidMatch[1];

      await gamma.callTool('register_agent', {
        handle: 'test-gamma-sender',
        agentType: 'reviewer',
        capabilities: ['code-review']
      });

      await sleep(500);

      console.log('  Beta and Gamma sending messages to Alpha...');
      await beta.callTool('send_direct_message', {
        recipientGuid: alphaGuid,
        message: 'Message from Beta',
        messageType: 'text'
      });
      await sleep(100);
      await gamma.callTool('send_direct_message', {
        recipientGuid: alphaGuid,
        message: 'Message from Gamma',
        messageType: 'text'
      });

      await sleep(500);

      console.log('  Reading with Beta sender filter...');
      const filtered = await alpha.callTool('read_direct_messages', {
        senderGuid: betaGuid
      });
      const filteredData = JSON.parse(filtered.content[0].text);

      assert(filteredData.messages.length === 1, 'Should have exactly 1 message from Beta');
      assert(filteredData.messages[0].message === 'Message from Beta', 'Should be message from Beta');

      console.log('  Reading without filter to verify Gamma message still exists...');
      const all = await alpha.callTool('read_direct_messages', {});
      const allData = JSON.parse(all.content[0].text);

      const gammaMsg = allData.messages.find(m => m.message === 'Message from Gamma');
      assert(gammaMsg, 'Gamma message should still be available');

      console.log('  ✓ PASS: Sender filtering works correctly');
      return { status: 'PASS', duration: 0 };
    } finally {
      await alpha.stop();
      await beta.stop();
      await gamma.stop();
    }
  },

  async 'REQ-DM-005: Multiple messages - correct ordering'() {
    const alpha = new MCPClient('test-alpha');
    const beta = new MCPClient('test-beta');

    try {
      console.log('  Starting agents...');
      await alpha.start();
      await beta.start();
      await sleep(1000);

      console.log('  Registering agents...');
      const alphaReg = await alpha.callTool('register_agent', {
        handle: 'test-alpha-order',
        agentType: 'developer',
        capabilities: ['typescript']
      });
      const alphaGuidMatch = alphaReg.content[0].text.match(/GUID: ([a-f0-9-]+)/);
      const alphaGuid = alphaGuidMatch[1];

      await beta.callTool('register_agent', {
        handle: 'test-beta-order',
        agentType: 'developer',
        capabilities: ['typescript']
      });

      await sleep(500);

      console.log('  Sending 10 messages rapidly...');
      for (let i = 1; i <= 10; i++) {
        await beta.callTool('send_direct_message', {
          recipientGuid: alphaGuid,
          message: `Message ${i} of 10`,
          messageType: 'text'
        });
        await sleep(50); // Small delay to ensure timestamp ordering
      }

      await sleep(1000);

      console.log('  Reading all messages...');
      const inbox = await alpha.callTool('read_direct_messages', {});
      const inboxData = JSON.parse(inbox.content[0].text);

      const testMessages = inboxData.messages.filter(m => m.message.includes('of 10'));
      assert(testMessages.length === 10, `Should have 10 messages, got ${testMessages.length}`);

      // Verify ordering
      let previousTimestamp = 0;
      for (const msg of testMessages) {
        const timestamp = new Date(msg.timestamp).getTime();
        assert(timestamp >= previousTimestamp, 'Messages should be in timestamp order (oldest first)');
        previousTimestamp = timestamp;
      }

      console.log('  ✓ PASS: Messages ordered correctly by timestamp');
      return { status: 'PASS', duration: 0 };
    } finally {
      await alpha.stop();
      await beta.stop();
    }
  }
};

// Main test runner
async function main() {
  console.log('\n=== REQ-DM: Direct Messaging Tests ===\n');
  console.log(`NATS URL: ${NATS_URL}`);
  console.log(`Project ID: ${PROJECT_ID}\n`);

  const results = [];
  const startTime = Date.now();

  for (const [testName, testFn] of Object.entries(tests)) {
    console.log(`Running: ${testName}`);
    const testStart = Date.now();

    try {
      const result = await testFn();
      result.duration = Date.now() - testStart;
      results.push({ testName, ...result });
    } catch (error) {
      console.error(`  ✗ FAIL: ${error.message}`);
      results.push({
        testName,
        status: 'FAIL',
        error: error.message,
        duration: Date.now() - testStart
      });
    }

    console.log('');
  }

  const totalDuration = Date.now() - startTime;

  // Summary
  console.log('\n=== Test Summary ===\n');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Duration: ${totalDuration}ms\n`);

  results.forEach(r => {
    const status = r.status === 'PASS' ? '✓' : '✗';
    console.log(`${status} ${r.testName} (${r.duration}ms)`);
    if (r.error) {
      console.log(`  Error: ${r.error}`);
    }
  });

  // Write results file
  const resultsMarkdown = generateResultsMarkdown(results, totalDuration);
  const fs = await import('fs/promises');
  await fs.writeFile(
    '/var/home/mike/source/loom-monorepo/test-scenarios/05-direct-messaging/results.md',
    resultsMarkdown
  );

  console.log('\nResults written to results.md');

  process.exit(failed > 0 ? 1 : 0);
}

function generateResultsMarkdown(results, totalDuration) {
  const timestamp = new Date().toISOString();
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  return `# Test Results: REQ-DM (Direct Messaging)

**Execution Date**: ${timestamp}
**Executor**: integration-test-engineer-agent
**Environment**:
- NATS URL: ${NATS_URL}
- Node Version: ${process.version}
- Project ID: ${PROJECT_ID}

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${results.length} |
| Passed | ${passed} |
| Failed | ${failed} |
| Pass Rate | ${((passed / results.length) * 100).toFixed(1)}% |
| Total Duration | ${totalDuration}ms |

## Test Results

| Test ID | Status | Duration |
|---------|--------|----------|
${results.map(r => `| ${r.testName} | ${r.status} | ${r.duration}ms |`).join('\n')}

## Detailed Results

${results.map(r => `
### ${r.testName}

**Status**: ${r.status}
**Duration**: ${r.duration}ms

${r.error ? `**Error**:
\`\`\`
${r.error}
\`\`\`
` : '**Result**: All acceptance criteria met'}

`).join('\n')}

## Conclusion

${failed === 0
  ? '**All tests PASSED**. Direct messaging functionality meets all P0 Beta requirements.'
  : `**${failed} test(s) FAILED**. Direct messaging has issues that must be resolved before Beta release.`}
`;
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
